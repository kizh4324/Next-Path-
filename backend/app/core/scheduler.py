"""In-process APScheduler wiring (FR-27, Story 6.1 — P1).

One daily job. Deliberately in-process: introducing Celery and a broker for a single
nightly scan would be infrastructure ahead of a requirement (tech-stack.md §3, §5).

Caveat worth knowing before this scales: with more than one API replica, every replica
runs its own copy of the job. That is harmless while the job only logs, and is the
documented trigger for moving to a real task queue.
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.modules.reminder_service import run_deadline_scan

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None

# 02:30 IST — after midnight portal updates, before students are awake.
DAILY_HOUR = 2
DAILY_MINUTE = 30
TIMEZONE = "Asia/Kolkata"


def start_scheduler() -> AsyncIOScheduler | None:
    """Start the background scheduler. Idempotent; a no-op if already running."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    scheduler = AsyncIOScheduler(timezone=TIMEZONE)
    scheduler.add_job(
        run_deadline_scan,
        trigger=CronTrigger(hour=DAILY_HOUR, minute=DAILY_MINUTE),
        id="scholarship_deadline_scan",
        name="Scholarship deadline reminders (FR-27)",
        # If the process was down at the scheduled time, run once on restart rather than
        # replaying every missed day.
        coalesce=True,
        max_instances=1,
        misfire_grace_time=60 * 60,
        replace_existing=True,
    )
    scheduler.start()
    _scheduler = scheduler
    logger.info(
        "Scheduler started: scholarship deadline scan daily at %02d:%02d %s",
        DAILY_HOUR,
        DAILY_MINUTE,
        TIMEZONE,
    )
    return scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler stopped.")


def scheduler_enabled() -> bool:
    """Off during tests, where a background job would race the fixtures."""
    return settings.environment.lower() not in {"test", "testing"}
