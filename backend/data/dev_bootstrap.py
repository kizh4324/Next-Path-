"""Local development bootstrap — creates a database, seeds it, adds demo accounts.

    DATABASE_URL=sqlite+aiosqlite:///./dev.db python -m data.dev_bootstrap

**This is a development convenience, not a deployment path.** PostgreSQL 16 is the
system of record (tech-stack.md) and the only supported production target. This script
exists so the app can be run and demonstrated on a machine without Docker or a local
Postgres, using the same portable column variants the test suite relies on.

Two things differ from a real deployment, and both matter:

  * Tables are created with `Base.metadata.create_all` rather than `alembic upgrade
    head`. The migration is PostgreSQL-specific (it needs the uuid-ossp extension) and
    will not apply to SQLite.
  * JSONB becomes plain JSON and GIN indexes become ordinary ones, so the query plans
    are not representative. Functionally everything behaves the same.

Against a real PostgreSQL, use `alembic upgrade head` then `python -m data.seed_runner`.
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User
from data.seed_runner import seed_careers, seed_market_snapshots, seed_scholarships, verify

DEMO_PASSWORD = "demo-password-123"
# example.com, not a .local / .test address: email-validator rejects special-use TLDs,
# so a demo account on one of those can be created here but never logged into.
DEMO_ACCOUNTS = [
    ("student@example.com", "Asha Kulkarni", "student"),
    ("guardian@example.com", "Meena Kulkarni", "guardian"),
    ("counselor@example.com", "R. Iyer", "counselor"),
]


async def create_tables(drop_first: bool) -> None:
    async with engine.begin() as connection:
        if drop_first:
            await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    print(f"  tables ready ({len(Base.metadata.tables)} tables)")


async def create_demo_accounts() -> list[str]:
    created: list[str] = []
    async with AsyncSessionLocal() as session:
        for email, full_name, role in DEMO_ACCOUNTS:
            existing = (
                await session.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            if existing is not None:
                continue
            session.add(
                User(
                    email=email,
                    hashed_password=hash_password(DEMO_PASSWORD),
                    role=role,
                    full_name=full_name,
                )
            )
            created.append(f"{email} ({role})")
        await session.commit()
    return created


async def run(drop_first: bool) -> int:
    if settings.database_url.startswith("postgresql"):
        print(
            "This is the PostgreSQL path — use `alembic upgrade head` and "
            "`python -m data.seed_runner` instead.",
            file=sys.stderr,
        )
        return 1

    print(f"Bootstrapping development database: {settings.database_url}")
    await create_tables(drop_first)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            careers, skills = await seed_careers(session)
            markets = await seed_market_snapshots(session)
            scholarships = await seed_scholarships(session)
        print(
            f"  seeded {careers} careers, {skills} skills, "
            f"{markets} market snapshots, {scholarships} scholarships"
        )
        await verify(session)

    created = await create_demo_accounts()
    if created:
        print("\nDemo accounts created (password: " + DEMO_PASSWORD + ")")
        for account in created:
            print(f"  {account}")
    else:
        print("\nDemo accounts already present.")

    await engine.dispose()
    print("\nReady. Start the API with:  uvicorn app.main:app --reload")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fresh", action="store_true", help="Drop every table before recreating."
    )
    args = parser.parse_args()
    return asyncio.run(run(args.fresh))


if __name__ == "__main__":
    raise SystemExit(main())
