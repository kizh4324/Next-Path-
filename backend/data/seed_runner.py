"""Idempotent seed ingestion CLI (Story 1.3, FR-04, FR-13, FR-14).

    python -m data.seed_runner              # load everything
    python -m data.seed_runner --verify     # report what is loaded, change nothing
    python -m data.seed_runner --truncate   # clear catalogue tables first

Reads the three built seed files (produced by build_career_seed, build_market_seed, and
build_scholarship_seed) and loads them into PostgreSQL inside a single transaction.

Idempotent by construction: every write is an upsert keyed on the natural primary key,
so re-running is safe and converges rather than duplicating. Child rows that are
regenerated wholesale — career skills, market snapshots — are deleted and rewritten per
career so a removed skill actually disappears instead of lingering forever.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.catalog import CareerLibrary, CareerSkill, MarketSnapshot, Scholarship

REPO_ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = REPO_ROOT / "data" / "seed"
CAREER_FILE = SEED_DIR / "seed_career_clusters.json"
MARKET_FILE = SEED_DIR / "seed_market_snapshots.json"
SCHOLARSHIP_FILE = SEED_DIR / "seed_scholarships.json"


class SeedError(RuntimeError):
    pass


def _load(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise SeedError(
            f"Seed file missing: {path.relative_to(REPO_ROOT)}\n"
            "Build it first:\n"
            "  python -m data.build_career_seed\n"
            "  python -m data.build_market_seed\n"
            "  python -m data.build_scholarship_seed"
        )
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


async def _upsert(session: AsyncSession, model: type[Any], rows: list[dict[str, Any]],
                  pk: str) -> int:
    """Upsert rows keyed on `pk`, updating every non-key column on conflict.

    Uses the PostgreSQL ON CONFLICT form when available and falls back to a
    select-then-merge for other dialects, so the test suite can run on SQLite.
    """
    if not rows:
        return 0

    dialect = session.bind.dialect.name if session.bind is not None else ""
    if dialect == "postgresql":
        statement = pg_insert(model).values(rows)
        update_columns = {
            column.name: statement.excluded[column.name]
            for column in model.__table__.columns
            if column.name not in {pk, "created_at"}
        }
        await session.execute(
            statement.on_conflict_do_update(index_elements=[pk], set_=update_columns)
        )
        return len(rows)

    for row in rows:
        existing = await session.get(model, row[pk])
        if existing is None:
            session.add(model(**row))
        else:
            for key, value in row.items():
                if key not in {pk, "created_at"}:
                    setattr(existing, key, value)
    return len(rows)


async def seed_careers(session: AsyncSession) -> tuple[int, int]:
    payload = _load(CAREER_FILE)
    careers = payload["careers"]

    career_rows: list[dict[str, Any]] = []
    for career in careers:
        career_rows.append(
            {
                "id": career["id"],
                "onet_soc_code": career["onet_soc_code"],
                "title": career["title"],
                "cluster": career["cluster"],
                "description": career["description"],
                "work_reality_summary": career["work_reality_summary"],
                "applicable_stages": career["applicable_stages"],
                "job_zone": career["job_zone"],
                "riasec_code": career["riasec_code"],
                "riasec_scores": career["riasec_scores"],
                "india_entry_routes": career["india_entry_routes"],
                "prerequisites": career["prerequisites"],
                "risks_and_tradeoffs": career["risks_and_tradeoffs"],
                "regional_caveats": career.get("regional_caveats"),
                "content_owner": career["content_owner"],
                "review_cycle_months": career["review_cycle_months"],
                "last_reviewed_date": _parse_date(career["last_reviewed_date"]),
                "source_links": career["source_links"],
            }
        )
    await _upsert(session, CareerLibrary, career_rows, "id")

    # Skills are regenerated wholesale: delete then re-insert per career so a skill
    # removed upstream actually disappears rather than lingering forever.
    career_ids = [c["id"] for c in careers]
    await session.execute(delete(CareerSkill).where(CareerSkill.career_id.in_(career_ids)))

    skill_count = 0
    for career in careers:
        for skill in career["skills"]:
            session.add(
                CareerSkill(
                    career_id=career["id"],
                    skill_name=skill["skill_name"],
                    category=skill["category"],
                    description=skill["description"],
                    free_learning_resource_name=skill["free_learning_resource_name"],
                    free_learning_resource_url=skill["free_learning_resource_url"],
                    paid_learning_resource_name=skill.get("paid_learning_resource_name"),
                    paid_learning_resource_url=skill.get("paid_learning_resource_url"),
                    commercial_disclosure=skill["commercial_disclosure"],
                )
            )
            skill_count += 1

    # Flush before returning: the session runs with autoflush=False, and the market
    # snapshot step below looks careers up by SELECT to validate its foreign keys.
    # Without this, rows added via the non-PostgreSQL upsert path are still pending
    # and every snapshot is silently skipped as an unknown career.
    await session.flush()
    return len(career_rows), skill_count


async def seed_market_snapshots(session: AsyncSession) -> int:
    payload = _load(MARKET_FILE)
    snapshots = payload["snapshots"]
    if not snapshots:
        return 0

    known = set(
        (await session.execute(select(CareerLibrary.id))).scalars().all()
    )
    career_ids = [s["career_id"] for s in snapshots if s["career_id"] in known]
    await session.execute(
        delete(MarketSnapshot).where(MarketSnapshot.career_id.in_(career_ids))
    )

    count = 0
    for snapshot in snapshots:
        if snapshot["career_id"] not in known:
            print(
                f"  ! market snapshot references unknown career "
                f"{snapshot['career_id']}; skipped",
                file=sys.stderr,
            )
            continue
        session.add(
            MarketSnapshot(
                career_id=snapshot["career_id"],
                geography=snapshot["geography"],
                timeframe_period=snapshot["timeframe_period"],
                data_source=snapshot["data_source"],
                demand_indicator=snapshot["demand_indicator"],
                salary_range_entry_inr=snapshot["salary_range_entry_inr"],
                salary_range_mid_inr=snapshot["salary_range_mid_inr"],
                top_demanded_skills=snapshot["top_demanded_skills"],
                top_hiring_locations=snapshot["top_hiring_locations"],
                experience_distribution=snapshot["experience_distribution"],
                competition_caveat=snapshot["competition_caveat"],
                uncertainty_statement=snapshot["uncertainty_statement"],
                last_updated_date=_parse_date(snapshot["last_updated_date"]),
            )
        )
        count += 1
    return count


async def seed_scholarships(session: AsyncSession) -> int:
    payload = _load(SCHOLARSHIP_FILE)
    rows = [
        {
            "id": entry["id"],
            "name": entry["name"],
            "state": entry["state"],
            "sponsor_type": entry["sponsor_type"],
            "target_category": entry["target_category"],
            "income_ceiling_inr": entry["income_ceiling_inr"],
            "min_qualification": entry["min_qualification"],
            "amount_description": entry["amount_description"],
            "eligibility_summary": entry["eligibility_summary"],
            "deadline_description": entry["deadline_description"],
            "required_documents": entry["required_documents"],
            "official_source_url": entry["official_source_url"],
            "last_verified_date": _parse_date(entry["last_verified_date"]),
            "renewal_conditions": entry.get("renewal_conditions"),
            "is_active": entry["is_active"],
        }
        for entry in payload["scholarships"]
    ]
    return await _upsert(session, Scholarship, rows, "id")


async def verify(session: AsyncSession) -> None:
    async def count_of(model: type[Any]) -> int:
        result = await session.execute(select(func.count()).select_from(model))
        return int(result.scalar_one())

    careers = await count_of(CareerLibrary)
    skills = await count_of(CareerSkill)
    markets = await count_of(MarketSnapshot)
    scholarships = await count_of(Scholarship)

    clusters = (
        await session.execute(select(func.count(func.distinct(CareerLibrary.cluster))))
    ).scalar_one()

    print("Loaded catalogue:")
    print(f"  career_library     {careers:>5}  across {clusters} clusters")
    print(f"  career_skills      {skills:>5}")
    print(f"  market_snapshots   {markets:>5}  (careers without one show missing-evidence)")
    print(f"  scholarships       {scholarships:>5}")

    if careers and markets < careers:
        print(
            f"  note: {careers - markets} careers have no market snapshot. That is "
            "expected — the Naukri sample covers data roles only."
        )


async def truncate(session: AsyncSession) -> None:
    # Order matters: children before parents, since FKs are enforced.
    for model in (CareerSkill, MarketSnapshot, Scholarship, CareerLibrary):
        await session.execute(delete(model))
    print("Catalogue tables cleared.")


async def run(do_truncate: bool, verify_only: bool) -> int:
    async with AsyncSessionLocal() as session:
        if verify_only:
            await verify(session)
            return 0

        # One transaction for the whole load: a partial catalogue is worse than none,
        # because the missing-evidence states would be wrong rather than merely absent.
        async with session.begin():
            if do_truncate:
                await truncate(session)
            careers, skills = await seed_careers(session)
            print(f"  careers upserted:      {careers}")
            print(f"  career skills written: {skills}")
            markets = await seed_market_snapshots(session)
            print(f"  market snapshots:      {markets}")
            scholarships = await seed_scholarships(session)
            print(f"  scholarships upserted: {scholarships}")
            from data.seed_syllabus_and_projects import seed_syllabi_and_projects
            syllabi, projects, trajectories = await seed_syllabi_and_projects(session)
            print(f"  syllabi written:       {syllabi}")
            print(f"  projects written:      {projects}")
            print(f"  trajectories written:  {trajectories}")

        await verify(session)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--truncate", action="store_true", help="Clear catalogue first.")
    parser.add_argument("--verify", action="store_true", help="Report counts only.")
    args = parser.parse_args()
    try:
        return asyncio.run(run(args.truncate, args.verify))
    except SeedError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
