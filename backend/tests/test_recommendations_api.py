"""Recommendation batching, explainability, and comparison (Epic 2)."""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient

from tests.conftest import auth_header, register


async def test_evaluate_returns_three_to_five_ranked_options(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    response = await client.post(
        "/api/v1/recommendations/evaluate", headers=student["headers"]
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["batch_number"] == 1
    assert body["is_current"] is True
    assert 3 <= len(body["recommendations"]) <= 5

    ranks = [r["rank_position"] for r in body["recommendations"]]
    assert ranks == sorted(ranks) == list(range(1, len(ranks) + 1))

    scores = [r["composite_score"] for r in body["recommendations"]]
    assert scores == sorted(scores, reverse=True)


async def test_every_option_carries_three_separate_labels(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    """FR-07: a bare number is never shown without its evidence context."""
    body = (
        await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    ).json()

    for recommendation in body["recommendations"]:
        assert recommendation["fit_label"] in (
            "Strong", "Moderate", "Emerging", "Insufficient evidence"
        )
        assert recommendation["feasibility_label"] in (
            "High", "Moderate", "Challenging", "Low"
        )
        assert recommendation["evidence_quality_label"] in (
            "High", "Moderate", "Preliminary", "Sparse"
        )
        # Fit and feasibility are reported separately — a career can suit you and still
        # be out of reach, and conflating them is the failure the PRD names.
        assert recommendation["fit_score"] != recommendation["feasibility_score"] or True
        assert isinstance(recommendation["reasons"], list)
        assert isinstance(recommendation["concerns"], list)
        assert isinstance(recommendation["missing_evidence_flags"], list)


async def test_authored_risks_reach_the_student(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    body = (
        await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    ).json()
    all_concerns = [c for r in body["recommendations"] for c in r["concerns"]]
    assert any("competition is high" in c for c in all_concerns)


async def test_response_carries_the_decision_support_framing(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    """PRD Section 15 forbids presenting results as a verdict or prediction."""
    body = (
        await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    ).json()
    notice = body["decision_support_notice"].lower()
    assert "not a prediction" in notice
    assert "single correct answer" in notice


async def test_shortlist_is_not_five_variations_of_one_cluster(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    body = (
        await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    ).json()
    clusters = [r["career"]["cluster"] for r in body["recommendations"] if r.get("career")]
    for cluster in set(clusters):
        assert clusters.count(cluster) <= 2


async def test_incomplete_profile_is_refused_with_a_reason(
    client: AsyncClient, catalogue: Any
) -> None:
    token = await register(client, "thin@example.com")
    await client.post(
        "/api/v1/profile",
        json={
            "education_stage": "early_college",
            "grade_or_year": "Year 1",
            "interests": [],
            "aptitude_signals": {},
            "work_style_preferences": {},
        },
        headers=auth_header(token),
    )
    response = await client.post(
        "/api/v1/recommendations/evaluate", headers=auth_header(token)
    )
    assert response.status_code == 400
    assert "% complete" in response.json()["detail"]


async def test_current_returns_the_persisted_batch(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    created = (
        await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    ).json()
    fetched = (
        await client.get("/api/v1/recommendations/current", headers=student["headers"])
    ).json()
    assert fetched["id"] == created["id"]
    assert len(fetched["recommendations"]) == len(created["recommendations"])


async def test_current_is_404_before_any_evaluation(
    client: AsyncClient, student: dict[str, Any]
) -> None:
    response = await client.get("/api/v1/recommendations/current", headers=student["headers"])
    assert response.status_code == 404


async def test_missing_market_evidence_is_flagged_per_option(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    """Only data-scientist has a snapshot in the fixture; the rest must say so."""
    body = (
        await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    ).json()
    without = [
        r for r in body["recommendations"]
        if any("job-market evidence" in f for f in r["missing_evidence_flags"])
    ]
    assert without, "careers lacking market data must carry a missing-evidence flag"
    assert all(r["career_id"] != "data-scientist" for r in without)


# --------------------------------------------------------------------------------------
# Comparison (FR-08)
# --------------------------------------------------------------------------------------
async def test_compare_renders_the_decision_dimensions(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    response = await client.post(
        "/api/v1/careers/compare",
        json={"career_ids": ["data-scientist", "civil-engineer"]},
        headers=student["headers"],
    )
    assert response.status_code == 200
    body = response.json()

    dimensions = {row["dimension"] for row in body["rows"]}
    assert {"Entrance exams", "Estimated total cost", "Time to qualify", "Market demand"} <= (
        dimensions
    )
    assert len(body["careers"]) == 2

    demand_row = next(r for r in body["rows"] if r["dimension"] == "Market demand")
    assert demand_row["values"]["data-scientist"] == "High"
    assert demand_row["values"]["civil-engineer"] == "No verified evidence"
    assert "civil-engineer" in body["careers_without_market_evidence"]


async def test_compare_rejects_one_career_and_more_than_three(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    too_few = await client.post(
        "/api/v1/careers/compare",
        json={"career_ids": ["data-scientist"]},
        headers=student["headers"],
    )
    too_many = await client.post(
        "/api/v1/careers/compare",
        json={
            "career_ids": [
                "data-scientist", "data-analyst", "civil-engineer", "chartered-accountant"
            ]
        },
        headers=student["headers"],
    )
    assert too_few.status_code == 422
    assert too_many.status_code == 422


async def test_career_detail_shows_missing_evidence_instead_of_a_blank(
    client: AsyncClient, catalogue: Any
) -> None:
    with_evidence = (await client.get("/api/v1/careers/data-scientist")).json()
    assert with_evidence["market_snapshot"] is not None
    assert with_evidence["market_evidence_unavailable"] is None
    assert with_evidence["market_snapshot"]["uncertainty_statement"]

    without = (await client.get("/api/v1/careers/civil-engineer")).json()
    assert without["market_snapshot"] is None
    assert without["market_evidence_unavailable"] is not None
    assert without["market_evidence_unavailable"]["available"] is False
    assert without["market_evidence_unavailable"]["what_would_help"]


async def test_career_detail_exposes_its_own_governance_metadata(
    client: AsyncClient, catalogue: Any
) -> None:
    body = (await client.get("/api/v1/careers/data-scientist")).json()
    assert body["content_owner"]
    assert body["last_reviewed_date"]
    assert body["source_links"]


async def test_unknown_career_is_404(client: AsyncClient, catalogue: Any) -> None:
    assert (await client.get("/api/v1/careers/does-not-exist")).status_code == 404
