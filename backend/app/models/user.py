"""Table 1: users — authentication and RBAC (FR-20)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import UUIDColumn, created_at_column, updated_at_column

if TYPE_CHECKING:
    from app.models.profile import StudentProfile

VALID_ROLES = ("student", "guardian", "counselor", "admin")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('student', 'guardian', 'counselor', 'admin')",
            name="ck_users_role",
        ),
        Index("idx_users_email", "email"),
        Index("idx_users_role", "role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    profile: Mapped[StudentProfile | None] = relationship(
        "StudentProfile",
        back_populates="user",
        foreign_keys="StudentProfile.user_id",
        uselist=False,
        cascade="all, delete-orphan",
    )
