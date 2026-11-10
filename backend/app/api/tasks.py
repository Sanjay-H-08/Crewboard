"""Tasks API endpoints."""

from datetime import date, datetime, timezone
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user,
    get_user_project_or_403,
    get_user_task_or_403,
    validate_assignee_in_project_team,
)
from app.db.session import get_db
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreateRequest, TaskResponse, TaskUpdateRequest
from app.services.activity_service import log_activity

router = APIRouter(tags=["Tasks"])


def build_task_response(db: Session, task: Task) -> TaskResponse:
    """Build enriched TaskResponse with names and overdue calculation."""
    assignee = db.query(User).filter(User.id == task.assigned_to).first() if task.assigned_to else None
    creator = db.query(User).filter(User.id == task.created_by).first() if task.created_by else None

    today = date.today()
    is_overdue = bool(task.status != "done" and task.deadline is not None and task.deadline < today)

    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        assignee_name=assignee.full_name if assignee else None,
        created_by=task.created_by,
        creator_name=creator.full_name if creator else "Unknown User",
        status=task.status,
        priority=task.priority,
        deadline=task.deadline,
        is_overdue=is_overdue,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a task within a project and log audit event."""
    project = get_user_project_or_403(db, payload.project_id, current_user.id)
    validate_assignee_in_project_team(db, project.team_id, payload.assigned_to)

    task = Task(
        project_id=project.id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        assigned_to=payload.assigned_to,
        created_by=current_user.id,
        status=payload.status,
        priority=payload.priority,
        deadline=payload.deadline,
    )
    db.add(task)
    db.flush()

    # Log task creation audit event
    log_activity(
        db=db,
        project_id=project.id,
        user_id=current_user.id,
        action="task_created",
        task_id=task.id,
        new_value=task.title,
    )

    # Log assignment if initially assigned
    if payload.assigned_to:
        assignee = db.query(User).filter(User.id == payload.assigned_to).first()
        log_activity(
            db=db,
            project_id=project.id,
            user_id=current_user.id,
            action="task_assigned",
            task_id=task.id,
            old_value=None,
            new_value=assignee.full_name if assignee else None,
        )

    db.commit()
    db.refresh(task)
    return build_task_response(db, task)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Partially update task details, status transitions, or member reassignment."""
    task = get_user_task_or_403(db, task_id, current_user.id)
    project = db.query(Project).filter(Project.id == task.project_id).first()
    assert project is not None

    update_data = payload.model_dump(exclude_unset=True)

    if "title" in update_data and update_data["title"] is not None:
        task.title = update_data["title"].strip()

    if "description" in update_data:
        desc = update_data["description"]
        task.description = desc.strip() if desc else None

    if "assigned_to" in update_data:
        new_assigned_to = update_data["assigned_to"]
        validate_assignee_in_project_team(db, project.team_id, new_assigned_to)
        if task.assigned_to != new_assigned_to:
            old_user = db.query(User).filter(User.id == task.assigned_to).first() if task.assigned_to else None
            new_user = db.query(User).filter(User.id == new_assigned_to).first() if new_assigned_to else None
            log_activity(
                db=db,
                project_id=project.id,
                user_id=current_user.id,
                action="task_assigned",
                task_id=task.id,
                old_value=old_user.full_name if old_user else None,
                new_value=new_user.full_name if new_user else None,
            )
            task.assigned_to = new_assigned_to

    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data["status"]
        if task.status != new_status:
            log_activity(
                db=db,
                project_id=project.id,
                user_id=current_user.id,
                action="status_changed",
                task_id=task.id,
                old_value=task.status,
                new_value=new_status,
            )
            task.status = new_status

    if "priority" in update_data and update_data["priority"] is not None:
        new_priority = update_data["priority"]
        if task.priority != new_priority:
            log_activity(
                db=db,
                project_id=project.id,
                user_id=current_user.id,
                action="priority_changed",
                task_id=task.id,
                old_value=task.priority,
                new_value=new_priority,
            )
            task.priority = new_priority

    if "deadline" in update_data:
        new_deadline = update_data["deadline"]
        if task.deadline != new_deadline:
            log_activity(
                db=db,
                project_id=project.id,
                user_id=current_user.id,
                action="deadline_changed",
                task_id=task.id,
                old_value=str(task.deadline) if task.deadline else None,
                new_value=str(new_deadline) if new_deadline else None,
            )
            task.deadline = new_deadline

    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return build_task_response(db, task)


@router.get("/projects/{project_id}/tasks", response_model=list[TaskResponse])
def list_project_tasks(
    project_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: str | None = Query(None),
    priority: str | None = Query(None),
    assigned_to: str | None = Query(None),
):
    """List project tasks with multi-criteria filtering for Kanban board."""
    project = get_user_project_or_403(db, project_id, current_user.id)

    query = db.query(Task).filter(Task.project_id == project.id)

    if status and status.lower() != "all":
        query = query.filter(Task.status == status.lower())

    if priority and priority.lower() != "all":
        query = query.filter(Task.priority == priority.lower())

    if assigned_to and assigned_to.lower() != "all":
        if assigned_to.lower() == "unassigned":
            query = query.filter(Task.assigned_to.is_(None))
        else:
            try:
                assigned_uuid = uuid.UUID(assigned_to)
                query = query.filter(Task.assigned_to == assigned_uuid)
            except ValueError:
                pass

    tasks = query.order_by(Task.created_at.asc()).all()
    return [build_task_response(db, t) for t in tasks]
