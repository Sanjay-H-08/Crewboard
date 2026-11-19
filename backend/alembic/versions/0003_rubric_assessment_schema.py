"""Rubric assessment schema for individual student evaluation within teams.

Revision ID: 0003_rubric_assessment
Revises: 0002_academic_collaboration
Create Date: 2026-11-19 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0003_rubric_assessment"
down_revision = "0002_academic_collaboration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "student_assessments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "teacher_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("technical_score", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("documentation_score", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("collaboration_score", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("project_id", "student_id", name="uq_project_student_assessment"),
    )
    op.create_index("ix_student_assessments_project_id", "student_assessments", ["project_id"])
    op.create_index("ix_student_assessments_student_id", "student_assessments", ["student_id"])
    op.create_index("ix_student_assessments_teacher_id", "student_assessments", ["teacher_id"])


def downgrade() -> None:
    op.drop_table("student_assessments")
