"""Counselor escalation, reassessment history, and right-to-erasure (Epic 5)."""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatInteraction
from app.models.escalation import CounselorEscalation
from app.models.profile import StudentProfile
from app.models.recommendation import RecommendationBatch
from app.models.roadmap import Roadmap
from app.models.user import User


# --------------------------------------------------------------------------------------
# Escalation and triage (Stories 5.1, 5.2)
# --------------------------------------------------------------------------------------
async def test_student_can_request_a_counselor_and_the_profile_is_frozen(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])

    response = await client.post(
        "/api/v1/escalations/trigger",
        json={
            "trigger_reason": "student_requested",
            "student_note": "My parents and I disagree about engineering.",
        },
        headers=student["headers"],
    )
    assert response.status_code == 201
    body = response.json()

    assert body["status"] == "pending"
    snapshot = body["student_summary_snapshot"]
    assert snapshot["education_stage"] == "early_college"
    assert snapshot["student_note"] == "My parents and I disagree about engineering."
    # The recommendations the student actually saw are frozen into the ticket.
    assert snapshot["recommendations"]
    assert snapshot["captured_at"]


async def test_queue_puts_crisis_flags_first(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], counselor: dict[str, Any]
) -> None:
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    await client.post(
        "/api/v1/escalations/trigger",
        json={"trigger_reason": "student_requested"},
        headers=student["headers"],
    )
    await client.post(
        "/api/v1/chat/message",
        json={"question": "I want to kill myself"},
        headers=student["headers"],
    )

    queue = (await client.get("/api/v1/counselor/queue", headers=counselor["headers"])).json()
    assert queue["crisis_count"] == 1
    assert queue["results"][0]["trigger_reason"] == "crisis_safety_flag"
    assert queue["results"][0]["urgency_rank"] == 0


async def test_counselor_can_record_notes_and_resolve(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], counselor: dict[str, Any]
) -> None:
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    escalation = (
        await client.post(
            "/api/v1/escalations/trigger",
            json={"trigger_reason": "student_requested"},
            headers=student["headers"],
        )
    ).json()

    response = await client.post(
        f"/api/v1/counselor/review/{escalation['id']}",
        json={"status": "resolved", "counselor_notes": "Spoke with the family."},
        headers=counselor["headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    assert response.json()["resolved_at"] is not None


async def test_an_override_without_a_rationale_is_refused(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], counselor: dict[str, Any]
) -> None:
    """FR-15: a human decision that changes what a student was told must be accountable."""
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    escalation = (
        await client.post(
            "/api/v1/escalations/trigger",
            json={"trigger_reason": "student_requested"},
            headers=student["headers"],
        )
    ).json()

    refused = await client.post(
        f"/api/v1/counselor/review/{escalation['id']}",
        json={
            "status": "overridden",
            "counselor_override_decision": "Recommend commerce stream instead.",
        },
        headers=counselor["headers"],
    )
    assert refused.status_code == 422
    assert "rationale is required" in refused.json()["detail"]

    accepted = await client.post(
        f"/api/v1/counselor/review/{escalation['id']}",
        json={
            "status": "overridden",
            "counselor_override_decision": "Recommend commerce stream instead.",
            "counselor_override_rationale": (
                "Family finances rule out a 4-year residential programme; the student "
                "confirmed a preference for an earlier earning start."
            ),
        },
        headers=counselor["headers"],
    )
    assert accepted.status_code == 200
    assert accepted.json()["counselor_override_rationale"]


async def test_severe_constraint_conflict_escalates_automatically(
    client: AsyncClient, catalogue: Any, db: AsyncSession
) -> None:
    """A student whose every option is unreachable needs a human, not another score."""
    from tests.conftest import auth_header, register

    token = await register(client, "constrained@example.com")
    await client.post(
        "/api/v1/profile",
        json={
            "education_stage": "class_11_12",
            "grade_or_year": "Class 12",
            "current_stream": "Arts",
            "interests": [{"label": "helping people", "riasec": "S", "strength": 5}],
            "aptitude_signals": {"language": 4},
            "work_style_preferences": {"setting": "outdoor"},
            "budget_tier": "low_cost_only",
            "relocation_willingness": "home_district_only",
            "academic_records_available": False,
        },
        headers=auth_header(token),
    )
    profile = (
        await db.execute(select(StudentProfile).order_by(StudentProfile.created_at.desc()))
    ).scalars().first()
    assert profile is not None
    profile.consent_type = "guardian_consent_minor"

    guardian = await register(client, "cguardian@example.com", role="guardian")
    await client.post(
        "/api/v1/auth/minor-consent",
        json={
            "student_profile_id": str(profile.id),
            "guardian_email": "cguardian@example.com",
            "guardian_full_name": "Guardian",
            "relationship_to_student": "Father",
            "consent_confirmed": True,
        },
        headers=auth_header(guardian),
    )

    await client.post("/api/v1/recommendations/evaluate", headers=auth_header(token))

    escalations = (
        (await db.execute(select(CounselorEscalation))).scalars().all()
    )
    assert escalations, "an unreachable-for-everything profile should reach a human"
    assert any(
        e.trigger_reason
        in ("severe_constraint_conflict", "low_evidence_profile", "high_stakes_choice")
        for e in escalations
    )


# --------------------------------------------------------------------------------------
# Reassessment (Story 5.3)
# --------------------------------------------------------------------------------------
async def test_reassessment_supersedes_without_destroying_history(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], db: AsyncSession
) -> None:
    first = (
        await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    ).json()
    await client.post(
        "/api/v1/recommendations/select-pathways",
        json={"primary_career_id": first["recommendations"][0]["career_id"]},
        headers=student["headers"],
    )

    response = await client.post(
        "/api/v1/recommendations/reassess",
        json={"reason": "My marks improved and I am now open to relocating."},
        headers=student["headers"],
    )
    assert response.status_code == 200
    body = response.json()

    assert body["new_batch_number"] == 2
    assert first["id"] in body["superseded_batch_ids"]
    assert body["superseded_roadmap_ids"]
    assert body["history_preserved"] is True

    batches = (await db.execute(select(RecommendationBatch))).scalars().all()
    assert len(batches) == 2
    old = next(b for b in batches if b.batch_number == 1)
    new = next(b for b in batches if b.batch_number == 2)
    assert old.is_current is False and old.superseded_at is not None
    assert new.is_current is True and new.superseded_at is None

    # The old roadmap and its milestones survive intact.
    roadmaps = (await db.execute(select(Roadmap))).scalars().all()
    assert len(roadmaps) == 1
    assert roadmaps[0].is_current is False
    assert roadmaps[0].status == "reassessing"


async def test_history_endpoint_returns_every_cycle_newest_first(
    client: AsyncClient, catalogue: Any, student: dict[str, Any]
) -> None:
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    await client.post(
        "/api/v1/recommendations/reassess", json={}, headers=student["headers"]
    )

    history = (
        await client.get("/api/v1/recommendations/history", headers=student["headers"])
    ).json()
    assert [b["batch_number"] for b in history] == [2, 1]
    assert history[0]["is_current"] is True
    assert history[1]["is_current"] is False


# --------------------------------------------------------------------------------------
# Right to erasure with the safety-audit exception (Story 5.4)
# --------------------------------------------------------------------------------------
async def test_erasure_deletes_personal_data_but_retains_crisis_records_anonymized(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], db: AsyncSession
) -> None:
    await client.post("/api/v1/recommendations/evaluate", headers=student["headers"])
    await client.post(
        "/api/v1/recommendations/select-pathways",
        json={"primary_career_id": "data-scientist"},
        headers=student["headers"],
    )
    # One ordinary chat and one crisis chat — they must be treated differently.
    await client.post(
        "/api/v1/chat/message",
        json={"question": "What does a data scientist do?"},
        headers=student["headers"],
    )
    await client.post(
        "/api/v1/chat/message",
        json={"question": "I want to kill myself"},
        headers=student["headers"],
    )

    response = await client.request(
        "DELETE",
        "/api/v1/account",
        json={"confirm_understanding": True},
        headers=student["headers"],
    )
    assert response.status_code == 200
    receipt = response.json()

    assert receipt["deleted_profile"] is True
    assert receipt["deleted_roadmaps"] == 1
    assert receipt["deleted_recommendation_batches"] == 1
    assert receipt["deleted_chat_interactions"] == 1
    assert receipt["anonymized_chat_interactions"] == 1
    assert receipt["anonymized_escalations"] == 1
    assert "no longer be linked back to you" in receipt["retention_note"]

    # Personal data is gone.
    assert (await db.execute(select(StudentProfile))).scalars().all() == []
    assert (await db.execute(select(Roadmap))).scalars().all() == []
    assert (await db.execute(select(RecommendationBatch))).scalars().all() == []

    # The safety trail survives, with the identity removed.
    crisis = (await db.execute(select(CounselorEscalation))).scalars().all()
    assert len(crisis) == 1
    assert crisis[0].trigger_reason == "crisis_safety_flag"
    assert crisis[0].student_id is None
    snapshot = crisis[0].student_summary_snapshot
    assert snapshot["anonymized"] is True
    assert "full_name" not in snapshot
    assert "email" not in snapshot
    assert snapshot["display_name"] == "[Anonymized Profile / Closed Account]"
    # The decision context a safety review needs is still there.
    assert "education_stage" in snapshot

    chats = (await db.execute(select(ChatInteraction))).scalars().all()
    assert len(chats) == 1
    assert chats[0].was_escalated is True
    assert chats[0].student_id is None


async def test_erasure_requires_explicit_confirmation(
    client: AsyncClient, student: dict[str, Any]
) -> None:
    response = await client.request(
        "DELETE",
        "/api/v1/account",
        json={"confirm_understanding": False},
        headers=student["headers"],
    )
    assert response.status_code == 422


async def test_erased_account_cannot_log_back_in(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], db: AsyncSession
) -> None:
    await client.request(
        "DELETE",
        "/api/v1/account",
        json={"confirm_understanding": True},
        headers=student["headers"],
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "test-password-123"},
    )
    assert response.status_code == 401

    user = (
        await db.execute(select(User).where(User.full_name.like("%Anonymized%")))
    ).scalars().first()
    assert user is not None
    assert user.is_active is False
    assert "@invalid.local" in user.email


async def test_counselor_portal_renders_an_anonymized_ticket_without_crashing(
    client: AsyncClient, catalogue: Any, student: dict[str, Any], counselor: dict[str, Any]
) -> None:
    """Story 5.2: a closed account must not break the queue for the counselor."""
    await client.post(
        "/api/v1/chat/message",
        json={"question": "I want to end my life"},
        headers=student["headers"],
    )
    await client.request(
        "DELETE",
        "/api/v1/account",
        json={"confirm_understanding": True},
        headers=student["headers"],
    )

    queue = (await client.get("/api/v1/counselor/queue", headers=counselor["headers"])).json()
    assert queue["total"] == 1
    ticket = queue["results"][0]
    assert ticket["student_id"] is None
    assert ticket["is_anonymized"] is True
    assert ticket["student_summary_snapshot"]["display_name"] == (
        "[Anonymized Profile / Closed Account]"
    )
