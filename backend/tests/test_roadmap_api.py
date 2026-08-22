"""Pathway selection, roadmap generation, skill gaps, and scholarships (Epic 3)."""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient


async def _evaluate_and_select(
    client: AsyncClient, headers: dict[str, str], backup: str | None = "civil-engineer"
) -> dict[str, Any]:
    batch = (await client.post("/api/v1/recommendations/evaluate", headers=headers)).json()
    primary = batch["recommendations"][0]["career_id"]
    if backup == primary:
        backup = next(
            (r["career_id"] for r in batch["recommendations"] if r["career_id"] != primary),
            None,
        )
    payload: dict[str, Any] = {"primary_career_id": primary}
    if backup:
        payload["backup_career_id"] = backup
    response = await client.post(
        "/api/v1/recommendations/select-pathways", json=payload, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_selecting_a_pathway_builds_a_roadmap(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    selection = await _evaluate_and_select(client, student["headers"])
    assert selection["milestones_created"] > 0

    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()
    assert roadmap["status"] == "active"
    assert roadmap["is_current"] is True
    assert roadmap["total_milestones"] == selection["milestones_created"]


async def test_roadmap_spans_all_four_timeframe_buckets(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()

    buckets = {m["timeframe_bucket"] for m in roadmap["milestones"]}
    assert buckets == {"next_7_days", "day_30", "day_90", "day_180"}


async def test_every_milestone_states_a_fallback(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    """FR-10: the plan must degrade gracefully, never dead-end."""
    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()

    for milestone in roadmap["milestones"]:
        assert milestone["fallback_action"].strip()
        assert isinstance(milestone["estimated_cost_inr"], int)


async def test_roadmap_is_free_first(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()
    assert roadmap["free_milestone_count"] == roadmap["total_milestones"]
    assert roadmap["total_estimated_cost_inr"] == 0


async def test_backup_pathway_gets_its_own_milestone(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()
    assert roadmap["backup_career_id"] is not None
    assert any("backup" in m["title"].lower() for m in roadmap["milestones"])


async def test_roadmap_always_ends_with_a_reassessment(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()
    assert any(m["milestone_type"] == "reassessment" for m in roadmap["milestones"])


async def test_backup_must_differ_from_primary(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    response = await client.post(
        "/api/v1/recommendations/select-pathways",
        json={"primary_career_id": "data-scientist", "backup_career_id": "data-scientist"},
        headers=student["headers"],
    )
    assert response.status_code == 422


async def test_cannot_select_a_career_that_was_never_recommended(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    response = await client.post(
        "/api/v1/recommendations/select-pathways",
        json={"primary_career_id": "not-a-real-career"},
        headers=student["headers"],
    )
    assert response.status_code == 400
    assert "not among your current recommendations" in response.json()["detail"]


# --------------------------------------------------------------------------------------
# Milestone completion (Story 3.4)
# --------------------------------------------------------------------------------------
async def test_completing_a_milestone_records_proof(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()
    milestone = roadmap["milestones"][0]

    response = await client.patch(
        f"/api/v1/roadmap/milestones/{milestone['id']}/complete",
        json={
            "completion_evidence_type": "project_artifact",
            "completion_evidence_note_or_url": "https://github.com/example/project",
        },
        headers=student["headers"],
    )
    assert response.status_code == 200
    assert response.json()["is_completed"] is True
    assert response.json()["completed_at"] is not None


async def test_proof_is_required_when_the_evidence_type_claims_one(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()

    response = await client.patch(
        f"/api/v1/roadmap/milestones/{roadmap['milestones'][0]['id']}/complete",
        json={"completion_evidence_type": "project_artifact"},
        headers=student["headers"],
    )
    assert response.status_code == 422


async def test_self_report_needs_no_proof(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()

    response = await client.patch(
        f"/api/v1/roadmap/milestones/{roadmap['milestones'][0]['id']}/complete",
        json={"completion_evidence_type": "self_report"},
        headers=student["headers"],
    )
    assert response.status_code == 200


async def test_completing_a_prerequisite_unlocks_its_dependant(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()

    locked = [m for m in roadmap["milestones"] if m["is_locked"]]
    if not locked:
        return  # This student's plan has no prerequisite chain; nothing to assert.

    blocker_title = locked[0]["blocked_by"][0]
    blocker = next(m for m in roadmap["milestones"] if m["title"] == blocker_title)
    await client.patch(
        f"/api/v1/roadmap/milestones/{blocker['id']}/complete",
        json={"completion_evidence_type": "self_report"},
        headers=student["headers"],
    )

    refreshed = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()
    now = next(m for m in refreshed["milestones"] if m["id"] == locked[0]["id"])
    assert now["is_locked"] is False


async def test_a_student_cannot_complete_someone_elses_milestone(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    from tests.conftest import ONBOARDING_PAYLOAD, auth_header, register

    await _evaluate_and_select(client, student["headers"])
    roadmap = (await client.get("/api/v1/roadmap", headers=student["headers"])).json()

    other = await register(client, "other@example.com")
    await client.post("/api/v1/profile", json=ONBOARDING_PAYLOAD, headers=auth_header(other))

    response = await client.patch(
        f"/api/v1/roadmap/milestones/{roadmap['milestones'][0]['id']}/complete",
        json={"completion_evidence_type": "self_report"},
        headers=auth_header(other),
    )
    assert response.status_code == 404


# --------------------------------------------------------------------------------------
# Skill gaps (Story 3.3)
# --------------------------------------------------------------------------------------
async def test_skill_gaps_are_tiered_and_every_one_has_a_free_route(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    response = await client.get(
        "/api/v1/careers/data-scientist/skill-gaps", headers=student["headers"]
    )
    assert response.status_code == 200
    body = response.json()

    assert body["essential"] and body["useful"]
    for skill in body["essential"] + body["useful"] + body["optional"]:
        assert skill["free_learning_resource_url"].startswith("http")
        assert skill["commercial_disclosure"]
    assert "free route first" in body["free_first_note"]


# --------------------------------------------------------------------------------------
# Scholarships (Story 3.5)
# --------------------------------------------------------------------------------------
async def test_state_filter_still_includes_all_india_schemes(
    client: AsyncClient, catalogue: Any
) -> None:
    body = (await client.get("/api/v1/scholarships?state=Maharashtra")).json()
    states = {s["state"] for s in body["results"]}
    assert "Maharashtra" in states
    assert "All India" in states


async def test_unrepresented_state_returns_only_national_schemes_with_a_coverage_note(
    client: AsyncClient, catalogue: Any
) -> None:
    body = (await client.get("/api/v1/scholarships?state=Kerala")).json()
    assert all(s["state"] == "All India" for s in body["results"])
    assert "not in our data" in body["coverage_note"]


async def test_zero_income_ceiling_means_no_ceiling(
    client: AsyncClient, catalogue: Any
) -> None:
    body = (await client.get("/api/v1/scholarships?max_income_inr=900000")).json()
    ids = {s["id"] for s in body["results"]}
    assert 2 in ids  # ceiling 0 => no limit, so a high income still qualifies
    assert 1 not in ids  # ceiling 250000 => excluded


async def test_every_scholarship_carries_its_governance_metadata(
    client: AsyncClient, catalogue: Any
) -> None:
    body = (await client.get("/api/v1/scholarships")).json()
    assert body["total"] >= 2
    for scholarship in body["results"]:
        assert scholarship["eligibility_summary"]
        assert scholarship["deadline_description"]
        assert scholarship["required_documents"]
        assert scholarship["official_source_url"].startswith("http")
        assert scholarship["last_verified_date"]
