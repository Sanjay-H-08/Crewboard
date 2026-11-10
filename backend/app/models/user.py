"""User database model."""

from datetime import datetime, timezone
import uuid

from sqlalchemy import Column, DateTime, String, Uuid
from sqlalchemy.orm import relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    teams_created = relationship("Team", back_populates="creator", foreign_keys="Team.created_by")
    team_memberships = relationship(
        "TeamMember", back_populates="user", cascade="all, delete-orphan"
    )
    tasks_assigned = relationship(
        "Task", back_populates="assignee", foreign_keys="Task.assigned_to"
    )
