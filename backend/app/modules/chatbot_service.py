"""Grounded career Q&A (FR-16, Stories 4.2 and 4.3).

Order of operations matters and is enforced here:

  1. Crisis interception — before any career logic, before any network call.
  2. Retrieval — a plain SQL lookup against `career_library`, injected as text.
  3. One stateless LLM call with strict negative grounding.
  4. Audit — every interaction is written to `chat_interactions` with the exact career
     slugs that were injected, so any answer can be reconstructed after the fact.

"Retrieval" here is a database lookup by keyword, not a vector search. That is a
deliberate architectural choice (tech-stack.md §4): at this catalogue size, semantic
search would add a dependency without adding an answer.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import CareerLibrary
from app.models.chat import ChatInteraction
from app.models.profile import StudentProfile
from app.modules.llm_client import llm_client
from app.modules.safety_service import build_crisis_response, detect_crisis
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse, SourceCitation

logger = logging.getLogger(__name__)

MAX_CAREERS_INJECTED = 4
MAX_SKILLS_PER_CAREER = 8

SYSTEM_PROMPT = """You are the Next_Path career assistant, helping Indian school and \
early-college students understand career options.

You may ONLY use facts from <approved_career_context> below. That context is the \
entirety of what you know.

Rules, in priority order:
1. If the answer is not in the approved context, say so plainly: "I don't have verified \
information about that in my career records." Then suggest they ask a counselor. Never \
fill a gap with general knowledge, and never guess.
2. Never invent a number. Fees, salaries, cut-offs, dates, and seat counts must appear \
verbatim in the context or not at all.
3. Never predict the student's future, tell them they "will" succeed or fail, or name \
one career as the single right answer. Present options and trade-offs.
4. Where the context records a risk or trade-off, include it. A student asking about a \
career deserves the downside in the same answer as the upside.
5. If asked about a career that is not in the context, say it is not in your records \
rather than describing it from memory.
6. Write plainly for a 14-to-20 year old. Short sentences. No jargon without explaining \
it. Use ₹ and Indian number formats (lakh, crore) where the context does.
7. Keep answers under 200 words unless the question genuinely needs more.
8. Never ask for or repeat personal identifying details.

<approved_career_context>
{context}
</approved_career_context>"""

NO_CONTEXT_ANSWER = (
    "I don't have verified information about that in my career records. Our catalogue "
    "covers a curated set of careers, so this may simply be outside it. A counselor can "
    "help with questions our records do not cover — you can request one from your "
    "dashboard."
)

# Words too generic to retrieve on; matching them returns the whole catalogue.
STOPWORDS = frozenset(
    """a an and are as at be but by can career careers do does for from get good have
    how i if in into is it me my of on or should so than that the their them there
    these they this to want was what when where which who why will with would you your
    about after all also am any because been before being between both did doing down
    during each few further had has having here him his more most no nor not now only
    other our out over own same some such then those through too under until up very
    we were will""".split()
)


def _keywords(text: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z+#.-]{2,}", text.lower())
    seen: list[str] = []
    for token in tokens:
        if token not in STOPWORDS and token not in seen:
            seen.append(token)
    return seen


async def retrieve_context(
    db: AsyncSession,
    question: str,
    focus_career_id: str | None = None,
    student_career_ids: list[str] | None = None,
) -> list[CareerLibrary]:
    """Pick the career records to inject. Plain SQL matching, no vectors."""
    selected: list[CareerLibrary] = []
    seen: set[str] = set()

    async def add(careers: list[CareerLibrary]) -> None:
        for career in careers:
            if career.id not in seen and len(selected) < MAX_CAREERS_INJECTED:
                seen.add(career.id)
                selected.append(career)

    def base_query() -> Any:
        return select(CareerLibrary).options(selectinload(CareerLibrary.skills))

    # 1. An explicitly named career always goes in first.
    if focus_career_id:
        result = await db.execute(base_query().where(CareerLibrary.id == focus_career_id))
        await add(list(result.scalars().all()))

    # 2. Keyword match on title and cluster.
    keywords = _keywords(question)
    if keywords and len(selected) < MAX_CAREERS_INJECTED:
        conditions = []
        for keyword in keywords[:8]:
            pattern = f"%{keyword}%"
            conditions.extend(
                [
                    CareerLibrary.title.ilike(pattern),
                    CareerLibrary.cluster.ilike(pattern),
                    CareerLibrary.id.ilike(pattern),
                ]
            )
        result = await db.execute(base_query().where(or_(*conditions)).limit(MAX_CAREERS_INJECTED))
        await add(list(result.scalars().all()))

    # 3. Fall back to the student's own recommendations — usually what they mean by
    #    "this course" or "it" when the question names nothing explicitly.
    if len(selected) < MAX_CAREERS_INJECTED and student_career_ids:
        result = await db.execute(
            base_query().where(CareerLibrary.id.in_(student_career_ids))
        )
        await add(list(result.scalars().all()))

    return selected


async def build_context_block(db: AsyncSession, careers: list[CareerLibrary]) -> str:
    """Serialize career records along with syllabi, projects, and trajectories as compact JSON for the prompt."""
    from app.models.catalog import CareerTopicSyllabus, CareerTrajectory, SkillProjectIdea

    payload: list[dict[str, Any]] = []
    for career in careers:
        skills = sorted(
            career.skills,
            key=lambda s: ({"essential": 0, "useful": 1, "optional": 2}.get(s.category, 9),
                           s.skill_name),
        )[:MAX_SKILLS_PER_CAREER]

        # Fetch syllabi, projects, and trajectories for this career
        syllabi = (
            await db.execute(
                select(CareerTopicSyllabus)
                .where(CareerTopicSyllabus.career_id == career.id)
                .order_by(CareerTopicSyllabus.phase_number)
            )
        ).scalars().all()

        projects = (
            await db.execute(
                select(SkillProjectIdea)
                .where(SkillProjectIdea.career_id == career.id)
            )
        ).scalars().all()

        trajectories = (
            await db.execute(
                select(CareerTrajectory)
                .where(CareerTrajectory.source_career_id == career.id)
            )
        ).scalars().all()

        payload.append(
            {
                "career_id": career.id,
                "title": career.title,
                "cluster": career.cluster,
                "what_it_is": career.description,
                "what_the_work_is_actually_like": career.work_reality_summary,
                "school_subjects_required": career.prerequisites,
                "india_entry_routes": career.india_entry_routes,
                "risks_and_tradeoffs": career.risks_and_tradeoffs,
                "regional_notes": career.regional_caveats,
                "skills": [
                    {"name": s.skill_name, "importance": s.category, "free_resource":
                     s.free_learning_resource_name}
                    for s in skills
                ],
                "curriculum_syllabus_phases": [
                    {
                        "phase": s.phase_title,
                        "topic": s.topic_title,
                        "description": s.description,
                        "free_resource": s.free_resource_name,
                        "key_concepts": s.key_concepts,
                    }
                    for s in syllabi
                ],
                "portfolio_project_ideas": [
                    {
                        "id": p.id,
                        "title": p.title,
                        "difficulty": p.difficulty,
                        "summary": p.summary,
                        "requirements": p.requirements,
                        "constraints": p.constraints,
                    }
                    for p in projects
                ],
                "career_progression_trajectories": [
                    {
                        "target_career": t.target_career_title,
                        "type": t.trajectory_type,
                        "salary_delta": t.expected_salary_delta_inr,
                        "delta_skills_required": t.required_delta_skills,
                    }
                    for t in trajectories
                ],
                "last_reviewed": career.last_reviewed_date.isoformat(),
            }
        )
    return json.dumps(payload, ensure_ascii=False, indent=1)


async def answer_question(
    db: AsyncSession,
    profile: StudentProfile | None,
    payload: ChatMessageRequest,
    student_career_ids: list[str] | None = None,
) -> tuple[ChatMessageResponse, bool]:
    """Answer one question. Returns (response, crisis_detected).

    The caller is responsible for raising a counselor escalation when the second value
    is True — keeping that out of here avoids a circular import with escalation_service.
    """
    question = payload.question.strip()
    student_id = profile.id if profile is not None else None

    # --- 1. Crisis interception, before anything else -------------------------
    if detect_crisis(question):
        answer = build_crisis_response()
        db.add(
            ChatInteraction(
                student_id=student_id,
                question_text=question,
                career_ids_injected=[],
                answer_text=answer,
                was_escalated=True,
            )
        )
        await db.commit()
        logger.warning("Crisis language intercepted for student %s.", student_id)
        return (
            ChatMessageResponse(
                answer=answer,
                citations=[],
                career_ids_injected=[],
                is_crisis_response=True,
                was_escalated=True,
                disclaimer=(
                    "This is an automated safety response. Please contact one of the "
                    "helplines above — they are free and staffed around the clock."
                ),
            ),
            True,
        )

    # --- 2. Retrieve grounding ------------------------------------------------
    careers = await retrieve_context(db, question, payload.career_id, student_career_ids)
    injected_ids = [c.id for c in careers]
    citations = [
        SourceCitation(
            career_id=c.id,
            career_title=c.title,
            last_reviewed_date=c.last_reviewed_date.isoformat(),
        )
        for c in careers
    ]

    if not careers:
        # Nothing matched, so there is nothing to ground an answer in. Say so rather
        # than calling the model and inviting it to improvise.
        interaction = ChatInteraction(
            student_id=student_id,
            question_text=question,
            career_ids_injected=[],
            answer_text=NO_CONTEXT_ANSWER,
            was_escalated=False,
        )
        db.add(interaction)
        await db.commit()
        await db.refresh(interaction)
        return (
            ChatMessageResponse(
                answer=NO_CONTEXT_ANSWER,
                citations=[],
                career_ids_injected=[],
                interaction_id=interaction.id,
            ),
            False,
        )

    # --- 3. One stateless, grounded call --------------------------------------
    context_block = await build_context_block(db, careers)
    result = await llm_client.generate_message(
        system_prompt=SYSTEM_PROMPT.format(context=context_block),
        user_content=question,
    )

    interaction = ChatInteraction(
        student_id=student_id,
        question_text=question,
        career_ids_injected=injected_ids,
        answer_text=result.text,
        was_escalated=False,
    )
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)

    return (
        ChatMessageResponse(
            answer=result.text,
            citations=citations if result.ok else [],
            career_ids_injected=injected_ids,
            ai_unavailable=not result.ok,
            interaction_id=interaction.id,
        ),
        False,
    )
