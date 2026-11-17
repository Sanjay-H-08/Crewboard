"""Academic collaboration, submissions, files, chat, and roles schema.

Revision ID: 0002_academic_collaboration
Revises: 0001_initial
Create Date: 2026-11-17 15:40:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002_academic_collaboration"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Users table: Add system_role
    op.add_column(
        "users",
        sa.Column("system_role", sa.String(length=20), server_default="student", nullable=False),
    )

    # 2. Projects table: Add teacher_id, original_deadline, make team_id nullable for course templates
    op.alter_column("projects", "team_id", nullable=True)
    op.add_column(
        "projects",
        sa.Column(
            "teacher_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "projects",
        sa.Column("original_deadline", sa.Date(), nullable=True),
    )
    op.create_index("ix_projects_teacher_id", "projects", ["teacher_id"])

    # 3. Tasks table: Add reviewer_id
    op.add_column(
        "tasks",
        sa.Column(
            "reviewer_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_tasks_reviewer_id", "tasks", ["reviewer_id"])

    # 4. Task Submissions table
    op.create_table(
        "task_submissions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "task_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "submitted_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="submitted", nullable=False),
        sa.Column(
            "reviewed_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("review_feedback", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("task_id", "version", name="uq_task_submission_version"),
    )
    op.create_index("ix_task_submissions_task_id", "task_submissions", ["task_id"])
    op.create_index("ix_task_submissions_submitted_by", "task_submissions", ["submitted_by"])
    op.create_index("ix_task_submissions_status", "task_submissions", ["status"])

    # 5. Submission Files table
    op.create_table(
        "submission_files",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "submission_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("task_submissions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_submission_files_submission_id", "submission_files", ["submission_id"])

    # 6. Team Messages (Chat) table
    op.create_table(
        "team_messages",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "team_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("teams.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_team_messages_team_id", "team_messages", ["team_id"])
    op.create_index(
        "ix_team_messages_team_created",
        "team_messages",
        ["team_id", "created_at"],
    )


def downgrade() -> None:
    # Verify unassigned template projects do not exist before attempting to enforce NOT NULL
    bind = op.get_bind()
    unassigned_count = bind.execute(
        sa.text("SELECT COUNT(*) FROM projects WHERE team_id IS NULL")
    ).scalar()
    if unassigned_count and unassigned_count > 0:
        raise RuntimeError(
            f"Cannot downgrade: {unassigned_count} unassigned project template(s) exist with NULL team_id. "
            "Reassign or resolve these templates manually before downgrading to preserve data integrity."
        )

    op.drop_table("team_messages")
    op.drop_table("submission_files")
    op.drop_table("task_submissions")
    op.drop_index("ix_tasks_reviewer_id", table_name="tasks")
    op.drop_column("tasks", "reviewer_id")
    op.drop_index("ix_projects_teacher_id", table_name="projects")
    op.drop_column("projects", "original_deadline")
    op.drop_column("projects", "teacher_id")
    op.alter_column("projects", "team_id", nullable=False)
    op.drop_column("users", "system_role")

