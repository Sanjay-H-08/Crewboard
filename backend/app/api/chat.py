"""Team group chat API endpoints."""

from datetime import datetime
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_user_team_or_403
from app.db.session import get_db
from app.models.chat import TeamMessage
from app.models.user import User
from app.schemas.chat import TeamMessageCreateRequest, TeamMessageResponse

router = APIRouter(tags=["Team Chat"])


@router.get("/teams/{team_id}/messages", response_model=list[TeamMessageResponse])
def list_team_messages(
    team_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    since: datetime | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
):
    """Retrieve chronological message feed for the team group chat, supporting delta polling via 'since'."""
    get_user_team_or_403(db, team_id, current_user)

    query = (
        db.query(
            TeamMessage.id,
            TeamMessage.team_id,
            TeamMessage.user_id,
            User.full_name.label("user_name"),
            TeamMessage.message,
            TeamMessage.created_at,
        )
        .join(User, User.id == TeamMessage.user_id)
        .filter(TeamMessage.team_id == team_id)
    )
    if since:
        query = query.filter(TeamMessage.created_at > since)

    rows = query.order_by(TeamMessage.created_at.asc()).limit(limit).all()

    return [
        TeamMessageResponse(
            id=r.id,
            team_id=r.team_id,
            user_id=r.user_id,
            user_name=r.user_name,
            message=r.message,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/teams/{team_id}/messages", response_model=TeamMessageResponse, status_code=status.HTTP_201_CREATED)
def post_team_message(
    team_id: uuid.UUID,
    payload: TeamMessageCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Post a new message to the team's shared group chat."""
    get_user_team_or_403(db, team_id, current_user)

    msg = TeamMessage(
        team_id=team_id,
        user_id=current_user.id,
        message=payload.message.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return TeamMessageResponse(
        id=msg.id,
        team_id=msg.team_id,
        user_id=msg.user_id,
        user_name=current_user.full_name,
        message=msg.message,
        created_at=msg.created_at,
    )

