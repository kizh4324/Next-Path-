"""FastAPI dependency injection: authenticated principals and RBAC gates."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.profile import StudentProfile
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if credentials is None:
        raise CREDENTIALS_EXCEPTION

    claims = decode_access_token(credentials.credentials)
    if claims is None:
        raise CREDENTIALS_EXCEPTION

    subject = claims.get("sub")
    if not isinstance(subject, str):
        raise CREDENTIALS_EXCEPTION
    try:
        user_id = uuid.UUID(subject)
    except ValueError as exc:
        raise CREDENTIALS_EXCEPTION from exc

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise CREDENTIALS_EXCEPTION
    return user


async def get_current_student_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentProfile:
    """Resolve the caller's student profile, or 404 if onboarding is incomplete."""
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.user_id == current_user.id)
        .options(selectinload(StudentProfile.guardian_contexts))
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No student profile found. Complete onboarding first.",
        )
    return profile


def require_roles(*allowed_roles: str) -> object:
    """Build a dependency asserting the caller holds one of `allowed_roles`."""

    async def _guard(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"This action requires one of the following roles: "
                    f"{', '.join(allowed_roles)}."
                ),
            )
        return current_user

    return Depends(_guard)


async def get_counselor_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role not in ("counselor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Counselor role required.",
        )
    return current_user


async def get_admin_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator role required.",
        )
    return current_user


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentStudent = Annotated[StudentProfile, Depends(get_current_student_profile)]
CounselorUser = Annotated[User, Depends(get_counselor_user)]
AdminUser = Annotated[User, Depends(get_admin_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
