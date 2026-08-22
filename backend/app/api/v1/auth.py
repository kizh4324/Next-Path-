"""Authentication and consent endpoints (FR-20)."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.core.dependencies import CurrentUser, DbSession
from app.modules import auth_service
from app.schemas.auth import (
    ConsentResponse,
    LoginRequest,
    MinorConsentRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    """Create an account and return an access token."""
    return await auth_service.register_user(db, payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    return await auth_service.authenticate_user(db, payload)


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/minor-consent", response_model=ConsentResponse)
async def record_minor_consent(
    payload: MinorConsentRequest, current_user: CurrentUser, db: DbSession
) -> ConsentResponse:
    """Record guardian consent for a minor's profile.

    Must be submitted by the guardian's own account, or recorded by a counselor.
    """
    return await auth_service.record_minor_consent(db, payload, current_user)
