"""Auth DTOs (FR-20, Story 1.4)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import ORMModel, StrictModel
from app.schemas.enums import UserRole

# bcrypt hashes at most 72 bytes; anything longer is silently truncated, so cap it here
# rather than letting a user believe a 100-character password is protecting them.
MAX_PASSWORD_BYTES = 72


class RegisterRequest(StrictModel):
    email: EmailStr = Field(description="Login identifier; unique across all roles")
    password: str = Field(min_length=8, description="Plain password; hashed with bcrypt")
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = Field(default=UserRole.STUDENT)
    phone_number: str | None = Field(default=None, max_length=20)

    @field_validator("password")
    @classmethod
    def _password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError(
                f"Password must be {MAX_PASSWORD_BYTES} bytes or fewer "
                "(bcrypt truncates beyond this)."
            )
        return value


class LoginRequest(StrictModel):
    email: EmailStr
    password: str


class TokenResponse(StrictModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user_id: uuid.UUID
    role: UserRole
    full_name: str


class UserResponse(ORMModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    phone_number: str | None
    is_active: bool
    created_at: datetime


class MinorConsentRequest(StrictModel):
    """Guardian consent for a minor's profile (FR-20).

    `guardian_email` identifies an existing guardian account, or creates the consent
    linkage against one. Consent is never inferred — it is recorded explicitly, with
    the acting guardian's user id stored in `student_profiles.consent_given_by`.
    """

    student_profile_id: uuid.UUID
    guardian_email: EmailStr = Field(description="Guardian's account email")
    guardian_full_name: str = Field(min_length=1, max_length=255)
    guardian_phone: str | None = Field(default=None, max_length=20)
    relationship_to_student: str = Field(
        min_length=1, max_length=100, description="e.g. 'Mother', 'Father', 'Legal Guardian'"
    )
    consent_confirmed: bool = Field(
        description="Must be true. An unconfirmed submission is rejected, not stored as pending."
    )

    @field_validator("consent_confirmed")
    @classmethod
    def _must_confirm(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Guardian consent must be explicitly confirmed.")
        return value


class ConsentResponse(StrictModel):
    student_profile_id: uuid.UUID
    consent_type: str
    consent_given_by: uuid.UUID | None
    consent_recorded_at: datetime
    message: str
