"""Aggregate router for API v1."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    auth,
    careers,
    chat,
    counselor,
    guardian,
    profile,
    recommendations,
    roadmap,
    scholarships,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(careers.router)
api_router.include_router(recommendations.router)
api_router.include_router(roadmap.router)
api_router.include_router(scholarships.router)
api_router.include_router(chat.router)
api_router.include_router(guardian.router)
api_router.include_router(counselor.router)
