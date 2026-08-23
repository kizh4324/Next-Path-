"""Skill project submission and portfolio proof endpoints (FR-22)."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.core.dependencies import CurrentStudent, DbSession
from app.modules import catalog_service
from app.schemas.catalog import ProjectSubmissionDTO, ProjectSubmitRequest

router = APIRouter(prefix="/projects", tags=["Project Lab"])


@router.post(
    "/{project_id}/submit",
    response_model=ProjectSubmissionDTO,
    status_code=status.HTTP_201_CREATED,
)
async def submit_project(
    project_id: str,
    payload: ProjectSubmitRequest,
    profile: CurrentStudent,
    db: DbSession,
) -> ProjectSubmissionDTO:
    """Submit proof-of-work repository or live link for a practical project task."""
    return await catalog_service.submit_project(db, profile, project_id, payload)


@router.get("/my-submissions", response_model=list[ProjectSubmissionDTO])
async def list_my_submissions(
    profile: CurrentStudent,
    db: DbSession,
) -> list[ProjectSubmissionDTO]:
    """Retrieve all projects submitted by the authenticated student."""
    return await catalog_service.get_student_project_submissions(db, profile)
