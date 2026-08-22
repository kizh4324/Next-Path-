"""Build data/seed/seed_market_snapshots.json from the Naukri postings sample.

    python -m data.build_market_seed [--check]

Aggregates job postings into one MarketSnapshot per mapped career: demand indicator,
salary bands, top demanded skills, hiring locations, and experience distribution.

Two honesty rules are enforced in code rather than left to the copywriting:

1. Only titles present in naukri_title_to_career_map.json are counted. Unmapped titles
   are written to unmapped_titles.log for review — never fuzzy-matched into a career.
2. Salary bands are computed only from postings that actually disclosed a package. In
   this sample that is roughly 10% of rows, and the resulting `uncertainty_statement`
   says so with the real numbers, because a band drawn from a tenth of the data must
   not read like a band drawn from all of it.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
NAUKRI_DIR = REPO_ROOT / "Dataset" / "Job Market"
TITLE_MAP_FILE = REPO_ROOT / "data" / "seed" / "mappings" / "naukri_title_to_career_map.json"
OUTPUT_FILE = REPO_ROOT / "data" / "seed" / "seed_market_snapshots.json"
UNMAPPED_LOG = REPO_ROOT / "data" / "seed" / "unmapped_titles.log"

LAST_UPDATED_DATE = "2026-08-20"
GEOGRAPHY = "India (major metropolitan hiring centres)"

# "18-22.5 Lacs PA" -> (18.0, 22.5). One lakh = 100,000 INR.
SALARY_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*lacs?\s*pa", re.IGNORECASE
)
# "6-8 Yrs" -> (6, 8)
EXPERIENCE_PATTERN = re.compile(r"(\d+)\s*-\s*(\d+)\s*yrs?", re.IGNORECASE)
LAKH = 100_000

NOT_DISCLOSED = {"not disclosed", "none", "", "n/a", "na", "-"}
UNPAID = "unpaid"

# Demand thresholds by posting volume within this sample. Deliberately coarse: the
# sample cannot support a finer claim than "a lot" versus "a little".
DEMAND_HIGH_MIN = 20_000
DEMAND_MODERATE_MIN = 5_000
DEMAND_EMERGING_MIN = 1_000

TOP_SKILLS_LIMIT = 12
TOP_LOCATIONS_LIMIT = 10

# The Skills column arrives as concatenated phrases with no separator
# ("AutomationData analysisSQL"). Split on a lowercase/digit followed by an uppercase.
SKILL_SPLIT_PATTERN = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")


class MarketBuildError(RuntimeError):
    pass


@dataclass
class CareerAggregate:
    career_id: str
    postings: int = 0
    salary_mins_lakh: list[float] = field(default_factory=list)
    salary_maxs_lakh: list[float] = field(default_factory=list)
    unpaid_postings: int = 0
    disclosed_postings: int = 0
    skills: Counter[str] = field(default_factory=Counter)
    locations: Counter[str] = field(default_factory=Counter)
    experience_buckets: Counter[str] = field(default_factory=Counter)


def _normalize_title(raw: str) -> str:
    return re.sub(r"\s+", " ", raw).strip().lower()


def _split_skills(raw: str) -> list[str]:
    if not raw or raw.strip().lower() in NOT_DISCLOSED:
        return []
    parts = SKILL_SPLIT_PATTERN.split(raw)
    cleaned = []
    for part in parts:
        text = part.strip().strip(",;|").strip()
        # Single characters and very long runs are split artefacts, not skills.
        if 2 <= len(text) <= 40:
            cleaned.append(text)
    return cleaned


def _experience_bucket(raw: str) -> str | None:
    match = EXPERIENCE_PATTERN.search(raw or "")
    if not match:
        return None
    low = int(match.group(1))
    if low <= 1:
        return "0-1 years (entry)"
    if low <= 3:
        return "2-3 years"
    if low <= 6:
        return "4-6 years"
    if low <= 10:
        return "7-10 years"
    return "10+ years"


def _percentile(values: list[float], fraction: float) -> float:
    """Nearest-rank percentile. No numpy — the tech stack excludes it deliberately."""
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, round(fraction * (len(ordered) - 1))))
    return ordered[index]


def _demand_indicator(postings: int) -> str:
    if postings >= DEMAND_HIGH_MIN:
        return "High"
    if postings >= DEMAND_MODERATE_MIN:
        return "Moderate"
    if postings >= DEMAND_EMERGING_MIN:
        return "Emerging"
    return "Niche"


def _format_lakh_band(low: float, high: float) -> str:
    """Render a salary band, collapsing to a single figure when the band is degenerate.

    A skewed disclosed sample can make both percentiles land on the same value. Printing
    "₹22.5-22.5 LPA" would dress that up as a range it is not.
    """
    if abs(high - low) < 0.05:
        return f"₹{low:.1f} LPA (a single posting template dominates the disclosed sample)"
    return f"₹{low:.1f}-{high:.1f} LPA"


def _iter_postings() -> list[dict[str, str]]:
    if not NAUKRI_DIR.is_dir():
        raise MarketBuildError(f"Naukri dataset directory not found: {NAUKRI_DIR}")
    rows: list[dict[str, str]] = []
    for path in sorted(NAUKRI_DIR.glob("*.csv")):
        with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
            for row in csv.DictReader(handle):
                rows.append(
                    {
                        "title": row.get("Job_Titles") or row.get("Job Titles") or "",
                        "package": row.get("Package_Details") or row.get("Package") or "",
                        "experience": (
                            row.get("Experience_Required")
                            or row.get("Experience Required")
                            or ""
                        ),
                        "locations": row.get("Locations") or "",
                        "skills": row.get("Skills") or "",
                    }
                )
    if not rows:
        raise MarketBuildError(f"No postings found under {NAUKRI_DIR}")
    return rows


def build(check_only: bool = False) -> int:
    title_map_file = json.loads(TITLE_MAP_FILE.read_text(encoding="utf-8"))
    title_map: dict[str, str] = {
        _normalize_title(k): v for k, v in title_map_file["mappings"].items()
    }
    excluded_values = {v.lower() for v in title_map_file["excluded_title_values"]}

    rows = _iter_postings()
    aggregates: dict[str, CareerAggregate] = defaultdict(lambda: CareerAggregate(""))
    unmapped: Counter[str] = Counter()
    excluded = 0

    for row in rows:
        title = _normalize_title(row["title"])
        if not title or title in excluded_values:
            excluded += 1
            continue
        career_id = title_map.get(title)
        if career_id is None:
            unmapped[title] += 1
            continue

        agg = aggregates[career_id]
        agg.career_id = career_id
        agg.postings += 1

        package = row["package"].strip().lower()
        if package == UNPAID:
            agg.unpaid_postings += 1
        elif package not in NOT_DISCLOSED:
            match = SALARY_PATTERN.search(row["package"])
            if match:
                agg.salary_mins_lakh.append(float(match.group(1)))
                agg.salary_maxs_lakh.append(float(match.group(2)))
                agg.disclosed_postings += 1

        for skill in _split_skills(row["skills"]):
            agg.skills[skill] += 1
        for location in row["locations"].split(","):
            name = location.strip()
            if name and name.lower() not in NOT_DISCLOSED:
                agg.locations[name] += 1
        bucket = _experience_bucket(row["experience"])
        if bucket:
            agg.experience_buckets[bucket] += 1

    total_valid = sum(a.postings for a in aggregates.values()) + sum(unmapped.values())
    snapshots: list[dict[str, Any]] = []

    for career_id in sorted(aggregates):
        agg = aggregates[career_id]
        has_salary = agg.disclosed_postings > 0
        disclosure_pct = (agg.disclosed_postings / agg.postings * 100) if agg.postings else 0.0

        if has_salary:
            entry_low = _percentile(agg.salary_mins_lakh, 0.10)
            entry_high = _percentile(agg.salary_mins_lakh, 0.50)
            mid_low = _percentile(agg.salary_maxs_lakh, 0.50)
            mid_high = _percentile(agg.salary_maxs_lakh, 0.90)
            entry_band = _format_lakh_band(entry_low, entry_high)
            mid_band = _format_lakh_band(mid_low, mid_high)
            uncertainty = (
                f"Salary figures come from the {agg.disclosed_postings:,} postings "
                f"({disclosure_pct:.0f}% of {agg.postings:,}) that actually stated a "
                f"package — the other {100 - disclosure_pct:.0f}% said 'Not disclosed'. "
                "Employers who publish pay are not a random sample of employers, so "
                "treat these as indicative of that subset only, not of the market. "
                "These are recorded offers from one job board over one collection "
                "period. They are not a forecast of what you will earn."
            )
        else:
            entry_band = mid_band = "Not disclosed in this sample"
            uncertainty = (
                f"None of the {agg.postings:,} postings for this role disclosed a "
                "package, so no salary range can be shown. An absent figure here means "
                "we do not know, not that pay is low."
            )

        top_location = agg.locations.most_common(1)
        concentration = ""
        if top_location:
            share = top_location[0][1] / agg.postings * 100
            concentration = (
                f" Hiring is concentrated in {top_location[0][0]}, which accounts for "
                f"about {share:.0f}% of postings in this sample — opportunities "
                "elsewhere in India are considerably fewer."
            )

        snapshots.append(
            {
                "career_id": career_id,
                "geography": GEOGRAPHY,
                "timeframe_period": (
                    f"Sample of {agg.postings:,} Naukri job postings mapped to this role"
                ),
                "data_source": "Naukri India Job Postings Sample",
                "demand_indicator": _demand_indicator(agg.postings),
                "salary_range_entry_inr": entry_band,
                "salary_range_mid_inr": mid_band,
                "top_demanded_skills": [
                    {"skill": name, "postings": count, "share_pct": round(count / agg.postings * 100, 1)}
                    for name, count in agg.skills.most_common(TOP_SKILLS_LIMIT)
                ],
                "top_hiring_locations": [
                    {"location": name, "postings": count, "share_pct": round(count / agg.postings * 100, 1)}
                    for name, count in agg.locations.most_common(TOP_LOCATIONS_LIMIT)
                ],
                "experience_distribution": dict(sorted(agg.experience_buckets.items())),
                "competition_caveat": (
                    f"{agg.postings:,} postings in this sample does not mean "
                    f"{agg.postings:,} openings for you. Postings are duplicated across "
                    "consultancies, many are filled internally, and most ask for prior "
                    "experience — entry-level competition is significantly tougher than "
                    "the total suggests." + concentration
                ),
                "uncertainty_statement": uncertainty,
                "last_updated_date": LAST_UPDATED_DATE,
                "_build_stats": {
                    "postings_mapped": agg.postings,
                    "postings_with_disclosed_salary": agg.disclosed_postings,
                    "salary_disclosure_pct": round(disclosure_pct, 1),
                    "unpaid_internship_postings": agg.unpaid_postings,
                },
            }
        )

    mapped_rows = sum(a.postings for a in aggregates.values())
    unmapped_rows = sum(unmapped.values())
    coverage_pct = round(mapped_rows / total_valid * 100, 1) if total_valid else 0.0
    payload = {
        "_meta": {
            "generated_by": "backend/data/build_market_seed.py",
            "source": "Naukri India Job Postings Sample — see NOTICE.md",
            "total_rows_read": len(rows),
            "excluded_malformed_rows": excluded,
            "valid_rows": total_valid,
            "mapped_rows": mapped_rows,
            "unmapped_rows": unmapped_rows,
            "unmapped_distinct_titles": len(unmapped),
            "coverage_pct": coverage_pct,
            "careers_with_evidence": sorted(aggregates),
            "scope_limitation": (
                "This dataset samples Data Science and Data Analytics roles only. Every "
                "other career in the catalogue has no market snapshot, and the API "
                "returns an explicit missing-evidence state for them."
            ),
            "last_updated_date": LAST_UPDATED_DATE,
        },
        "snapshots": snapshots,
    }

    rendered = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    log_lines = [
        "# Naukri titles with no entry in naukri_title_to_career_map.json.",
        "# Reviewed by the content owner; never fuzzy-matched into a career.",
        f"# {len(unmapped):,} distinct titles, {sum(unmapped.values()):,} postings.",
        "",
        *(f"{count}\t{title}" for title, count in unmapped.most_common()),
    ]
    log_text = "\n".join(log_lines) + "\n"

    if check_only:
        if not OUTPUT_FILE.exists():
            print(f"FAIL: {OUTPUT_FILE} has not been built.", file=sys.stderr)
            return 1
        if OUTPUT_FILE.read_text(encoding="utf-8") != rendered:
            print(
                "FAIL: seed_market_snapshots.json is stale. "
                "Run `python -m data.build_market_seed` and commit the result.",
                file=sys.stderr,
            )
            return 1
        print(f"OK: market snapshots match their source ({len(snapshots)} careers).")
        return 0

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(rendered, encoding="utf-8")
    UNMAPPED_LOG.write_text(log_text, encoding="utf-8")

    print(f"Wrote {OUTPUT_FILE.relative_to(REPO_ROOT)}")
    print(f"  {len(rows):,} rows read, {excluded:,} malformed excluded")
    print(
        f"  {mapped_rows:,} mapped "
        f"({coverage_pct}% of valid) into {len(snapshots)} careers"
    )
    for snap in snapshots:
        stats = snap["_build_stats"]
        print(
            f"    {snap['career_id']:<16} {stats['postings_mapped']:>6,} postings  "
            f"salary from {stats['salary_disclosure_pct']:>4}%  "
            f"demand={snap['demand_indicator']}"
        )
    print(
        f"  {len(unmapped):,} unmapped titles logged to "
        f"{UNMAPPED_LOG.relative_to(REPO_ROOT)}"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify without writing.")
    args = parser.parse_args()
    try:
        return build(check_only=args.check)
    except MarketBuildError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
