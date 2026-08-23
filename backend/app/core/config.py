"""Application configuration.

Every tunable is sourced from the environment (see `.env.example`). Nothing here
reaches out to the network at import time.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> backend/
BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- App ---
    app_name: str = "Next_Path API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"

    # --- Database ---
    database_url: str = Field(
        default="postgresql+asyncpg://nextpath:nextpath@localhost:5432/nextpath",
        description="SQLAlchemy async DSN. Must use an async driver (asyncpg).",
    )
    db_echo: bool = False

    # --- Auth ---
    jwt_secret_key: str = Field(
        default="dev-only-insecure-secret-change-me",
        description="HMAC signing key for access tokens.",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # --- CORS ---
    cors_origins: str = "http://localhost:5173"

    # --- Anthropic (FR-16, FR-17) ---
    # Intentionally optional. With no key the app still runs end to end: the parent
    # summary falls back to a deterministic template and the chatbot returns an
    # explicit unavailable state rather than fabricating an answer.
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5"
    anthropic_max_tokens: int = 4096
    anthropic_timeout_seconds: float = 30.0

    # --- Google Gemini (alternative to Anthropic) ---
    # A free-tier alternative. When both keys are present, Gemini takes priority.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    gemini_max_tokens: int = 4096
    gemini_timeout_seconds: float = 30.0

    # --- Seed ingestion (Story 1.3) ---
    dataset_root: str = str(REPO_ROOT / "Dataset")
    seed_root: str = str(REPO_ROOT / "data" / "seed")
    seed_last_verified_date: str = "2026-08-20"

    # --- Scoring engine gate (coding-standards.md §1.3) ---
    min_profile_completeness_pct: int = 50

    @field_validator("database_url")
    @classmethod
    def _require_async_driver(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            # A sync DSN silently breaks every `await` in the data layer; fix it here
            # rather than failing at the first query with an opaque greenlet error.
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def dataset_path(self) -> Path:
        return Path(self.dataset_root)

    @property
    def seed_path(self) -> Path:
        return Path(self.seed_root)

    @property
    def llm_enabled(self) -> bool:
        return bool(self.gemini_api_key.strip()) or bool(self.anthropic_api_key.strip())

    @property
    def llm_provider(self) -> str:
        """Which LLM backend is active. Gemini takes priority when both are set."""
        if self.gemini_api_key.strip():
            return "gemini"
        if self.anthropic_api_key.strip():
            return "anthropic"
        return "none"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
