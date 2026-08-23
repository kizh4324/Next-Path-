"""Integration tests for Syllabi, Project Lab, and Career Trajectory APIs (Epic 7)."""

from __future__ import annotations

from typing import Any
import pytest
from httpx import AsyncClient


async def test_get_career_syllabus_returns_phases_and_resources(
    client: AsyncClient, catalogue: Any
) -> None:
    response = await client.get("/api/v1/careers/data-analyst/syllabus")
    assert response.status_code == 200
    data = response.json()
    assert data["career_id"] == "data-analyst"
    assert data["total_estimated_hours"] > 0
    assert len(data["phases"]) >= 3

    first_phase = data["phases"][0]
    assert first_phase["phase_number"] == 1
    assert len(first_phase["topics"]) > 0
    first_topic = first_phase["topics"][0]
    assert first_topic["topic_title"]
    assert first_topic["description"]
    assert first_topic["free_resource_url"].startswith("http")


async def test_get_career_projects_and_difficulty_filtering(
    client: AsyncClient, catalogue: Any
) -> None:
    # All projects
    response = await client.get("/api/v1/careers/data-analyst/projects")
    assert response.status_code == 200
    data = response.json()
    assert len(data["projects"]) >= 3
    assert any(p["difficulty"] == "beginner" for p in data["projects"])
    assert any(p["difficulty"] == "intermediate" for p in data["projects"])
    assert any(p["difficulty"] == "advanced" for p in data["projects"])

    # Filtered by difficulty
    filtered = await client.get("/api/v1/careers/data-analyst/projects?difficulty=beginner")
    assert filtered.status_code == 200
    filtered_data = filtered.json()
    assert all(p["difficulty"] == "beginner" for p in filtered_data["projects"])


async def test_get_career_trajectory(
    client: AsyncClient, catalogue: Any
) -> None:
    response = await client.get("/api/v1/careers/data-analyst/trajectory")
    assert response.status_code == 200
    data = response.json()
    assert data["source_career_id"] == "data-analyst"
    assert len(data["trajectories"]) >= 2
    first_traj = data["trajectories"][0]
    assert first_traj["target_career_title"]
    assert first_traj["trajectory_type"] in ["vertical_advancement", "lateral_transition", "specialization"]
    assert first_traj["transferable_skills_pct"] > 0
    assert len(first_traj["required_delta_skills"]) > 0


async def test_submit_project_proof_and_retrieve_my_submissions(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    # 1. Submit proof for a project
    sub_payload = {
        "repository_or_live_url": "https://github.com/test-student/data-analysis-eda",
        "reflection_notes": "Implemented exploratory data analysis on Indian census dataset.",
    }
    sub_resp = await client.post(
        "/api/v1/projects/da-railway-census-eda/submit",
        json=sub_payload,
        headers=student["headers"],
    )
    assert sub_resp.status_code == 201
    sub_data = sub_resp.json()
    assert sub_data["project_id"] == "da-railway-census-eda"
    assert sub_data["repository_or_live_url"] == sub_payload["repository_or_live_url"]
    assert sub_data["status"] == "completed"

    # 2. Query student submissions
    my_subs_resp = await client.get(
        "/api/v1/projects/my-submissions",
        headers=student["headers"],
    )
    assert my_subs_resp.status_code == 200
    my_subs = my_subs_resp.json()
    assert len(my_subs) >= 1
    assert any(s["project_id"] == "da-railway-census-eda" for s in my_subs)


async def test_invalid_career_or_project_404(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    # Invalid career syllabus
    resp_syllabus = await client.get("/api/v1/careers/non-existent-career/syllabus")
    assert resp_syllabus.status_code == 404

    # Invalid project submission
    resp_sub = await client.post(
        "/api/v1/projects/non-existent-project/submit",
        json={"repository_or_live_url": "https://github.com/demo/repo"},
        headers=student["headers"],
    )
    assert resp_sub.status_code == 404
