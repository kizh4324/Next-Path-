"""Scholarship deadline reminders (FR-27, Story 6.1)."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.roadmap import Roadmap, RoadmapMilestone
from app.modules.reminder_service import (
    REMINDER_WINDOWS_DAYS,
    SCHOLARSHIP_MILESTONE_DUE_DAYS,
    build_reminder,
    find_due_reminders,
)


def make_milestone(**overrides: Any) -> RoadmapMilestone:
    defaults: dict[str, Any] = {
        "id": uuid.uuid4(),
        "roadmap_id": uuid.uuid4(),
        "timeframe_bucket": "day_90",
        "order_index": 0,
        "title": "Check what financial help you can get",
        "description": "Filter the scholarships list.",
        "milestone_type": "scholarship_application",
        "prerequisites": [],
        "estimated_cost_inr": 0,
        "is_low_cost_or_free": True,
        "completion_evidence_type": "self_report",
        "is_completed": False,
        "fallback_action": "Check scholarships.gov.in directly.",
    }
    defaults.update(overrides)
    return RoadmapMilestone(**defaults)


def test_reminder_fires_at_fourteen_and_three_days() -> None:
    today = date(2026, 8, 1)
    for window in REMINDER_WINDOWS_DAYS:
        reminder = build_reminder(
            "student-1",
            make_milestone(),
            due=today + timedelta(days=window),
            today=today,
            document_hint="You will likely need: Income Certificate.",
        )
        assert reminder is not None
        assert reminder.days_remaining == window


def test_no_reminder_outside_the_windows() -> None:
    today = date(2026, 8, 1)
    for offset in (30, 15, 13, 4, 2, 0, -5):
        assert (
            build_reminder(
                "student-1",
                make_milestone(),
                due=today + timedelta(days=offset),
                today=today,
                document_hint="",
            )
            is None
        )


def test_the_fourteen_day_nudge_is_about_paperwork_lead_time() -> None:
    today = date(2026, 8, 1)
    reminder = build_reminder(
        "student-1",
        make_milestone(),
        due=today + timedelta(days=14),
        today=today,
        document_hint="You will likely need: Income Certificate, Domicile Certificate.",
    )
    assert reminder is not None
    assert "two to three weeks" in reminder.message
    assert "Income Certificate" in reminder.message


def test_every_reminder_says_the_portal_is_authoritative() -> None:
    """Our catalogue records an annual cycle, not a confirmed date — say so."""
    today = date(2026, 8, 1)
    for window in REMINDER_WINDOWS_DAYS:
        reminder = build_reminder(
            "student-1", make_milestone(), today + timedelta(days=window), today, ""
        )
        assert reminder is not None
        assert "official portal" in reminder.message
        assert "not a confirmed deadline" in reminder.message


async def test_scan_finds_a_live_scholarship_step(db: AsyncSession, catalogue: Any) -> None:
    from tests.conftest import seed_profile, seed_user

    user = await seed_user(db, "reminder@example.com")
    profile = await seed_profile(db, user)

    created = datetime.now(UTC) - timedelta(days=SCHOLARSHIP_MILESTONE_DUE_DAYS - 14)
    roadmap = Roadmap(
        student_id=profile.id,
        primary_career_id="data-scientist",
        status="active",
        is_current=True,
        created_at=created,
    )
    db.add(roadmap)
    await db.flush()
    db.add(make_milestone(roadmap_id=roadmap.id))
    await db.commit()

    reminders = await find_due_reminders(db)
    assert len(reminders) == 1
    assert reminders[0].days_remaining == 14


async def test_scan_skips_completed_and_superseded_work(
    db: AsyncSession, catalogue: Any
) -> None:
    from tests.conftest import seed_profile, seed_user

    user = await seed_user(db, "done@example.com")
    profile = await seed_profile(db, user)
    created = datetime.now(UTC) - timedelta(days=SCHOLARSHIP_MILESTONE_DUE_DAYS - 14)

    completed_roadmap = Roadmap(
        student_id=profile.id,
        primary_career_id="data-scientist",
        status="active",
        is_current=True,
        created_at=created,
    )
    superseded_roadmap = Roadmap(
        student_id=profile.id,
        primary_career_id="data-analyst",
        status="reassessing",
        is_current=False,
        created_at=created,
    )
    db.add_all([completed_roadmap, superseded_roadmap])
    await db.flush()
    db.add(make_milestone(roadmap_id=completed_roadmap.id, is_completed=True))
    db.add(make_milestone(roadmap_id=superseded_roadmap.id))
    await db.commit()

    assert await find_due_reminders(db) == []


async def test_scan_ignores_non_scholarship_milestones(
    db: AsyncSession, catalogue: Any
) -> None:
    from tests.conftest import seed_profile, seed_user

    user = await seed_user(db, "other@example.com")
    profile = await seed_profile(db, user)
    roadmap = Roadmap(
        student_id=profile.id,
        primary_career_id="data-scientist",
        status="active",
        is_current=True,
        created_at=datetime.now(UTC) - timedelta(days=SCHOLARSHIP_MILESTONE_DUE_DAYS - 14),
    )
    db.add(roadmap)
    await db.flush()
    db.add(make_milestone(roadmap_id=roadmap.id, milestone_type="exam_prep"))
    await db.commit()

    assert await find_due_reminders(db) == []


async def test_scan_is_quiet_when_nothing_is_due(db: AsyncSession) -> None:
    assert await find_due_reminders(db) == []
    assert (await db.execute(select(Roadmap))).scalars().all() == []
