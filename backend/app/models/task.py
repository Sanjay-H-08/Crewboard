"""Task database model."""

from datetime import datetime, timezone
import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.db.session import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status = Column(String(20), nullable=False, default="todo", index=True)
    priority = Column(String(20), nullable=False, default="medium")
    deadline = Column(Date, nullable=True, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="tasks_assigned")
    creator = relationship("User", foreign_keys=[created_by])
    activity_logs = relationship("ActivityLog", back_populates="task")
