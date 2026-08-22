"""Read the fields Next_Path needs out of the O*NET 30.3 CSV distribution.

Scope is deliberately narrow. O*NET ships ~180 MB across 40 files; this module touches
five of them and pulls only what the career catalogue actually uses:

    occupation_data.csv        -> canonical title and description
    job_zones.csv              -> Job Zone (1-5)
    career_interest_types.csv  -> RIASEC vector (Scale ID 'OI', 1-7)
    essential_skills.csv       -> skill importance (Scale ID 'IM', 1-5)
    knowledge.csv              -> knowledge-domain importance (Scale ID 'IM', 1-5)

See NOTICE.md for the CC BY 4.0 attribution and the list of modifications.
"""

from __future__ import annotations

import csv
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

# Importance is published on 1.0-5.0; the product works in 0-100.
RAW_IMPORTANCE_MIN = 1.0
RAW_IMPORTANCE_MAX = 5.0

# Tier cutoffs (database-schema.md §3.2 B).
TIER_ESSENTIAL_MIN = 70.0
TIER_USEFUL_MIN = 50.0

RIASEC_ELEMENT_TO_KEY: dict[str, str] = {
    "Realistic": "R",
    "Investigative": "I",
    "Artistic": "A",
    "Social": "S",
    "Enterprising": "E",
    "Conventional": "C",
}

SCALE_IMPORTANCE = "IM"
SCALE_OCCUPATIONAL_INTERESTS = "OI"


class OnetDataError(RuntimeError):
    """Raised when the O*NET distribution is missing or structurally unexpected."""


@dataclass
class OnetOccupation:
    soc_code: str
    title: str
    description: str
    job_zone: int | None = None
    riasec_scores: dict[str, float] = field(default_factory=dict)
    # element name -> normalized 0-100 importance
    skills: dict[str, float] = field(default_factory=dict)
    knowledge: dict[str, float] = field(default_factory=dict)


def normalize_importance(raw: float) -> float:
    """Linearly rescale a raw 1.0-5.0 O*NET importance rating onto 0-100.

        normalized = (raw - 1.0) / 4.0 * 100

    Values outside the published range are clamped rather than extrapolated.
    """
    clamped = max(RAW_IMPORTANCE_MIN, min(RAW_IMPORTANCE_MAX, raw))
    return round((clamped - RAW_IMPORTANCE_MIN) / 4.0 * 100.0, 2)


def categorize_importance(normalized: float) -> str:
    if normalized >= TIER_ESSENTIAL_MIN:
        return "essential"
    if normalized >= TIER_USEFUL_MIN:
        return "useful"
    return "optional"


def _iter_rows(path: Path) -> Iterator[dict[str, str]]:
    if not path.exists():
        raise OnetDataError(
            f"O*NET file not found: {path}\n"
            "Expected the extracted db_30_3_csv distribution under the Dataset directory."
        )
    # utf-8-sig: several O*NET CSVs carry a BOM, which would otherwise corrupt the
    # first header key and silently break every lookup against it.
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


class OnetReader:
    """Lazily loads and caches the five O*NET tables the catalogue depends on."""

    def __init__(self, onet_dir: Path) -> None:
        self.dir = onet_dir
        if not self.dir.is_dir():
            raise OnetDataError(f"O*NET directory not found: {self.dir}")
        self._occupations: dict[str, OnetOccupation] | None = None

    # -- individual tables -------------------------------------------------------
    def _load_occupations(self) -> dict[str, OnetOccupation]:
        result: dict[str, OnetOccupation] = {}
        for row in _iter_rows(self.dir / "occupation_data.csv"):
            code = row["O*NET-SOC Code"].strip()
            result[code] = OnetOccupation(
                soc_code=code,
                title=row["Title"].strip(),
                description=row["Description"].strip(),
            )
        if not result:
            raise OnetDataError("occupation_data.csv contained no rows.")
        return result

    def _apply_job_zones(self, occupations: dict[str, OnetOccupation]) -> None:
        for row in _iter_rows(self.dir / "job_zones.csv"):
            occupation = occupations.get(row["O*NET-SOC Code"].strip())
            if occupation is None:
                continue
            try:
                occupation.job_zone = int(row["Job Zone"])
            except (KeyError, ValueError):
                continue

    def _apply_riasec(self, occupations: dict[str, OnetOccupation]) -> None:
        for row in _iter_rows(self.dir / "career_interest_types.csv"):
            if row.get("Scale ID", "").strip() != SCALE_OCCUPATIONAL_INTERESTS:
                continue
            occupation = occupations.get(row["O*NET-SOC Code"].strip())
            if occupation is None:
                continue
            key = RIASEC_ELEMENT_TO_KEY.get(row["Element Name"].strip())
            if key is None:
                continue
            try:
                occupation.riasec_scores[key] = float(row["Data Value"])
            except ValueError:
                continue

    def _apply_importance(
        self,
        occupations: dict[str, OnetOccupation],
        filename: str,
        target: str,
    ) -> None:
        for row in _iter_rows(self.dir / filename):
            if row.get("Scale ID", "").strip() != SCALE_IMPORTANCE:
                continue
            # O*NET marks low-confidence estimates; excluding them keeps the catalogue
            # to ratings the source itself stands behind.
            if row.get("Recommend Suppress", "").strip().upper() == "Y":
                continue
            occupation = occupations.get(row["O*NET-SOC Code"].strip())
            if occupation is None:
                continue
            try:
                value = normalize_importance(float(row["Data Value"]))
            except ValueError:
                continue
            getattr(occupation, target)[row["Element Name"].strip()] = value

    # -- public API --------------------------------------------------------------
    def load(self) -> dict[str, OnetOccupation]:
        if self._occupations is not None:
            return self._occupations
        occupations = self._load_occupations()
        self._apply_job_zones(occupations)
        self._apply_riasec(occupations)
        self._apply_importance(occupations, "essential_skills.csv", "skills")
        self._apply_importance(occupations, "knowledge.csv", "knowledge")
        self._occupations = occupations
        return occupations

    def get(self, soc_code: str) -> OnetOccupation:
        occupations = self.load()
        occupation = occupations.get(soc_code)
        if occupation is None:
            raise OnetDataError(f"O*NET-SOC code not present in this release: {soc_code}")
        return occupation

    def top_skills(self, soc_code: str, limit: int = 12) -> list[tuple[str, float]]:
        """Skills and knowledge domains for one occupation, most important first.

        Ties break on name so repeated builds emit an identical catalogue.
        """
        occupation = self.get(soc_code)
        combined: dict[str, float] = {**occupation.knowledge, **occupation.skills}
        ranked = sorted(combined.items(), key=lambda item: (-item[1], item[0]))
        return ranked[:limit]


def riasec_code(scores: dict[str, float], top_n: int = 3) -> str:
    """Holland code from the highest-scoring dimensions, e.g. 'IRC'."""
    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    return "".join(key for key, _ in ranked[:top_n])
