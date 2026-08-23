"""Grounded Q&A, crisis interception, and the parent summary (Epic 4).

The suite runs with no ANTHROPIC_API_KEY, so the degraded path is exercised by default —
which is the path most deployments will hit first. The grounded path is tested by
substituting the LLM call, keeping the tests hermetic and free.
"""

from __future__ import annotations

from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatInteraction
from app.models.escalation import CounselorEscalation
from app.modules import chatbot_service, parent_summary_service
from app.modules.llm_client import LLMResult
from app.modules.safety_service import build_crisis_response, detect_crisis


@pytest.fixture
def stub_llm(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, str]]:
    """Replace the LLM call with a recorder, so prompts can be asserted on."""
    calls: list[dict[str, str]] = []

    async def fake_generate(
        system_prompt: str, user_content: str, max_tokens: int | None = None
    ) -> LLMResult:
        calls.append({"system": system_prompt, "user": user_content})
        return LLMResult(ok=True, text="A grounded answer.", model="test-model")

    monkeypatch.setattr(
        chatbot_service.llm_client, "generate_message", fake_generate, raising=True
    )
    monkeypatch.setattr(
        parent_summary_service.llm_client, "generate_message", fake_generate, raising=True
    )
    return calls


# --------------------------------------------------------------------------------------
# Crisis interception (Story 4.3) — runs before career logic and before any LLM call
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize(
    "message",
    [
        "I want to kill myself",
        "i dont want to live anymore",
        "thinking about ending it all",
        "I feel suicidal about my board results",
        "my family would be better off without me",
        "There is no point in living if I fail NEET",
        "I have been cutting myself",
    ],
)
def test_crisis_language_is_detected(message: str) -> None:
    assert detect_crisis(message) is True


@pytest.mark.parametrize(
    "message",
    [
        "What is the fee for a B.Tech?",
        "This exam is killing my social life",
        "I am dying to become a doctor",
        "Which career kills the most time?",
        "",
    ],
)
def test_ordinary_language_is_not_flagged(message: str) -> None:
    assert detect_crisis(message) is False


def test_crisis_response_leads_with_helplines_and_carries_no_career_advice() -> None:
    text = build_crisis_response()
    lowered = text.lower()

    assert "14416" in text          # Tele-MANAS
    assert "1800-599-0019" in text  # KIRAN
    assert "112" in text

    # The helplines must be near the top, not buried under paragraphs of sympathy.
    assert text.index("14416") < len(text) // 2

    # No career content at all — that conversation can wait.
    for term in ("entrance exam", "b.tech", "neet", "fees", "₹", "roadmap", "scholarship"):
        assert term not in lowered

    assert "counselor" in lowered


async def test_crisis_message_halts_advice_and_raises_a_ticket(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], db: AsyncSession
) -> None:
    response = await client.post(
        "/api/v1/chat/message",
        json={"question": "I want to kill myself, I failed my exam"},
        headers=student["headers"],
    )
    assert response.status_code == 200
    body = response.json()

    assert body["is_crisis_response"] is True
    assert body["was_escalated"] is True
    assert "14416" in body["answer"]
    # No career context was injected: the pipeline stopped before retrieval.
    assert body["career_ids_injected"] == []
    assert body["citations"] == []

    escalations = (
        (
            await db.execute(
                select(CounselorEscalation).where(
                    CounselorEscalation.trigger_reason == "crisis_safety_flag"
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(escalations) == 1
    assert escalations[0].status == "pending"

    logged = (
        (
            await db.execute(
                select(ChatInteraction).where(ChatInteraction.was_escalated.is_(True))
            )
        )
        .scalars()
        .all()
    )
    assert len(logged) == 1


async def test_crisis_interception_does_not_call_the_llm(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], stub_llm: list[dict[str, str]]
) -> None:
    await client.post(
        "/api/v1/chat/message",
        json={"question": "I want to end my life"},
        headers=student["headers"],
    )
    assert stub_llm == [], "a student in crisis must not wait on a network round-trip"


# --------------------------------------------------------------------------------------
# Grounding (Story 4.2)
# --------------------------------------------------------------------------------------
async def test_answer_is_grounded_in_injected_records_and_audited(
    client: AsyncClient, catalogue: Any, student: dict[str, Any],
    stub_llm: list[dict[str, str]], db: AsyncSession
) -> None:
    response = await client.post(
        "/api/v1/chat/message",
        json={"question": "What does a data scientist actually do?"},
        headers=student["headers"],
    )
    assert response.status_code == 200
    body = response.json()

    assert body["answer"] == "A grounded answer."
    assert "data-scientist" in body["career_ids_injected"]
    assert any(c["career_id"] == "data-scientist" for c in body["citations"])
    assert body["ai_unavailable"] is False

    # The audit row records exactly which records backed the answer.
    interaction = (
        (await db.execute(select(ChatInteraction))).scalars().first()
    )
    assert interaction is not None
    assert "data-scientist" in interaction.career_ids_injected
    assert interaction.was_escalated is False


async def test_system_prompt_enforces_negative_grounding(
    client: AsyncClient, catalogue: Any, student: dict[str, Any],
    stub_llm: list[dict[str, str]]
) -> None:
    await client.post(
        "/api/v1/chat/message",
        json={"question": "Tell me about data scientist salaries"},
        headers=student["headers"],
    )
    system = stub_llm[0]["system"]
    assert "<approved_career_context>" in system
    assert "I don't have verified information" in system
    assert "Never invent a number" in system
    assert "Never predict the student's future" in system


async def test_unmatched_question_says_so_rather_than_guessing(
    client: AsyncClient, catalogue: Any, student: dict[str, Any],
    stub_llm: list[dict[str, str]]
) -> None:
    response = await client.post(
        "/api/v1/chat/message",
        json={"question": "How do I become an astronaut on Mars?"},
        headers=student["headers"],
    )
    body = response.json()

    assert body["career_ids_injected"] == []
    assert "don't have verified information" in body["answer"]
    # Nothing to ground on means no call at all — there is no prompt that would make
    # improvisation safe here.
    assert stub_llm == []


async def test_chat_degrades_honestly_with_no_api_key(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    """No stub, no key: the response must say the assistant is unavailable."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    response = await client.post(
        "/api/v1/chat/message",
        json={"question": "Tell me about being a data scientist"},
        headers=student["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ai_unavailable"] is True
    assert "not configured" in body["answer"] or "could not be reached" in body["answer"]
    assert body["citations"] == []


async def test_context_retrieval_is_capped(
    client: AsyncClient, catalogue: Any, student: dict[str, Any],
    stub_llm: list[dict[str, str]]
) -> None:
    response = await client.post(
        "/api/v1/chat/message",
        json={"question": "compare data engineering analyst accountant civil careers"},
        headers=student["headers"],
    )
    assert len(response.json()["career_ids_injected"]) <= chatbot_service.MAX_CAREERS_INJECTED


# --------------------------------------------------------------------------------------
# Parent summary (Story 4.4)
# --------------------------------------------------------------------------------------
async def test_parent_summary_is_persisted_and_read_back_verbatim(
    client: AsyncClient, catalogue: Any, student: dict[str, Any],
    stub_llm: list[dict[str, str]]
) -> None:
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])

    first = (await client.get("/api/v1/guardian/summary", headers=student["headers"])).json()
    second = (await client.get("/api/v1/guardian/summary", headers=student["headers"])).json()

    assert first["summary_text"] == second["summary_text"]
    assert first["id"] == second["id"]
    # One generation, then reads. No drift between visits.
    assert len(stub_llm) == 1


async def test_parent_summary_includes_costs_and_discussion_points(
    client: AsyncClient, catalogue: Any, student: dict[str, Any],
    stub_llm: list[dict[str, str]]
) -> None:
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    body = (await client.get("/api/v1/guardian/summary", headers=student["headers"])).json()

    assert body["cost_breakdown"]
    for item in body["cost_breakdown"]:
        assert item["estimated_cost_inr_max"] >= item["estimated_cost_inr_min"]
    assert body["discussion_points"]


async def test_parent_summary_falls_back_to_a_template_without_an_api_key(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Every deployment gets a usable guardian summary, key or not — and is told which."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    body = (await client.get("/api/v1/guardian/summary", headers=student["headers"])).json()

    assert body["generated_without_ai"] is True
    assert len(body["summary_text"]) > 200
    assert "₹" in body["summary_text"]
    # The framing survives the fallback — this is the part that must never be lost.
    assert "not a prediction" in body["summary_text"]


async def test_parent_summary_is_404_before_any_evaluation(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    response = await client.get("/api/v1/guardian/summary", headers=student["headers"])
    assert response.status_code == 404
