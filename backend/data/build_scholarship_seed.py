"""Build data/seed/seed_scholarships.json from the Scholar-Spot CSV.

    python -m data.build_scholarship_seed [--check]

Cleaning applied (database-schema.md §3.2 C):
  * Header whitespace is stripped — the source ships ' ID', 'Income ', and 'Type '
    with stray spaces that would otherwise produce silent KeyErrors.
  * `Income` of 0 means "no income ceiling", not "applicants must earn nothing".
  * `LINKS` maps to `official_source_url`.
  * Governance fields the source does not carry (`last_verified_date`,
    `deadline_description`, `required_documents`) are populated to the values agreed in
    the schema shard rather than invented per row.

Where the source genuinely does not state something — a scholarship amount, a renewal
condition — the output says so in words the student will read. It never substitutes a
plausible-sounding figure.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_FILE = REPO_ROOT / "Dataset" / "Scholarship" / "dataset.csv"
OUTPUT_FILE = REPO_ROOT / "data" / "seed" / "seed_scholarships.json"

LAST_VERIFIED_DATE = "2026-08-20"
DEFAULT_DEADLINE = "Annual portal cycle — check the official portal for this year's dates"
DEFAULT_DOCUMENTS = [
    "Income Certificate",
    "Caste Certificate",
    "Domicile Certificate",
    "Mark Sheet",
    "Aadhaar Card",
]
AMOUNT_UNKNOWN = (
    "Amount is not stated in our source record. The official portal is authoritative — "
    "check it before you rely on any figure."
)
RENEWAL_UNKNOWN = None

VALID_SPONSOR_TYPES = {"Government", "Private", "Institutional"}

# Sentences mentioning money, pulled from the description to build amount_description.
AMOUNT_SENTENCE = re.compile(
    r"[^.]*(?:INR|Rs\.?|₹|\blakh\b|\bcrore\b|stipend|scholarship of|financial assistance"
    r"|per month|per year|per annum|tuition fee)[^.]*\.",
    re.IGNORECASE,
)


class ScholarshipBuildError(RuntimeError):
    pass


def _clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def _parse_income_ceiling(raw: str) -> int:
    text = _clean(raw).replace(",", "")
    if not text:
        return 0
    try:
        return max(0, int(float(text)))
    except ValueError:
        return 0


def _extract_amount(description: str) -> str:
    matches = AMOUNT_SENTENCE.findall(description)
    if not matches:
        return AMOUNT_UNKNOWN
    # Two sentences is enough context; more turns the card into a wall of text.
    return " ".join(_clean(m) for m in matches[:2])


def _eligibility_summary(row: dict[str, str], income_ceiling: int) -> str:
    parts: list[str] = []
    category = _clean(row.get("Category"))
    if category and category.lower() != "all":
        parts.append(f"Open to students in the {category} category")
    else:
        parts.append("Open to students of all categories")

    qualification = _clean(row.get("Qualification"))
    if qualification:
        parts.append(f"studying at {qualification} level")

    state = _clean(row.get("State"))
    if state and state.lower() != "all india":
        parts.append(f"with {state} domicile")
    else:
        parts.append("across India")

    if income_ceiling > 0:
        parts.append(f"with annual family income up to ₹{income_ceiling:,}")
    else:
        parts.append("with no stated family income ceiling")

    return ", ".join(parts) + ". Confirm the full criteria on the official portal."


def build(check_only: bool = False) -> int:
    if not SOURCE_FILE.exists():
        raise ScholarshipBuildError(f"Scholarship source not found: {SOURCE_FILE}")

    entries: list[dict[str, Any]] = []
    seen_ids: set[int] = set()
    skipped: list[str] = []

    with SOURCE_FILE.open("r", encoding="utf-8", errors="replace", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ScholarshipBuildError("Scholarship CSV has no header row.")
        # The source header carries stray spaces (' ID', 'Income ', 'Type ').
        normalized_keys = {name: _clean(name) for name in reader.fieldnames}

        for raw_row in reader:
            row = {normalized_keys[k]: v for k, v in raw_row.items() if k in normalized_keys}

            raw_id = _clean(row.get("ID"))
            if not raw_id.isdigit():
                skipped.append(f"non-numeric ID {raw_id!r}")
                continue
            scholarship_id = int(raw_id)
            if scholarship_id in seen_ids:
                skipped.append(f"duplicate ID {scholarship_id}")
                continue

            name = _clean(row.get("Name"))
            url = _clean(row.get("LINKS"))
            if not name or not url:
                # A scholarship with no name or no verifiable source link fails the
                # governance rules in PRD Section 13.4 and must not be catalogued.
                skipped.append(f"ID {scholarship_id}: missing name or source URL")
                continue

            sponsor_type = _clean(row.get("Type")).title()
            if sponsor_type not in VALID_SPONSOR_TYPES:
                sponsor_type = "Institutional"

            description = _clean(row.get("Description"))
            income_ceiling = _parse_income_ceiling(row.get("Income", ""))
            seen_ids.add(scholarship_id)

            entries.append(
                {
                    "id": scholarship_id,
                    "name": name,
                    "state": _clean(row.get("State")) or "All India",
                    "sponsor_type": sponsor_type,
                    "target_category": _clean(row.get("Category")) or "all",
                    "income_ceiling_inr": income_ceiling,
                    "min_qualification": _clean(row.get("Qualification")) or "Not specified",
                    "amount_description": _extract_amount(description),
                    "eligibility_summary": _eligibility_summary(row, income_ceiling),
                    "deadline_description": DEFAULT_DEADLINE,
                    "required_documents": list(DEFAULT_DOCUMENTS),
                    "official_source_url": url,
                    "last_verified_date": LAST_VERIFIED_DATE,
                    "renewal_conditions": RENEWAL_UNKNOWN,
                    "is_active": True,
                    "source_description": description,
                }
            )

    entries.sort(key=lambda e: e["id"])
    states = sorted({e["state"] for e in entries})
    payload = {
        "_meta": {
            "generated_by": "backend/data/build_scholarship_seed.py",
            "source": "Scholar-Spot Indian Scholarships Dataset — see NOTICE.md",
            "entry_count": len(entries),
            "skipped_rows": skipped,
            "states_covered": states,
            "coverage_limitation": (
                f"This catalogue covers {len(states)} jurisdictions only: "
                f"{', '.join(states)}. Students from any other state will correctly see "
                "no results — that means the scheme is absent from our data, not that no "
                "scheme exists. The national portal at scholarships.gov.in remains the "
                "authoritative source."
            ),
            "income_zero_meaning": "income_ceiling_inr of 0 means no stated income ceiling.",
            "last_verified_date": LAST_VERIFIED_DATE,
        },
        "scholarships": entries,
    }

    rendered = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"

    if check_only:
        if not OUTPUT_FILE.exists():
            print(f"FAIL: {OUTPUT_FILE} has not been built.", file=sys.stderr)
            return 1
        if OUTPUT_FILE.read_text(encoding="utf-8") != rendered:
            print(
                "FAIL: seed_scholarships.json is stale. "
                "Run `python -m data.build_scholarship_seed` and commit the result.",
                file=sys.stderr,
            )
            return 1
        print(f"OK: scholarships match their source ({len(entries)} entries).")
        return 0

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(rendered, encoding="utf-8")

    with_amount = sum(1 for e in entries if e["amount_description"] != AMOUNT_UNKNOWN)
    print(f"Wrote {OUTPUT_FILE.relative_to(REPO_ROOT)}")
    print(f"  {len(entries)} scholarships across {len(states)} jurisdictions: {', '.join(states)}")
    print(f"  {with_amount} carry an amount in the source; {len(entries) - with_amount} say so plainly")
    if skipped:
        print(f"  {len(skipped)} rows skipped: {'; '.join(skipped[:5])}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify without writing.")
    args = parser.parse_args()
    try:
        return build(check_only=args.check)
    except ScholarshipBuildError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
