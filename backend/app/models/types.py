"""Portable column types shared by every model.

PostgreSQL 16 is the system of record and the only supported production target. These
variants exist so the unit/API test suite can run against in-memory SQLite without a
live Postgres — the PostgreSQL rendering is always the authoritative one.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import mapped_column
from sqlalchemy.types import JSON, TypeEngine, Uuid

# JSONB on Postgres (indexable with GIN), plain JSON elsewhere.
# JSONB() is untyped in SQLAlchemy's stubs; the resulting TypeEngine is correct.
JSONColumn: TypeEngine[Any] = JSON().with_variant(JSONB(), "postgresql")  # type: ignore[no-untyped-call]

# Native UUID on Postgres, CHAR(32) elsewhere.
UUIDColumn: TypeEngine[Any] = Uuid(as_uuid=True)

TimestampTZ = DateTime(timezone=True)


def created_at_column() -> Any:
    return mapped_column(TimestampTZ, server_default=func.now(), nullable=False)


def updated_at_column() -> Any:
    return mapped_column(
        TimestampTZ,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


__all__ = [
    "JSONColumn",
    "TimestampTZ",
    "UUIDColumn",
    "created_at_column",
    "datetime",
    "updated_at_column",
]
