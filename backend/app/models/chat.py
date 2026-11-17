"""Team group chat database models."""

from datetime import datetime, timezone
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, Text, Uuid
from sqlalchemy.orm import relationship

from app.db.session import Base


class TeamMessage(Base):
    __tablename__ = "team_messages"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    __table_args__ = (
        Index("ix_team_messages_team_created", "team_id", "created_at"),
    )

    # Relationships
    team = relationship("Team")
    user = relationship("User")

