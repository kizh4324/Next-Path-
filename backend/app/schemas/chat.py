"""Grounded chatbot DTOs (FR-16)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import ORMModel, StrictModel


class ChatMessageRequest(StrictModel):
    question: str = Field(
        min_length=1,
        max_length=2000,
        description="Single-turn question. No conversation history is retained.",
    )
    career_id: str | None = Field(
        default=None,
        description="Optional focus career; otherwise context is chosen from the query",
    )


class SourceCitation(StrictModel):
    """Which catalogue record backed a claim, so an answer can be checked."""

    career_id: str
    career_title: str
    last_reviewed_date: str


class ChatMessageResponse(StrictModel):
    answer: str
    citations: list[SourceCitation] = Field(default_factory=list)
    career_ids_injected: list[str] = Field(default_factory=list)

    # True when the crisis interceptor fired. The frontend renders a calm support
    # surface instead of a normal chat bubble (UX invariant 8 — never the warning token).
    is_crisis_response: bool = False
    was_escalated: bool = False

    # True when no API key is configured or the provider failed. The UI says so plainly
    # rather than presenting a fallback string as if it were an answer.
    ai_unavailable: bool = False

    disclaimer: str = Field(
        default=(
            "Answers come only from Next_Path's reviewed career records. If something "
            "is not in those records, this assistant will say so rather than guess."
        )
    )
    interaction_id: uuid.UUID | None = None


class ChatInteractionDTO(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID | None
    question_text: str
    career_ids_injected: list[str]
    answer_text: str
    was_escalated: bool
    created_at: datetime
