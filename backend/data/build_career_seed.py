"""Build data/seed/seed_career_clusters.json from authored content + O*NET 30.3.

    python -m data.build_career_seed [--check]

Two inputs, kept strictly separate so it is always clear which half of a career entry
is authored judgement and which half is derived from a public dataset:

    data/seed/mappings/india_career_authoring.json   authored: routes, exams, INR costs,
                                                     risks, regional caveats
    Dataset/Career library/db_30_3_csv/              derived: title, description, Job
                                                     Zone, RIASEC vector, skill importance

Deterministic: the same inputs always produce a byte-identical output file, so the
build can be diffed in review and `--check` can fail CI when the committed catalogue
has drifted from its sources.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from data.onet_reader import OnetReader, categorize_importance, riasec_code

REPO_ROOT = Path(__file__).resolve().parents[2]
AUTHORING_FILE = REPO_ROOT / "data" / "seed" / "mappings" / "india_career_authoring.json"
RESOURCE_MAP_FILE = REPO_ROOT / "data" / "seed" / "mappings" / "skill_resource_map.json"
ONET_DIR = REPO_ROOT / "Dataset" / "Career library" / "db_30_3_csv"
OUTPUT_FILE = REPO_ROOT / "data" / "seed" / "seed_career_clusters.json"

# How many O*NET elements to carry per career. Beyond roughly a dozen the list stops
# being something a student will read and starts being a data dump.
SKILLS_PER_CAREER = 12


class SeedBuildError(RuntimeError):
    pass


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise SeedBuildError(f"Required input missing: {path}")
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def build_skills(
    reader: OnetReader,
    soc_code: str,
    resource_map: dict[str, Any],
    default_disclosure: str,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Turn O*NET importance ratings into tiered, resource-backed skill entries.

    A skill with no mapped free resource is dropped and reported, never emitted with a
    placeholder link: FR-12 requires a real free route, and a dead link is worse than
    an absent row.
    """
    skills: list[dict[str, Any]] = []
    unmapped: list[str] = []

    for element_name, normalized in reader.top_skills(soc_code, SKILLS_PER_CAREER):
        mapping = resource_map.get(element_name)
        if mapping is None:
            unmapped.append(element_name)
            continue
        skills.append(
            {
                "skill_name": element_name,
                "category": categorize_importance(normalized),
                "normalized_importance": normalized,
                "description": mapping["description"],
                "free_learning_resource_name": mapping["free_resource_name"],
                "free_learning_resource_url": mapping["free_resource_url"],
                "paid_learning_resource_name": mapping.get("paid_resource_name"),
                "paid_learning_resource_url": mapping.get("paid_resource_url"),
                "commercial_disclosure": mapping.get(
                    "commercial_disclosure", default_disclosure
                ),
            }
        )
    return skills, unmapped


def build_career(
    authored: dict[str, Any],
    reader: OnetReader,
    resource_map: dict[str, Any],
    meta: dict[str, Any],
    default_disclosure: str,
) -> tuple[dict[str, Any], list[str]]:
    primary_soc = authored["onet_soc_code"]
    occupation = reader.get(primary_soc)

    # Some newer or aggregate SOC codes carry no skill ratings in this release. Where
    # that happens the authoring file names an explicit sibling; the substitution is
    # recorded on the built entry rather than applied silently.
    fallback_soc = authored.get("onet_skills_fallback_soc")
    skills_soc = fallback_soc or primary_soc
    skills, unmapped = build_skills(reader, skills_soc, resource_map, default_disclosure)

    riasec = occupation.riasec_scores
    if len(riasec) < 6 and fallback_soc:
        riasec = reader.get(fallback_soc).riasec_scores
    if len(riasec) < 6:
        raise SeedBuildError(
            f"{authored['id']}: incomplete RIASEC vector for {primary_soc} "
            f"({sorted(riasec)}). Add an onet_skills_fallback_soc with full ratings."
        )

    job_zone = occupation.job_zone
    if job_zone is None and fallback_soc:
        job_zone = reader.get(fallback_soc).job_zone
    if job_zone is None:
        raise SeedBuildError(f"{authored['id']}: no Job Zone for {primary_soc}.")

    entry: dict[str, Any] = {
        "id": authored["id"],
        "onet_soc_code": primary_soc,
        # Authored title wins: O*NET's US phrasing ("Family Medicine Physicians") is
        # not what an Indian student calls the job.
        "title": authored["title"],
        "onet_title": occupation.title,
        "cluster": authored["cluster"],
        "description": occupation.description,
        "work_reality_summary": authored["work_reality_summary"],
        "applicable_stages": authored["applicable_stages"],
        "job_zone": job_zone,
        "riasec_code": riasec_code(riasec),
        "riasec_scores": {key: riasec[key] for key in sorted(riasec)},
        "india_entry_routes": authored["india_entry_routes"],
        "prerequisites": authored["prerequisites"],
        "risks_and_tradeoffs": authored["risks_and_tradeoffs"],
        "regional_caveats": authored.get("regional_caveats"),
        "content_owner": meta["content_owner"],
        "review_cycle_months": meta["review_cycle_months"],
        "last_reviewed_date": meta["last_reviewed_date"],
        "source_links": authored["source_links"],
        "skills": skills,
    }
    for optional_key in ("onet_skills_fallback_soc", "onet_skills_fallback_note",
                         "onet_mapping_note"):
        if optional_key in authored:
            entry[optional_key] = authored[optional_key]
    return entry, unmapped


def build(check_only: bool = False) -> int:
    authoring = _load_json(AUTHORING_FILE)
    resource_file = _load_json(RESOURCE_MAP_FILE)
    resource_map: dict[str, Any] = resource_file["skills"]
    default_disclosure: str = resource_file["default_commercial_disclosure"]
    meta = authoring["_meta"]

    reader = OnetReader(ONET_DIR)
    careers: list[dict[str, Any]] = []
    all_unmapped: dict[str, list[str]] = {}

    for authored in authoring["careers"]:
        entry, unmapped = build_career(
            authored, reader, resource_map, meta, default_disclosure
        )
        careers.append(entry)
        if unmapped:
            all_unmapped[authored["id"]] = unmapped

    careers.sort(key=lambda c: c["id"])
    clusters = sorted({c["cluster"] for c in careers})
    payload = {
        "_meta": {
            "generated_by": "backend/data/build_career_seed.py",
            "authored_source": "data/seed/mappings/india_career_authoring.json",
            "onet_release": "O*NET 30.3 (May 2026), CC BY 4.0 — see NOTICE.md",
            "derived_fields": [
                "description", "job_zone", "riasec_code", "riasec_scores",
                "skills[].skill_name", "skills[].category",
                "skills[].normalized_importance",
            ],
            "authored_fields": [
                "title", "cluster", "work_reality_summary", "applicable_stages",
                "india_entry_routes", "prerequisites", "risks_and_tradeoffs",
                "regional_caveats", "source_links",
            ],
            "importance_normalization": "(raw - 1.0) / 4.0 * 100",
            "tier_cutoffs": {"essential": ">= 70", "useful": "50 - 69.99", "optional": "< 50"},
            "career_count": len(careers),
            "clusters": clusters,
        },
        "careers": careers,
    }

    rendered = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"

    if all_unmapped:
        print("Skills dropped for want of a mapped free resource (FR-12):", file=sys.stderr)
        for career_id, names in sorted(all_unmapped.items()):
            print(f"  {career_id}: {', '.join(sorted(names))}", file=sys.stderr)
        print(
            "  Add these to data/seed/mappings/skill_resource_map.json to include them.",
            file=sys.stderr,
        )

    if check_only:
        if not OUTPUT_FILE.exists():
            print(f"FAIL: {OUTPUT_FILE} has not been built.", file=sys.stderr)
            return 1
        if OUTPUT_FILE.read_text(encoding="utf-8") != rendered:
            print(
                "FAIL: seed_career_clusters.json is stale. "
                "Run `python -m data.build_career_seed` and commit the result.",
                file=sys.stderr,
            )
            return 1
        print(f"OK: catalogue matches its sources ({len(careers)} careers).")
        return 0

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(rendered, encoding="utf-8")

    total_skills = sum(len(c["skills"]) for c in careers)
    essential = sum(
        1 for c in careers for s in c["skills"] if s["category"] == "essential"
    )
    print(f"Wrote {OUTPUT_FILE.relative_to(REPO_ROOT)}")
    print(f"  {len(careers)} careers across {len(clusters)} clusters")
    print(f"  {total_skills} skills ({essential} essential), all with a free resource")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify the committed catalogue matches its sources; do not write.",
    )
    args = parser.parse_args()
    try:
        return build(check_only=args.check)
    except SeedBuildError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
