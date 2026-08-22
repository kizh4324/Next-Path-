"""Shared test fixtures.

The suite runs against in-memory SQLite so the whole API is verifiable without a
Postgres instance. PostgreSQL remains the only supported production target — the
portable column variants in `app/models/types.py` exist for exactly this.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from datetime import date
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.catalog import CareerLibrary, CareerSkill, MarketSnapshot, Scholarship
from app.models.profile import GuardianContext, StudentProfile
from app.models.user import User

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def engine() -> AsyncGenerator[Any, None]:
    # StaticPool keeps every connection pointed at the same in-memory database.
    test_engine = create_async_engine(
        TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield test_engine
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db(engine: Any) -> AsyncGenerator[AsyncSession, None]:
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(engine: Any) -> AsyncGenerator[AsyncClient, None]:
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# --------------------------------------------------------------------------------------
# Catalogue fixtures
# --------------------------------------------------------------------------------------
def _route(**overrides: Any) -> dict[str, Any]:
    route = {
        "route_name": "B.Tech Computer Science",
        "duration_years": 4,
        "entrance_exams": ["JEE Main"],
        "cost_tier": "moderate_up_to_2_lakhs",
        "estimated_cost_inr_min": 200000,
        "estimated_cost_inr_max": 600000,
        "degree_or_cert_awarded": "B.Tech",
        "availability_scope": "within_state",
        "low_cost_alternative_route": None,
    }
    route.update(overrides)
    return route


def make_career(career_id: str, **overrides: Any) -> CareerLibrary:
    defaults: dict[str, Any] = {
        "id": career_id,
        "onet_soc_code": "15-2051.00",
        "title": career_id.replace("-", " ").title(),
        "cluster": "Data & AI",
        "description": f"Description for {career_id}.",
        "work_reality_summary": "What the day-to-day actually looks like.",
        "applicable_stages": ["class_11_12", "early_college"],
        "job_zone": 4,
        "riasec_code": "ICA",
        "riasec_scores": {"R": 2.0, "I": 6.5, "A": 2.5, "S": 1.8, "E": 2.0, "C": 5.0},
        "india_entry_routes": [_route()],
        "prerequisites": ["Mathematics in 10+2"],
        "risks_and_tradeoffs": ["Entry-level competition is high."],
        "regional_caveats": "Concentrated in metros.",
        "content_owner": "Next_Path Content Team",
        "review_cycle_months": 12,
        "last_reviewed_date": date(2026, 8, 20),
        "source_links": ["https://www.onetcenter.org/"],
    }
    defaults.update(overrides)
    return CareerLibrary(**defaults)


def make_skill(career_id: str, name: str, category: str = "essential") -> CareerSkill:
    return CareerSkill(
        career_id=career_id,
        skill_name=name,
        category=category,
        description=f"How {name} applies in this role.",
        free_learning_resource_name="NPTEL",
        free_learning_resource_url="https://nptel.ac.in/courses",
        commercial_disclosure="Independent curated resource. No commercial commission.",
    )


@pytest_asyncio.fixture
async def catalogue(db: AsyncSession) -> list[CareerLibrary]:
    """A small catalogue spanning three clusters, with market evidence for only one."""
    careers = [
        make_career("data-scientist", title="Data Scientist", cluster="Data & AI"),
        make_career("data-analyst", title="Data Analyst", cluster="Data & AI"),
        make_career(
            "civil-engineer",
            title="Civil Engineer",
            cluster="Engineering",
            riasec_scores={"R": 6.0, "I": 4.0, "A": 2.0, "S": 2.0, "E": 3.0, "C": 4.0},
            india_entry_routes=[
                _route(
                    route_name="B.Tech Civil",
                    estimated_cost_inr_min=150000,
                    estimated_cost_inr_max=400000,
                    low_cost_alternative_route="Government polytechnic diploma",
                )
            ],
        ),
        make_career(
            "chartered-accountant",
            title="Chartered Accountant",
            cluster="Commerce & Finance",
            riasec_scores={"R": 1.0, "I": 3.0, "A": 1.0, "S": 2.0, "E": 4.0, "C": 6.5},
            prerequisites=["Any stream in 10+2"],
            india_entry_routes=[
                _route(
                    route_name="CA Foundation",
                    duration_years=5,
                    entrance_exams=["ICAI CA Foundation"],
                    cost_tier="low_cost_only",
                    estimated_cost_inr_min=80000,
                    estimated_cost_inr_max=300000,
                    availability_scope="home_district_only",
                )
            ],
        ),
    ]
    for career in careers:
        db.add(career)
    await db.flush()

    for career in careers:
        db.add(make_skill(career.id, "Mathematics", "essential"))
        db.add(make_skill(career.id, "Critical Thinking", "essential"))
        db.add(make_skill(career.id, "Computers and Electronics", "useful"))

    # Only data-scientist has verified market evidence — mirrors the real dataset's
    # coverage limit, so the missing-evidence path is exercised by default.
    db.add(
        MarketSnapshot(
            career_id="data-scientist",
            geography="India (major metros)",
            timeframe_period="Sample of 28,727 Naukri postings",
            data_source="Naukri India Job Postings Sample",
            demand_indicator="High",
            salary_range_entry_inr="₹6.0-18.0 LPA",
            salary_range_mid_inr="₹22.5 LPA",
            top_demanded_skills=[{"skill": "Python", "postings": 100, "share_pct": 40.0}],
            top_hiring_locations=[{"location": "Bengaluru", "postings": 100, "share_pct": 40.0}],
            experience_distribution={"0-1 years (entry)": 3479},
            competition_caveat="Postings are not openings.",
            uncertainty_statement="Salary from the 6% of postings that disclosed one.",
            last_updated_date=date(2026, 8, 20),
        )
    )
    db.add(
        Scholarship(
            id=1,
            name="Test State Merit Scholarship",
            state="Maharashtra",
            sponsor_type="Government",
            target_category="all",
            income_ceiling_inr=250000,
            min_qualification="12th",
            amount_description="₹10,000 per year.",
            eligibility_summary="Open to all categories with Maharashtra domicile.",
            deadline_description="Annual portal cycle",
            required_documents=["Income Certificate", "Aadhaar Card"],
            official_source_url="https://mahadbt.maharashtra.gov.in/",
            last_verified_date=date(2026, 8, 20),
            is_active=True,
        )
    )
    db.add(
        Scholarship(
            id=2,
            name="National Merit Scholarship",
            state="All India",
            sponsor_type="Government",
            target_category="SC",
            income_ceiling_inr=0,
            min_qualification="Graduation",
            amount_description="₹20,000 per year.",
            eligibility_summary="Open to SC students across India.",
            deadline_description="Annual portal cycle",
            required_documents=["Caste Certificate"],
            official_source_url="https://scholarships.gov.in/",
            last_verified_date=date(2026, 8, 20),
            is_active=True,
        )
    )
    await db.commit()
    return careers


# --------------------------------------------------------------------------------------
# Auth helpers
# --------------------------------------------------------------------------------------
async def register(
    client: AsyncClient, email: str, role: str = "student", password: str = "test-password-123"
) -> dict[str, Any]:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": email.split("@")[0].title(),
            "role": role,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def auth_header(token: dict[str, Any]) -> dict[str, str]:
    return {"Authorization": f"Bearer {token['access_token']}"}


ONBOARDING_PAYLOAD: dict[str, Any] = {
    "education_stage": "early_college",
    "grade_or_year": "B.Sc Year 2",
    "current_stream": "Science (PCM)",
    "interests": [
        {"label": "solving puzzles", "riasec": "I", "strength": 5},
        {"label": "organising information", "riasec": "C", "strength": 4},
    ],
    "aptitude_signals": {"mathematics": 4, "computers": 5},
    "work_style_preferences": {"setting": "indoor"},
    "budget_tier": "moderate_up_to_2_lakhs",
    "relocation_willingness": "within_state",
    "preferred_languages": ["English", "Hindi"],
    "academic_records_available": True,
}


@pytest_asyncio.fixture
async def student(client: AsyncClient) -> dict[str, Any]:
    """A registered adult student with a complete profile — no consent gate."""
    token = await register(client, "student@example.com")
    response = await client.post(
        "/api/v1/profile", json=ONBOARDING_PAYLOAD, headers=auth_header(token)
    )
    assert response.status_code == 201, response.text
    return {"token": token, "headers": auth_header(token), "profile": response.json()}


@pytest_asyncio.fixture
async def counselor(client: AsyncClient) -> dict[str, Any]:
    token = await register(client, "counselor@example.com", role="counselor")
    return {"token": token, "headers": auth_header(token)}


@pytest.fixture
def minor_payload() -> dict[str, Any]:
    return {**ONBOARDING_PAYLOAD, "education_stage": "class_11_12", "grade_or_year": "Class 12"}


async def seed_user(db: AsyncSession, email: str, role: str = "student") -> User:
    user = User(
        email=email,
        hashed_password=hash_password("test-password-123"),
        role=role,
        full_name=email.split("@")[0].title(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def seed_profile(
    db: AsyncSession, user: User, **overrides: Any
) -> StudentProfile:
    defaults: dict[str, Any] = {
        "user_id": user.id,
        "education_stage": "early_college",
        "grade_or_year": "B.Sc Year 2",
        "current_stream": "Science (PCM)",
        "interests": [{"label": "puzzles", "riasec": "I", "strength": 5}],
        "aptitude_signals": {"mathematics": 4, "computers": 5},
        "work_style_preferences": {},
        "budget_tier": "moderate_up_to_2_lakhs",
        "relocation_willingness": "within_state",
        "preferred_languages": ["English"],
        "consent_type": "self_consent_adult",
        "academic_records_available": True,
        "profile_completeness_pct": 85,
    }
    defaults.update(overrides)
    profile = StudentProfile(**defaults)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def seed_guardian_context(
    db: AsyncSession, profile: StudentProfile, **overrides: Any
) -> GuardianContext:
    defaults: dict[str, Any] = {
        "student_id": profile.id,
        "guardian_name": "Parent",
        "relationship_to_student": "Mother",
        "guardian_priorities": ["affordable fees"],
        "relocation_restriction": "within_state",
    }
    defaults.update(overrides)
    context = GuardianContext(**defaults)
    db.add(context)
    await db.commit()
    await db.refresh(context)
    return context


__all__ = [
    "ONBOARDING_PAYLOAD",
    "auth_header",
    "make_career",
    "make_skill",
    "register",
    "seed_guardian_context",
    "seed_profile",
    "seed_user",
    "uuid",
]
