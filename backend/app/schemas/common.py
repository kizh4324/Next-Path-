"""Shared base classes and response envelopes."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    """Read model hydrated straight from a SQLAlchemy row."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")


class StrictModel(BaseModel):
    """Write model. `extra="forbid"` so a typo'd field is a 422, not a silent no-op."""

    model_config = ConfigDict(extra="forbid")


class ProblemDetail(BaseModel):
    """RFC 7807 problem details (coding-standards.md §1.3)."""

    model_config = ConfigDict(extra="forbid")

    type: str = Field(default="about:blank", description="URI identifying the problem type")
    title: str = Field(description="Short human-readable summary")
    status: int = Field(description="HTTP status code")
    detail: str = Field(description="Human-readable explanation specific to this occurrence")
    instance: str | None = Field(default=None, description="URI of the specific occurrence")


class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str


class EvidenceUnavailable(BaseModel):
    """Explicit missing-evidence state (PRD Section 13.2, FR-14).

    Returned instead of a fabricated estimate when no verified source data exists for
    a career. The UI renders this rather than an empty section, so absence of evidence
    is visible rather than invisible.
    """

    model_config = ConfigDict(extra="forbid")

    available: bool = Field(default=False)
    reason: str = Field(
        description="Why no evidence exists, in language shown directly to the student"
    )
    what_would_help: str = Field(
        description="What source would resolve this gap, so the limitation is actionable"
    )


def problem(status_code: int, title: str, detail: str) -> dict[str, Any]:
    return ProblemDetail(
        title=title, status=status_code, detail=detail
    ).model_dump(exclude_none=True)
