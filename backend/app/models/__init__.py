"""ORM models for the 14 domain tables.

Importing this package registers every model on `Base.metadata`, which is what
Alembic autogenerate and the test fixtures rely on.
"""

from app.models.catalog import CareerLibrary, CareerSkill, MarketSnapshot, Scholarship
from app.models.chat import ChatInteraction
from app.models.escalation import CounselorEscalation
from app.models.profile import GuardianContext, StudentProfile
from app.models.recommendation import ParentSummary, Recommendation, RecommendationBatch
from app.models.roadmap import Roadmap, RoadmapMilestone
from app.models.user import User

__all__ = [
    "CareerLibrary",
    "CareerSkill",
    "ChatInteraction",
    "CounselorEscalation",
    "GuardianContext",
    "MarketSnapshot",
    "ParentSummary",
    "Recommendation",
    "RecommendationBatch",
    "Roadmap",
    "RoadmapMilestone",
    "Scholarship",
    "StudentProfile",
    "User",
]
