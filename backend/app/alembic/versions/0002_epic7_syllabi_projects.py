"""Epic 7: syllabi, project ideas, submissions, and career trajectories

Generated from app.models against the PostgreSQL dialect. The models and the schema
doc described these four tables but no migration created them, so `alembic upgrade
head` produced a database the application could not use.

Revision ID: 0002_epic7_syllabi_projects
Revises: 0001_initial_schema
Create Date: 2026-08-23
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_epic7_syllabi_projects"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "career_topic_syllabi",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("career_id", sa.String(length=100), nullable=False),
        sa.Column("phase_number", sa.Integer(), nullable=False),
        sa.Column("phase_title", sa.String(length=100), nullable=False),
        sa.Column("topic_title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("key_concepts", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("free_resource_name", sa.String(length=100), nullable=False),
        sa.Column("free_resource_url", sa.String(length=500), nullable=False),
        sa.Column("estimated_hours", sa.Integer(), nullable=False),
        sa.Column("is_optional", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("phase_number BETWEEN 1 AND 5", name="ck_syllabi_phase_number"),
        sa.ForeignKeyConstraint(["career_id"], ["career_library.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_syllabi_career_phase", "career_topic_syllabi", ["career_id", "phase_number"])

    op.create_table(
        "skill_project_ideas",
        sa.Column("id", sa.String(length=100), nullable=False),
        sa.Column("career_id", sa.String(length=100), nullable=False),
        sa.Column("difficulty", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("tag", sa.String(length=50), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("requirements", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("skills_exercised", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("constraints", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("example_input_output", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("difficulty IN ('beginner', 'intermediate', 'advanced')", name="ck_project_ideas_difficulty"),
        sa.ForeignKeyConstraint(["career_id"], ["career_library.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_projects_career_diff", "skill_project_ideas", ["career_id", "difficulty"])

    op.create_table(
        "project_submissions",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("project_id", sa.String(length=100), nullable=False),
        sa.Column("repository_or_live_url", sa.String(length=500), nullable=False),
        sa.Column("reflection_notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["skill_project_ideas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["student_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_project_sub_project", "project_submissions", ["project_id"])
    op.create_index("idx_project_sub_student", "project_submissions", ["student_id"])

    op.create_table(
        "career_trajectories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_career_id", sa.String(length=100), nullable=False),
        sa.Column("target_career_title", sa.String(length=150), nullable=False),
        sa.Column("trajectory_type", sa.String(length=30), nullable=False),
        sa.Column("typical_years_experience", sa.String(length=50), nullable=False),
        sa.Column("expected_salary_delta_inr", sa.String(length=100), nullable=False),
        sa.Column("required_delta_skills", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("transferable_skills_pct", sa.Integer(), nullable=False),
        sa.Column("overview", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("trajectory_type IN ('vertical_advancement', 'lateral_transition', 'specialization')", name="ck_trajectories_type"),
        sa.ForeignKeyConstraint(["source_career_id"], ["career_library.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_trajectories_source", "career_trajectories", ["source_career_id"])


def downgrade() -> None:
    op.drop_table("career_trajectories")
    op.drop_table("project_submissions")
    op.drop_table("skill_project_ideas")
    op.drop_table("career_topic_syllabi")
