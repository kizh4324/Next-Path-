"""Table 13: chat_interactions — grounding audit log (FR-16).

Safety retention exception (PRD Section 14): rows with `was_escalated = TRUE` survive
account erasure with `student_id` set to NULL, preserving the incident trail without
retaining the identity behind it. Hence `ON DELETE SET NULL` rather than CASCADE.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.types import JSONColumn, UUIDColumn, created_at_column


class ChatInteraction(Base):
    __tablename__ = "chat_interactions"
    __table_args__ = (
        Index("idx_chat_interactions_student", "student_id"),
        Index("idx_chat_interactions_created", "created_at"),
        Index("idx_chat_interactions_escalated", "was_escalated"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDColumn,
        ForeignKey("student_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    # Exactly which career_library slugs were injected into the system prompt. This is
    # what makes an answer auditable after the fact.
    career_ids_injected: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    was_escalated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = created_at_column()
