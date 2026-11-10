"""Activity audit logging service."""

import uuid

from sqlalchemy.orm import Session

from app.models.activity import ActivityLog


def log_activity(
    db: Session,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    action: str,
    task_id: uuid.UUID | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
) -> ActivityLog:
    """Record an immutable activity event in the database."""
    log_entry = ActivityLog(
        project_id=project_id,
        task_id=task_id,
        user_id=user_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(log_entry)
    db.flush()
    return log_entry
