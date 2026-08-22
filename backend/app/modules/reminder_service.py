"""Scholarship deadline reminders (FR-27, Story 6.1 — P1).

An in-process APScheduler job, not Celery: there is exactly one background task in
scope, and standing up a broker for it would be infrastructure without a requirement
(tech-stack.md §3).

Deadline data is the hard part. The Scholar-Spot source records an annual portal cycle
rather than a dated deadline, so this generates reminders against the milestones a
student actually committed to — `scholarship_application` steps on their live roadmap —
and says plainly that portal dates must be checked at the source. Inventing a date and
reminding a student against it would be worse than not reminding them at all.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.catalog import Scholarship
from app.models.profile import StudentProfile
from app.models.roadmap import Roadmap, RoadmapMilestone

logger = logging.getLogger(__name__)

# Two nudges: one with enough time to gather documents, one final call.
REMINDER_WINDOWS_DAYS = (14, 3)

# How long after a roadmap starts a scholarship milestone is treated as due. Mirrors
# the 90-day bucket the generator places these milestones in.
SCHOLARSHIP_MILESTONE_DUE_DAYS = 90


@dataclass(frozen=True)
class Reminder:
    student_id: str
    milestone_id: str
    milestone_title: str
    days_remaining: int
    message: str


def _due_date(roadmap_created_at: datetime) -> date:
    return (roadmap_created_at + timedelta(days=SCHOLARSHIP_MILESTONE_DUE_DAYS)).date()


def build_reminder(
    student_id: str,
    milestone: RoadmapMilestone,
    due: date,
    today: date,
    document_hint: str,
) -> Reminder | None:
    """Return a reminder if `due` falls in one of the notification windows."""
    days_remaining = (due - today).days
    if days_remaining not in REMINDER_WINDOWS_DAYS:
        return None

    urgency = (
        "This is the last useful reminder — applications close on the portal's own schedule."
        if days_remaining <= 3
        else "Start now: the certificates below usually take two to three weeks to obtain."
    )
    return Reminder(
        student_id=student_id,
        milestone_id=str(milestone.id),
        milestone_title=milestone.title,
        days_remaining=days_remaining,
        message=(
            f"{days_remaining} days left on your scholarship step: {milestone.title}. "
            f"{urgency} {document_hint} "
            "Check the official portal for this year's exact dates — our catalogue "
            "records the annual cycle, not a confirmed deadline."
        ),
    )


async def find_due_reminders(db: AsyncSession, today: date | None = None) -> list[Reminder]:
    """Scan live roadmaps for scholarship steps entering a reminder window."""
    today = today or datetime.now(UTC).date()

    rows = (
        await db.execute(
            select(RoadmapMilestone, Roadmap)
            .join(Roadmap, RoadmapMilestone.roadmap_id == Roadmap.id)
            .where(
                RoadmapMilestone.milestone_type == "scholarship_application",
                RoadmapMilestone.is_completed.is_(False),
                Roadmap.is_current.is_(True),
                Roadmap.status == "active",
            )
        )
    ).all()

    if not rows:
        return []

    documents = (
        await db.execute(select(Scholarship.required_documents).where(Scholarship.is_active.is_(True)).limit(1))
    ).scalar_one_or_none()
    document_hint = (
        f"You will likely need: {', '.join(documents[:4])}."
        if documents
        else "You will likely need an income certificate and a domicile certificate."
    )

    reminders: list[Reminder] = []
    for milestone, roadmap in rows:
        reminder = build_reminder(
            student_id=str(roadmap.student_id),
            milestone=milestone,
            due=_due_date(roadmap.created_at),
            today=today,
            document_hint=document_hint,
        )
        if reminder is not None:
            reminders.append(reminder)
    return reminders


async def run_deadline_scan() -> list[Reminder]:
    """The scheduled job body. Opens its own session — no request context exists here."""
    async with AsyncSessionLocal() as session:
        reminders = await find_due_reminders(session)

    if reminders:
        # Delivery (email/SMS/push) is out of MVP scope — no channel is specified in the
        # PRD and none is provisioned. Logging keeps the schedule honest and observable
        # rather than pretending a notification was sent.
        for reminder in reminders:
            logger.info(
                "Scholarship reminder for student %s (%d days): %s",
                reminder.student_id,
                reminder.days_remaining,
                reminder.milestone_title,
            )
    else:
        logger.debug("Scholarship deadline scan found nothing due.")
    return reminders


async def count_students_with_scholarship_steps(db: AsyncSession) -> int:
    result = await db.execute(
        select(StudentProfile.id)
        .join(Roadmap, Roadmap.student_id == StudentProfile.id)
        .join(RoadmapMilestone, RoadmapMilestone.roadmap_id == Roadmap.id)
        .where(
            RoadmapMilestone.milestone_type == "scholarship_application",
            Roadmap.is_current.is_(True),
        )
        .distinct()
    )
    return len(result.scalars().all())
