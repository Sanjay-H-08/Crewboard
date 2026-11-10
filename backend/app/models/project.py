"""Project database model."""

from datetime import datetime, timezone
import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.db.session import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=True)
    deadline = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_by = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    team = relationship("Team", back_populates="projects")
    creator = relationship("User", foreign_keys=[created_by])
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    activity_logs = relationship(
        "ActivityLog", back_populates="project", cascade="all, delete-orphan"
    )
