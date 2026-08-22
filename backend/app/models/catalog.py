"""Tables 4-7: career_library, career_skills, scholarships, market_snapshots.

Every table here carries the non-optional governance metadata required by PRD
Section 13 — content owner, review cycle, verification date, source links. These are
never nullable: an entry that cannot say where it came from does not belong in the
catalogue.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import JSONColumn, UUIDColumn, created_at_column, updated_at_column

SKILL_CATEGORIES = ("essential", "useful", "optional")
SPONSOR_TYPES = ("Government", "Private", "Institutional")
DEMAND_INDICATORS = ("High", "Moderate", "Emerging", "Stable", "Niche")

DEFAULT_COMMERCIAL_DISCLOSURE = (
    "Independent curated resource. No commercial commission or affiliation."
)
DEFAULT_REQUIRED_DOCUMENTS = [
    "Income Certificate",
    "Caste Certificate",
    "Domicile Certificate",
    "Mark Sheet",
    "Aadhaar Card",
]


class CareerLibrary(Base):
    """Localized occupational catalogue (FR-04, PRD Section 13.1).

    RIASEC vectors, Job Zone, and the O*NET-SOC code are derived from O*NET 30.3.
    Everything India-specific — entry routes, entrance exams, INR cost bands, regional
    caveats — is authored content and is not present in O*NET.
    """

    __tablename__ = "career_library"
    __table_args__ = (
        CheckConstraint("job_zone BETWEEN 1 AND 5", name="ck_career_library_job_zone"),
        Index("idx_career_library_cluster", "cluster"),
        Index("idx_career_library_riasec", "riasec_code"),
        Index("idx_career_library_stages", "applicable_stages", postgresql_using="gin"),
    )

    # Slug identifier, e.g. 'data-scientist'.
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    onet_soc_code: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    cluster: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    work_reality_summary: Mapped[str] = mapped_column(Text, nullable=False)

    applicable_stages: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False)
    job_zone: Mapped[int] = mapped_column(Integer, nullable=False)
    riasec_code: Mapped[str] = mapped_column(String(10), nullable=False)
    # {"R": 1.2, "I": 6.8, "A": 2.1, "S": 3.5, "E": 4.2, "C": 4.9} on O*NET's 1-7 scale.
    riasec_scores: Mapped[dict[str, float]] = mapped_column(JSONColumn, nullable=False)

    india_entry_routes: Mapped[list[dict[str, Any]]] = mapped_column(JSONColumn, nullable=False)
    prerequisites: Mapped[list[str]] = mapped_column(JSONColumn, default=list, nullable=False)
    risks_and_tradeoffs: Mapped[list[str]] = mapped_column(
        JSONColumn, default=list, nullable=False
    )
    regional_caveats: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Governance (PRD Section 13.1) — never optional ---
    content_owner: Mapped[str] = mapped_column(String(255), nullable=False)
    review_cycle_months: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    last_reviewed_date: Mapped[date] = mapped_column(Date, nullable=False)
    source_links: Mapped[list[str]] = mapped_column(JSONColumn, default=list, nullable=False)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    skills: Mapped[list[CareerSkill]] = relationship(
        "CareerSkill", back_populates="career", cascade="all, delete-orphan"
    )
    market_snapshots: Mapped[list[MarketSnapshot]] = relationship(
        "MarketSnapshot", back_populates="career", cascade="all, delete-orphan"
    )


class CareerSkill(Base):
    """Skill requirements with free-first resource signposting (FR-11, FR-12)."""

    __tablename__ = "career_skills"
    __table_args__ = (
        CheckConstraint(
            "category IN ('essential', 'useful', 'optional')",
            name="ck_career_skills_category",
        ),
        Index("idx_career_skills_career", "career_id"),
        Index("idx_career_skills_category", "category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    career_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("career_library.id", ondelete="CASCADE"), nullable=False
    )
    skill_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Free resource is mandatory: a skill we cannot point at a free route for fails
    # the free-first requirement (FR-12) and must not be seeded.
    free_learning_resource_name: Mapped[str] = mapped_column(String(255), nullable=False)
    free_learning_resource_url: Mapped[str] = mapped_column(Text, nullable=False)
    paid_learning_resource_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paid_learning_resource_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    commercial_disclosure: Mapped[str] = mapped_column(
        Text, default=DEFAULT_COMMERCIAL_DISCLOSURE, nullable=False
    )

    created_at: Mapped[datetime] = created_at_column()

    career: Mapped[CareerLibrary] = relationship("CareerLibrary", back_populates="skills")


class Scholarship(Base):
    """Verified scholarship catalogue (FR-13, PRD Section 13.4)."""

    __tablename__ = "scholarships"
    __table_args__ = (
        CheckConstraint(
            "sponsor_type IN ('Government', 'Private', 'Institutional')",
            name="ck_scholarships_sponsor_type",
        ),
        Index("idx_scholarships_state", "state"),
        Index("idx_scholarships_category", "target_category"),
        Index("idx_scholarships_income", "income_ceiling_inr"),
        Index("idx_scholarships_qualification", "min_qualification"),
    )

    # Seeded from the Scholar-Spot source ID so re-runs are idempotent.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    sponsor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_category: Mapped[str] = mapped_column(String(100), nullable=False)
    # 0 means "no income ceiling", not "zero income".
    income_ceiling_inr: Mapped[int] = mapped_column(Integer, nullable=False)
    min_qualification: Mapped[str] = mapped_column(String(100), nullable=False)
    amount_description: Mapped[str] = mapped_column(Text, nullable=False)

    # --- Governance (PRD Section 13.4) — never optional ---
    eligibility_summary: Mapped[str] = mapped_column(Text, nullable=False)
    deadline_description: Mapped[str] = mapped_column(String(255), nullable=False)
    required_documents: Mapped[list[str]] = mapped_column(
        JSONColumn, default=lambda: list(DEFAULT_REQUIRED_DOCUMENTS), nullable=False
    )
    official_source_url: Mapped[str] = mapped_column(Text, nullable=False)
    last_verified_date: Mapped[date] = mapped_column(Date, nullable=False)
    renewal_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = created_at_column()


class MarketSnapshot(Base):
    """Dated labour-market evidence (FR-14, PRD Section 13.2).

    Rows exist only where real source data exists. Careers with no snapshot are
    reported by the API as an explicit missing-evidence state — never backfilled with
    estimates, which PRD Section 13.2 prohibits.
    """

    __tablename__ = "market_snapshots"
    __table_args__ = (
        CheckConstraint(
            "demand_indicator IN ('High', 'Moderate', 'Emerging', 'Stable', 'Niche')",
            name="ck_market_snapshots_demand",
        ),
        Index("idx_market_snapshots_career", "career_id"),
        Index(
            "idx_market_snapshots_skills",
            "top_demanded_skills",
            postgresql_using="gin",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    career_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("career_library.id", ondelete="CASCADE"), nullable=False
    )
    geography: Mapped[str] = mapped_column(String(255), nullable=False)
    timeframe_period: Mapped[str] = mapped_column(String(255), nullable=False)
    data_source: Mapped[str] = mapped_column(
        String(255), default="Naukri India Job Postings Sample", nullable=False
    )
    demand_indicator: Mapped[str] = mapped_column(String(50), nullable=False)
    salary_range_entry_inr: Mapped[str] = mapped_column(String(100), nullable=False)
    salary_range_mid_inr: Mapped[str] = mapped_column(String(100), nullable=False)
    top_demanded_skills: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONColumn, default=list, nullable=False
    )
    top_hiring_locations: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONColumn, default=list, nullable=False
    )
    experience_distribution: Mapped[dict[str, Any]] = mapped_column(
        JSONColumn, default=dict, nullable=False
    )

    # --- Mandatory honesty fields (PRD Section 13.2) ---
    competition_caveat: Mapped[str] = mapped_column(Text, nullable=False)
    uncertainty_statement: Mapped[str] = mapped_column(Text, nullable=False)
    last_updated_date: Mapped[date] = mapped_column(Date, nullable=False)

    created_at: Mapped[datetime] = created_at_column()

    career: Mapped[CareerLibrary] = relationship(
        "CareerLibrary", back_populates="market_snapshots"
    )
