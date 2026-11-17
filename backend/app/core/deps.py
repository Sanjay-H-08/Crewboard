"""FastAPI dependencies and multi-tenant authorization guards."""

from typing import Annotated, Generator
import uuid

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.project import Project
from app.models.task import Task
from app.models.team import Team, TeamMember
from app.models.user import User

# HTTP Bearer scheme
security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    auth: Annotated[HTTPAuthorizationCredentials | None, Security(security_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Validate Bearer token and return the authenticated User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth or not auth.credentials:
        raise credentials_exception

    payload = decode_access_token(auth.credentials)
    if not payload:
        raise credentials_exception

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    return user


def get_current_teacher(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Verify that authenticated caller has the teacher role."""
    if current_user.system_role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Teacher privileges required.",
        )
    return current_user


def get_user_team_or_403(
    db: Session, team_id: uuid.UUID, current_user_or_id: User | uuid.UUID
) -> Team:
    """Verify that the team exists and that current_user is an active member or supervising teacher."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found.",
        )

    user_id = current_user_or_id.id if isinstance(current_user_or_id, User) else current_user_or_id
    is_teacher = isinstance(current_user_or_id, User) and current_user_or_id.system_role == "teacher"

    # Teachers can view teams that have projects assigned to them
    if is_teacher:
        supervised_project = (
            db.query(Project)
            .filter(Project.team_id == team_id, Project.teacher_id == user_id)
            .first()
        )
        if supervised_project:
            return team

    membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this team.",
        )

    return team


def get_user_project_or_403(
    db: Session, project_id: uuid.UUID, current_user_or_id: User | uuid.UUID
) -> Project:
    """Verify that project exists and caller belongs to its team or is the supervising teacher."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    user_id = current_user_or_id.id if isinstance(current_user_or_id, User) else current_user_or_id
    is_teacher = isinstance(current_user_or_id, User) and current_user_or_id.system_role == "teacher"

    if is_teacher and project.teacher_id == user_id:
        return project

    if project.team_id is None:
        # Unassigned project template can only be viewed by its creator/teacher
        if project.created_by == user_id or (is_teacher and project.teacher_id == user_id):
            return project
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this project.",
        )

    membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == project.team_id, TeamMember.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this project.",
        )

    return project


def get_user_task_or_403(
    db: Session, task_id: uuid.UUID, current_user_or_id: User | uuid.UUID
) -> Task:
    """Verify that task exists and caller belongs to its project's team or is the supervising teacher."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    get_user_project_or_403(db, task.project_id, current_user_or_id)
    return task


def get_team_membership_or_403(
    db: Session, team_id: uuid.UUID, user_id: uuid.UUID
) -> TeamMember:
    """Return verified membership record or raise 403."""
    membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team.",
        )
    return membership


def is_team_leader_or_reviewer(
    db: Session, team_id: uuid.UUID, user_id: uuid.UUID, task: Task | None = None
) -> bool:
    """Check if caller is the team owner/leader or the designated task reviewer."""
    if task and task.reviewer_id == user_id:
        return True
    membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        .first()
    )
    return bool(membership and membership.role in ("owner", "leader"))


def validate_assignee_in_project_team(
    db: Session, team_id: uuid.UUID | None, assignee_id: uuid.UUID | None
) -> None:
    """Validate that assignee belongs to the project's parent team."""
    if assignee_id is None or team_id is None:
        return

    membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team_id, TeamMember.user_id == assignee_id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user is not a member of this project's team.",
        )
