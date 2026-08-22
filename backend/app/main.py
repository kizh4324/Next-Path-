"""FastAPI application factory."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Sequence
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.core.config import settings
from app.core.scheduler import scheduler_enabled, shutdown_scheduler, start_scheduler
from app.modules.llm_client import llm_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

DESCRIPTION = """
A career **decision-support companion** for Indian school and early-college students.

Deliberately not a prediction engine. Recommendations come from a transparent
weighted-sum score whose every component is stored and inspectable, evidence quality is
reported separately from fit, and gaps in what we know are named rather than hidden.

Where verified evidence does not exist — job-market data outside data roles,
scholarships outside the states we hold — the API returns an explicit missing-evidence
state instead of an estimate.
"""


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info(
        "Starting %s (env=%s, llm=%s)",
        settings.app_name,
        settings.environment,
        "enabled" if settings.llm_enabled else "disabled — deterministic fallbacks active",
    )
    if settings.is_production and settings.jwt_secret_key.startswith("dev-only"):
        # Failing to start is the right outcome: a production deployment signing tokens
        # with a published default secret is worse than a deployment that does not run.
        raise RuntimeError(
            "JWT_SECRET_KEY is still the development default. Set a real secret before "
            "running in production."
        )

    # FR-27 (P1): one daily in-process job. Disabled under tests, where a background
    # scan would race the fixtures.
    if scheduler_enabled():
        start_scheduler()

    yield

    shutdown_scheduler()
    await llm_client.aclose()
    logger.info("Shutdown complete.")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        description=DESCRIPTION,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- RFC 7807 problem details (coding-standards.md §1.3) ------------------
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "type": "about:blank",
                "title": _title_for(exc.status_code),
                "status": exc.status_code,
                "detail": str(exc.detail),
                "instance": str(request.url.path),
            },
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "type": "about:blank",
                "title": "Validation Error",
                "status": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "detail": "One or more fields failed validation.",
                "instance": str(request.url.path),
                "errors": _serialize_errors(exc.errors()),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "type": "about:blank",
                "title": "Internal Server Error",
                "status": 500,
                # Never leak the exception text: it can carry table names, file paths,
                # and occasionally student data.
                "detail": "An unexpected error occurred. This has been logged.",
                "instance": str(request.url.path),
            },
        )

    @app.get("/health", tags=["System"])
    async def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "environment": settings.environment,
            "llm_configured": settings.llm_enabled,
        }

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


def _title_for(status_code: int) -> str:
    return {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Unprocessable Entity",
        503: "Service Unavailable",
    }.get(status_code, "Error")


def _serialize_errors(errors: Sequence[Any]) -> list[dict[str, Any]]:
    """Strip non-JSON-serializable values (e.g. ValueError instances) from Pydantic errors."""
    cleaned: list[dict[str, Any]] = []
    for error in errors:
        cleaned.append(
            {
                "field": ".".join(str(p) for p in error.get("loc", ())),
                "message": error.get("msg", ""),
                "type": error.get("type", ""),
            }
        )
    return cleaned


app = create_app()
