"""Teams API endpoints."""

import secrets
import string
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_user_team_or_403
from app.db.session import get_db
from app.models.activity import ActivityLog
from app.models.project import Project
from app.models.task import Task
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.analytics import ActivityLogResponse
from app.schemas.team import (
    TeamCreateRequest,
    TeamDetailResponse,
    TeamJoinRequest,
    TeamJoinResponse,
    TeamMemberResponse,
    TeamResponse,
)

router = APIRouter(prefix="/teams", tags=["Teams"])


def generate_unique_join_code(db: Session) -> str:
    """Generate a unique 6-8 character uppercase alphanumeric join code (e.g., CREW-9482)."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(20):
        suffix = "".join(secrets.choice(chars) for _ in range(4))
        code = f"CREW-{suffix}"
        exists = db.query(Team).filter(Team.join_code == code).first()
        if not exists:
            return code
    # Fallback to 8 random alphanumeric characters
    return "".join(secrets.choice(chars) for _ in range(8))


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a new team, generate join code, and set caller as owner."""
    join_code = generate_unique_join_code(db)
    team = Team(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        join_code=join_code,
        created_by=current_user.id,
    )
    db.add(team)
    db.flush()

    # Add caller as team owner
    owner_membership = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(owner_membership)
    db.commit()
    db.refresh(team)

    return TeamResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        join_code=team.join_code,
        created_by=team.created_by,
        created_at=team.created_at,
        role="owner",
        member_count=1,
    )


@router.get("", response_model=list[TeamResponse])
def list_my_teams(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve all teams in which the current user is an active member."""
    memberships = db.query(TeamMember).filter(TeamMember.user_id == current_user.id).all()
    results = []
    for m in memberships:
        team = db.query(Team).filter(Team.id == m.team_id).first()
        if not team:
            continue
        count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
        results.append(
            TeamResponse(
                id=team.id,
                name=team.name,
                description=team.description,
                join_code=team.join_code,
                created_by=team.created_by,
                created_at=team.created_at,
                role=m.role,
                member_count=count,
            )
        )
    return results


@router.post("/join", response_model=TeamJoinResponse)
def join_team(
    payload: TeamJoinRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Join an existing team using its unique join code."""
    normalized_code = payload.join_code.strip().upper()
    team = db.query(Team).filter(Team.join_code == normalized_code).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team with this join code does not exist.",
        )

    existing_member = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team.id, TeamMember.user_id == current_user.id)
        .first()
    )
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already a member of this team.",
        )

    new_member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="member",
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return TeamJoinResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        role=new_member.role,
        joined_at=new_member.joined_at,
    )


@router.get("/{team_id}", response_model=TeamDetailResponse)
def get_team_details(
    team_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return team details with verified member profiles and caller role."""
    team = get_user_team_or_403(db, team_id, current_user.id)

    # Fetch memberships with user info
    memberships = (
        db.query(TeamMember, User)
        .join(User, User.id == TeamMember.user_id)
        .filter(TeamMember.team_id == team.id)
        .all()
    )

    current_user_role = "member"
    member_responses: list[TeamMemberResponse] = []
    for tm, user in memberships:
        if user.id == current_user.id:
            current_user_role = tm.role
        member_responses.append(
            TeamMemberResponse(
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                role=tm.role,
                joined_at=tm.joined_at,
            )
        )

    return TeamDetailResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        join_code=team.join_code,
        created_by=team.created_by,
        created_at=team.created_at,
        current_user_role=current_user_role,
        members=member_responses,
    )


@router.get("/{team_id}/activity", response_model=list[ActivityLogResponse])
def get_team_activity(
    team_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    project_id: uuid.UUID | None = Query(None),
    limit: int = Query(30, ge=1, le=100),
):
    """Retrieve chronological audit feed of actions occurring in the team's projects."""
    team = get_user_team_or_403(db, team_id, current_user.id)

    query = (
        db.query(ActivityLog)
        .join(Project, Project.id == ActivityLog.project_id)
        .filter(Project.team_id == team.id)
    )

    if project_id:
        # Validate project belongs to team
        project = db.query(Project).filter(Project.id == project_id, Project.team_id == team.id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found in this team.",
            )
        query = query.filter(ActivityLog.project_id == project_id)

    logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()

    # Enrich responses with project name, task title, user name
    results: list[ActivityLogResponse] = []
    for log in logs:
        proj = db.query(Project).filter(Project.id == log.project_id).first()
        task = db.query(Task).filter(Task.id == log.task_id).first() if log.task_id else None
        user = db.query(User).filter(User.id == log.user_id).first()

        results.append(
            ActivityLogResponse(
                id=log.id,
                project_id=log.project_id,
                project_name=proj.name if proj else None,
                task_id=log.task_id,
                task_title=task.title if task else None,
                user_id=log.user_id,
                user_name=user.full_name if user else "Unknown User",
                action=log.action,
                old_value=log.old_value,
                new_value=log.new_value,
                created_at=log.created_at,
            )
        )

    return results
