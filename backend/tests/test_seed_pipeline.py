"""Seed pipeline: O*NET normalization, and the integrity of the built catalogue.

These run against the real committed seed files, so they fail if someone edits a
built catalogue by hand or lets it drift from its sources.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from data.onet_reader import categorize_importance, normalize_importance, riasec_code

REPO_ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = REPO_ROOT / "data" / "seed"
CAREER_FILE = SEED_DIR / "seed_career_clusters.json"
MARKET_FILE = SEED_DIR / "seed_market_snapshots.json"
SCHOLARSHIP_FILE = SEED_DIR / "seed_scholarships.json"

pytestmark = pytest.mark.skipif(
    not CAREER_FILE.exists(), reason="seed files not built in this checkout"
)


@pytest.fixture(scope="module")
def careers() -> list[dict]:
    return json.loads(CAREER_FILE.read_text(encoding="utf-8"))["careers"]


# --------------------------------------------------------------------------------------
# Normalization (database-schema.md §3.2 B)
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize(
    ("raw", "expected"),
    [(1.0, 0.0), (2.0, 25.0), (3.0, 50.0), (3.8, 70.0), (4.0, 75.0), (5.0, 100.0)],
)
def test_importance_normalization(raw: float, expected: float) -> None:
    assert normalize_importance(raw) == pytest.approx(expected)


def test_normalization_clamps_out_of_range_values() -> None:
    assert normalize_importance(0.5) == 0.0
    assert normalize_importance(9.0) == 100.0


@pytest.mark.parametrize(
    ("score", "tier"),
    [(100.0, "essential"), (70.0, "essential"), (69.99, "useful"),
     (50.0, "useful"), (49.99, "optional"), (0.0, "optional")],
)
def test_tier_cutoffs(score: float, tier: str) -> None:
    assert categorize_importance(score) == tier


def test_riasec_code_takes_the_top_three_dimensions() -> None:
    scores = {"R": 2.1, "I": 6.9, "A": 2.6, "S": 1.6, "E": 1.7, "C": 5.4}
    assert riasec_code(scores) == "ICA"


# --------------------------------------------------------------------------------------
# Career catalogue integrity
# --------------------------------------------------------------------------------------
def test_catalogue_covers_every_education_stage(careers: list[dict]) -> None:
    stages = {s for c in careers for s in c["applicable_stages"]}
    assert stages == {"class_8_10", "class_11_12", "early_college"}


def test_catalogue_spans_at_least_ten_clusters(careers: list[dict]) -> None:
    assert len({c["cluster"] for c in careers}) >= 10


def test_every_career_has_a_complete_riasec_vector(careers: list[dict]) -> None:
    for career in careers:
        assert set(career["riasec_scores"]) == set("RIASEC")
        for value in career["riasec_scores"].values():
            assert 1.0 <= value <= 7.0, f"{career['id']} outside the O*NET 1-7 scale"


def test_every_career_carries_governance_metadata(careers: list[dict]) -> None:
    """PRD Section 13.1 — an entry that cannot say where it came from does not ship."""
    for career in careers:
        assert career["content_owner"]
        assert career["last_reviewed_date"]
        assert career["source_links"]
        assert career["review_cycle_months"] > 0


def test_every_career_states_its_risks(careers: list[dict]) -> None:
    """FR-06: the downside travels with the recommendation."""
    for career in careers:
        assert career["risks_and_tradeoffs"], f"{career['id']} lists no risks"


def test_every_entry_route_is_costed_and_locatable(careers: list[dict]) -> None:
    valid_scopes = {"home_district_only", "within_state", "anywhere_in_india", "abroad"}
    for career in careers:
        assert career["india_entry_routes"], f"{career['id']} has no entry route"
        for route in career["india_entry_routes"]:
            assert route["estimated_cost_inr_max"] >= route["estimated_cost_inr_min"] >= 0
            assert route["duration_years"] >= 1
            assert route["availability_scope"] in valid_scopes
            assert route["degree_or_cert_awarded"]


def test_every_career_offers_at_least_one_low_cost_route(careers: list[dict]) -> None:
    """FR-12: a catalogue where every path needs money is not usable by our users."""
    for career in careers:
        affordable = any(
            r["cost_tier"] == "low_cost_only" or r.get("low_cost_alternative_route")
            for r in career["india_entry_routes"]
        )
        assert affordable, f"{career['id']} has no low-cost route or alternative"


def test_every_skill_has_a_free_resource(careers: list[dict]) -> None:
    for career in careers:
        assert career["skills"], f"{career['id']} has no skills"
        for skill in career["skills"]:
            assert skill["free_learning_resource_url"].startswith("https://")
            assert skill["free_learning_resource_name"]
            assert skill["commercial_disclosure"]
            assert skill["category"] in ("essential", "useful", "optional")


def test_skill_tiers_agree_with_their_normalized_scores(careers: list[dict]) -> None:
    for career in careers:
        for skill in career["skills"]:
            assert skill["category"] == categorize_importance(skill["normalized_importance"])


def test_career_ids_are_unique_slugs(careers: list[dict]) -> None:
    ids = [c["id"] for c in careers]
    assert len(ids) == len(set(ids))
    for career_id in ids:
        assert career_id == career_id.lower()
        assert " " not in career_id


def test_soc_substitutions_are_disclosed_not_silent(careers: list[dict]) -> None:
    """Where skills come from a sibling occupation, the entry must say so."""
    for career in careers:
        if "onet_skills_fallback_soc" in career:
            assert career["onet_skills_fallback_note"]
            assert career["onet_skills_fallback_soc"] in career["onet_skills_fallback_note"]


# --------------------------------------------------------------------------------------
# Market snapshots — the honesty fields are the point
# --------------------------------------------------------------------------------------
@pytest.mark.skipif(not MARKET_FILE.exists(), reason="market seed not built")
def test_market_snapshots_disclose_their_sample_limits() -> None:
    payload = json.loads(MARKET_FILE.read_text(encoding="utf-8"))
    assert payload["_meta"]["scope_limitation"]

    for snapshot in payload["snapshots"]:
        assert snapshot["competition_caveat"]
        assert snapshot["uncertainty_statement"]
        # The disclosure rate must appear verbatim, not be softened into a vague hedge.
        stats = snapshot["_build_stats"]
        if stats["postings_with_disclosed_salary"] > 0:
            assert str(stats["postings_with_disclosed_salary"]) in (
                snapshot["uncertainty_statement"].replace(",", "")
                or snapshot["uncertainty_statement"]
            ) or f"{stats['postings_with_disclosed_salary']:,}" in snapshot[
                "uncertainty_statement"
            ]
        assert snapshot["demand_indicator"] in (
            "High", "Moderate", "Emerging", "Stable", "Niche"
        )


@pytest.mark.skipif(not MARKET_FILE.exists(), reason="market seed not built")
def test_market_coverage_is_limited_to_the_careers_actually_sampled() -> None:
    payload = json.loads(MARKET_FILE.read_text(encoding="utf-8"))
    assert set(payload["_meta"]["careers_with_evidence"]) == {"data-scientist", "data-analyst"}


@pytest.mark.skipif(not MARKET_FILE.exists(), reason="market seed not built")
def test_market_snapshots_reference_real_careers(careers: list[dict]) -> None:
    known = {c["id"] for c in careers}
    payload = json.loads(MARKET_FILE.read_text(encoding="utf-8"))
    for snapshot in payload["snapshots"]:
        assert snapshot["career_id"] in known


# --------------------------------------------------------------------------------------
# Scholarships
# --------------------------------------------------------------------------------------
@pytest.mark.skipif(not SCHOLARSHIP_FILE.exists(), reason="scholarship seed not built")
def test_scholarships_carry_governance_and_declare_their_coverage_gap() -> None:
    payload = json.loads(SCHOLARSHIP_FILE.read_text(encoding="utf-8"))
    assert "authoritative source" in payload["_meta"]["coverage_limitation"]

    ids = set()
    for entry in payload["scholarships"]:
        assert entry["id"] not in ids, "duplicate scholarship id"
        ids.add(entry["id"])
        assert entry["official_source_url"].startswith("http")
        assert entry["last_verified_date"]
        assert entry["eligibility_summary"]
        assert entry["deadline_description"]
        assert entry["required_documents"]
        assert entry["income_ceiling_inr"] >= 0
        assert entry["sponsor_type"] in ("Government", "Private", "Institutional")
