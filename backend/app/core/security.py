"""Password hashing and JWT encode/decode.

No database access here — this module stays pure so it can be unit-tested without a
running Postgres.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    # bcrypt silently truncates at 72 bytes; reject rather than hash a prefix and let a
    # user believe a longer password is protecting them.
    if len(plain_password.encode("utf-8")) > 72:
        raise ValueError("Password must be 72 bytes or fewer.")
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if len(plain_password.encode("utf-8")) > 72:
        return False
    result: bool = pwd_context.verify(plain_password, hashed_password)
    return result


def create_access_token(
    subject: UUID | str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Mint a stateless access token carrying the user id and role."""
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(UTC),
        "type": "access",
    }
    token: str = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Return the token claims, or None if the token is invalid or expired."""
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        return None
    if claims.get("type") != "access":
        return None
    return claims
