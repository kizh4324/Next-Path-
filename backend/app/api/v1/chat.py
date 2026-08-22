"""Grounded chatbot endpoint (FR-16)."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession
from app.models.recommendation import Recommendation
from app.modules import chatbot_service, escalation_service, profile_service
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse

router = APIRouter(prefix="/chat", tags=["Career Q&A"])


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    payload: ChatMessageRequest, current_user: CurrentUser, db: DbSession
) -> ChatMessageResponse:
    """Ask a single-turn question, answered only from verified career records.

    Crisis language is intercepted before any career logic runs: the student gets
    helplines immediately and a counselor ticket is raised automatically (FR-16,
    PRD Section 14).
    """
    profile = await profile_service.get_profile_for_user(db, current_user.id)

    student_career_ids: list[str] = []
    if profile is not None:
        student_career_ids = list(
            (
                await db.execute(
                    select(Recommendation.career_id).where(
                        Recommendation.student_id == profile.id,
                        Recommendation.is_current.is_(True),
                    )
                )
            )
            .scalars()
            .all()
        )

    response, crisis = await chatbot_service.answer_question(
        db, profile, payload, student_career_ids
    )

    if crisis:
        await escalation_service.raise_crisis_escalation(
            db, profile, current_user, payload.question
        )

    return response
