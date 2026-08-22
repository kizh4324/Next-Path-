"""Initial schema: 14 domain tables

Generated from app.models against the PostgreSQL dialect and checked against
docs/architecture/database-schema.md.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-08-22
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('student', 'guardian', 'counselor', 'admin')", name="ck_users_role"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("idx_users_email", "users", ["email"])
    op.create_index("idx_users_role", "users", ["role"])

    op.create_table(
        "student_profiles",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("education_stage", sa.String(length=50), nullable=False),
        sa.Column("grade_or_year", sa.String(length=100), nullable=False),
        sa.Column("current_stream", sa.String(length=100), nullable=True),
        sa.Column("interests", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("aptitude_signals", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("work_style_preferences", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("budget_tier", sa.String(length=50), nullable=False),
        sa.Column("relocation_willingness", sa.String(length=50), nullable=False),
        sa.Column("preferred_languages", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("consent_type", sa.String(length=50), nullable=False),
        sa.Column("consent_given_by", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("consent_recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("academic_records_available", sa.Boolean(), nullable=False),
        sa.Column("profile_completeness_pct", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("budget_tier IN ('low_cost_only', 'moderate_up_to_2_lakhs', 'flexible_above_2_lakhs')", name="ck_student_profiles_budget"),
        sa.CheckConstraint("profile_completeness_pct BETWEEN 0 AND 100", name="ck_student_profiles_completeness"),
        sa.CheckConstraint("consent_type IN ('guardian_consent_minor', 'self_consent_adult')", name="ck_student_profiles_consent_type"),
        sa.CheckConstraint("relocation_willingness IN ('home_district_only', 'within_state', 'anywhere_in_india', 'abroad')", name="ck_student_profiles_relocation"),
        sa.CheckConstraint("education_stage IN ('class_8_10', 'class_11_12', 'early_college')", name="ck_student_profiles_stage"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["consent_given_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("idx_student_profiles_interests", "student_profiles", ["interests"], postgresql_using="gin")
    op.create_index("idx_student_profiles_stage", "student_profiles", ["education_stage"])
    op.create_index("idx_student_profiles_user", "student_profiles", ["user_id"])

    op.create_table(
        "guardian_contexts",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("guardian_name", sa.String(length=255), nullable=True),
        sa.Column("relationship_to_student", sa.String(length=100), nullable=False),
        sa.Column("guardian_priorities", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("financial_ceiling_inr", sa.Integer(), nullable=True),
        sa.Column("relocation_restriction", sa.String(length=50), nullable=False),
        sa.Column("notes_and_concerns", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("relocation_restriction IN ('home_district_only', 'within_state', 'anywhere_in_india', 'abroad')", name="ck_guardian_contexts_relocation"),
        sa.ForeignKeyConstraint(["student_id"], ["student_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_guardian_contexts_student", "guardian_contexts", ["student_id"])
    op.create_index("uq_guardian_student", "guardian_contexts", ["student_id", "relationship_to_student"], unique=True)

    op.create_table(
        "career_library",
        sa.Column("id", sa.String(length=100), nullable=False),
        sa.Column("onet_soc_code", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("cluster", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("work_reality_summary", sa.Text(), nullable=False),
        sa.Column("applicable_stages", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("job_zone", sa.Integer(), nullable=False),
        sa.Column("riasec_code", sa.String(length=10), nullable=False),
        sa.Column("riasec_scores", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("india_entry_routes", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("prerequisites", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("risks_and_tradeoffs", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("regional_caveats", sa.Text(), nullable=True),
        sa.Column("content_owner", sa.String(length=255), nullable=False),
        sa.Column("review_cycle_months", sa.Integer(), nullable=False),
        sa.Column("last_reviewed_date", sa.Date(), nullable=False),
        sa.Column("source_links", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("job_zone BETWEEN 1 AND 5", name="ck_career_library_job_zone"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_career_library_cluster", "career_library", ["cluster"])
    op.create_index("idx_career_library_riasec", "career_library", ["riasec_code"])
    op.create_index("idx_career_library_stages", "career_library", ["applicable_stages"], postgresql_using="gin")

    op.create_table(
        "career_skills",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("career_id", sa.String(length=100), nullable=False),
        sa.Column("skill_name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("free_learning_resource_name", sa.String(length=255), nullable=False),
        sa.Column("free_learning_resource_url", sa.Text(), nullable=False),
        sa.Column("paid_learning_resource_name", sa.String(length=255), nullable=True),
        sa.Column("paid_learning_resource_url", sa.Text(), nullable=True),
        sa.Column("commercial_disclosure", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("category IN ('essential', 'useful', 'optional')", name="ck_career_skills_category"),
        sa.ForeignKeyConstraint(["career_id"], ["career_library.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_career_skills_career", "career_skills", ["career_id"])
    op.create_index("idx_career_skills_category", "career_skills", ["category"])

    op.create_table(
        "scholarships",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("state", sa.String(length=100), nullable=False),
        sa.Column("sponsor_type", sa.String(length=50), nullable=False),
        sa.Column("target_category", sa.String(length=100), nullable=False),
        sa.Column("income_ceiling_inr", sa.Integer(), nullable=False),
        sa.Column("min_qualification", sa.String(length=100), nullable=False),
        sa.Column("amount_description", sa.Text(), nullable=False),
        sa.Column("eligibility_summary", sa.Text(), nullable=False),
        sa.Column("deadline_description", sa.String(length=255), nullable=False),
        sa.Column("required_documents", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("official_source_url", sa.Text(), nullable=False),
        sa.Column("last_verified_date", sa.Date(), nullable=False),
        sa.Column("renewal_conditions", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("sponsor_type IN ('Government', 'Private', 'Institutional')", name="ck_scholarships_sponsor_type"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_scholarships_category", "scholarships", ["target_category"])
    op.create_index("idx_scholarships_income", "scholarships", ["income_ceiling_inr"])
    op.create_index("idx_scholarships_qualification", "scholarships", ["min_qualification"])
    op.create_index("idx_scholarships_state", "scholarships", ["state"])

    op.create_table(
        "market_snapshots",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("career_id", sa.String(length=100), nullable=False),
        sa.Column("geography", sa.String(length=255), nullable=False),
        sa.Column("timeframe_period", sa.String(length=255), nullable=False),
        sa.Column("data_source", sa.String(length=255), nullable=False),
        sa.Column("demand_indicator", sa.String(length=50), nullable=False),
        sa.Column("salary_range_entry_inr", sa.String(length=100), nullable=False),
        sa.Column("salary_range_mid_inr", sa.String(length=100), nullable=False),
        sa.Column("top_demanded_skills", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("top_hiring_locations", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("experience_distribution", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("competition_caveat", sa.Text(), nullable=False),
        sa.Column("uncertainty_statement", sa.Text(), nullable=False),
        sa.Column("last_updated_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("demand_indicator IN ('High', 'Moderate', 'Emerging', 'Stable', 'Niche')", name="ck_market_snapshots_demand"),
        sa.ForeignKeyConstraint(["career_id"], ["career_library.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_market_snapshots_career", "market_snapshots", ["career_id"])
    op.create_index("idx_market_snapshots_skills", "market_snapshots", ["top_demanded_skills"], postgresql_using="gin")

    op.create_table(
        "recommendation_batches",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("batch_number", sa.Integer(), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["student_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_rec_batches_student_current", "recommendation_batches", ["student_id", "is_current"])

    op.create_table(
        "recommendations",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("batch_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("career_id", sa.String(length=100), nullable=False),
        sa.Column("career_title", sa.String(length=255), nullable=False),
        sa.Column("rank_position", sa.Integer(), nullable=False),
        sa.Column("composite_score", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("fit_score", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("feasibility_score", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("evidence_quality_score", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("fit_label", sa.String(length=50), nullable=False),
        sa.Column("feasibility_label", sa.String(length=50), nullable=False),
        sa.Column("evidence_quality_label", sa.String(length=50), nullable=False),
        sa.Column("reasons", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("concerns", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("missing_evidence_flags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_primary_selection", sa.Boolean(), nullable=False),
        sa.Column("is_backup_selection", sa.Boolean(), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("composite_score BETWEEN 0.0 AND 100.0", name="ck_recommendations_composite"),
        sa.CheckConstraint("evidence_quality_score BETWEEN 0.0 AND 100.0", name="ck_recommendations_evidence"),
        sa.CheckConstraint("evidence_quality_label IN ('High', 'Moderate', 'Preliminary', 'Sparse')", name="ck_recommendations_evidence_label"),
        sa.CheckConstraint("feasibility_score BETWEEN 0.0 AND 100.0", name="ck_recommendations_feasibility"),
        sa.CheckConstraint("feasibility_label IN ('High', 'Moderate', 'Challenging', 'Low')", name="ck_recommendations_feasibility_label"),
        sa.CheckConstraint("fit_score BETWEEN 0.0 AND 100.0", name="ck_recommendations_fit"),
        sa.CheckConstraint("fit_label IN ('Strong', 'Moderate', 'Emerging', 'Insufficient evidence')", name="ck_recommendations_fit_label"),
        sa.CheckConstraint("rank_position BETWEEN 1 AND 5", name="ck_recommendations_rank"),
        sa.ForeignKeyConstraint(["career_id"], ["career_library.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["student_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["batch_id"], ["recommendation_batches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_recommendations_batch", "recommendations", ["batch_id"])
    op.create_index("idx_recommendations_career", "recommendations", ["career_id"])
    op.create_index("idx_recommendations_student_current", "recommendations", ["student_id", "is_current"])

    op.create_table(
        "roadmaps",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("primary_career_id", sa.String(length=100), nullable=False),
        sa.Column("backup_career_id", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('active', 'paused', 'completed', 'reassessing')", name="ck_roadmaps_status"),
        sa.ForeignKeyConstraint(["primary_career_id"], ["career_library.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["student_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["backup_career_id"], ["career_library.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_roadmaps_student_current", "roadmaps", ["student_id", "is_current"])

    op.create_table(
        "roadmap_milestones",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("roadmap_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("timeframe_bucket", sa.String(length=50), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("milestone_type", sa.String(length=50), nullable=False),
        sa.Column("prerequisites", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("estimated_cost_inr", sa.Integer(), nullable=False),
        sa.Column("is_low_cost_or_free", sa.Boolean(), nullable=False),
        sa.Column("free_resource_url", sa.Text(), nullable=True),
        sa.Column("completion_evidence_type", sa.String(length=50), nullable=False),
        sa.Column("completion_evidence_note_or_url", sa.Text(), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fallback_action", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("timeframe_bucket IN ('next_7_days', 'day_30', 'day_90', 'day_180')", name="ck_roadmap_milestones_bucket"),
        sa.CheckConstraint("completion_evidence_type IN ('self_report', 'project_artifact', 'quiz_score', 'mentor_confirmation')", name="ck_roadmap_milestones_evidence_type"),
        sa.CheckConstraint("milestone_type IN ('exploration', 'foundational_learning', 'skill_check', 'exam_prep', 'project_output', 'scholarship_application', 'reassessment')", name="ck_roadmap_milestones_type"),
        sa.ForeignKeyConstraint(["roadmap_id"], ["roadmaps.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_roadmap_milestones_bucket", "roadmap_milestones", ["timeframe_bucket"])
    op.create_index("idx_roadmap_milestones_roadmap", "roadmap_milestones", ["roadmap_id"])

    op.create_table(
        "parent_summaries",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("recommendation_batch_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["student_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recommendation_batch_id"], ["recommendation_batches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_parent_summaries_batch", "parent_summaries", ["recommendation_batch_id"])
    op.create_index("idx_parent_summaries_student", "parent_summaries", ["student_id"])

    op.create_table(
        "chat_interactions",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("career_ids_injected", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=False),
        sa.Column("was_escalated", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["student_profiles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_chat_interactions_created", "chat_interactions", ["created_at"])
    op.create_index("idx_chat_interactions_escalated", "chat_interactions", ["was_escalated"])
    op.create_index("idx_chat_interactions_student", "chat_interactions", ["student_id"])

    op.create_table(
        "counselor_escalations",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("trigger_reason", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("student_summary_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("counselor_user_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("counselor_notes", sa.Text(), nullable=True),
        sa.Column("counselor_override_decision", sa.Text(), nullable=True),
        sa.Column("counselor_override_rationale", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'under_review', 'session_scheduled', 'resolved', 'overridden')", name="ck_escalations_status"),
        sa.CheckConstraint("trigger_reason IN ('high_stakes_choice', 'severe_constraint_conflict', 'student_parent_deadlock', 'low_evidence_profile', 'student_requested', 'crisis_safety_flag')", name="ck_escalations_trigger"),
        sa.ForeignKeyConstraint(["student_id"], ["student_profiles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["counselor_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_escalations_status", "counselor_escalations", ["status"])
    op.create_index("idx_escalations_student", "counselor_escalations", ["student_id"])
    op.create_index("idx_escalations_trigger", "counselor_escalations", ["trigger_reason"])


def downgrade() -> None:
    op.drop_table("counselor_escalations")
    op.drop_table("chat_interactions")
    op.drop_table("parent_summaries")
    op.drop_table("roadmap_milestones")
    op.drop_table("roadmaps")
    op.drop_table("recommendations")
    op.drop_table("recommendation_batches")
    op.drop_table("market_snapshots")
    op.drop_table("scholarships")
    op.drop_table("career_skills")
    op.drop_table("career_library")
    op.drop_table("guardian_contexts")
    op.drop_table("student_profiles")
    op.drop_table("users")
