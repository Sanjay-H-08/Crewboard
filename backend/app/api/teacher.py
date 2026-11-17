"""Teacher Supervision and Academic Management API endpoints."""

import csv
from datetime import date, datetime, timezone
import io
from typing import Annotated, Literal
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_teacher
from app.db.session import get_db
from app.models.project import Project
from app.models.submission import TaskSubmission
from app.models.task import Task
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.project import (
    DeadlineExtensionRequest,
    ProjectAssignRequest,
    ProjectCreateRequest,
    ProjectResponse,
    TeacherProjectSummaryResponse,
)
from app.services.activity_service import log_activity

router = APIRouter(prefix="/teacher", tags=["Teacher Supervision"])


@router.get("/projects", response_model=list[TeacherProjectSummaryResponse])
def list_supervised_projects(
    db: Annotated[Session, Depends(get_db)],
    current_teacher: Annotated[User, Depends(get_current_teacher)],
):
    """Retrieve all academic projects supervised by the authenticated teacher with live completion stats."""
    projects = (
        db.query(Project)
        .filter((Project.teacher_id == current_teacher.id) | (Project.created_by == current_teacher.id))
        .order_by(Project.created_at.desc())
        .all()
    )

    today = date.today()
    summaries = []
    for proj in projects:
        team = db.query(Team).filter(Team.id == proj.team_id).first() if proj.team_id else None
        member_count = (
            db.query(TeamMember).filter(TeamMember.team_id == proj.team_id).count() if proj.team_id else 0
        )
        tasks = db.query(Task).filter(Task.project_id == proj.id).all()
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == "done")
        in_review_tasks = sum(1 for t in tasks if t.status == "submitted")
        overdue_tasks = sum(1 for t in tasks if t.status != "done" and t.deadline and t.deadline < today)

        completion_pct = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

        summaries.append(
            TeacherProjectSummaryResponse(
                id=proj.id,
                name=proj.name,
                description=proj.description,
                start_date=proj.start_date,
                deadline=proj.deadline,
                original_deadline=proj.original_deadline,
                status=proj.status,
                team_id=proj.team_id,
                team_name=team.name if team else "Unassigned",
                team_members_count=member_count,
                completion_percentage=completion_pct,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                in_review_tasks=in_review_tasks,
                overdue_tasks=overdue_tasks,
                created_at=proj.created_at,
            )
        )
    return summaries


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_academic_project(
    payload: ProjectCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_teacher: Annotated[User, Depends(get_current_teacher)],
):
    """Create a new academic project topic, optionally assigning to a team immediately."""
    if payload.team_id:
        team = db.query(Team).filter(Team.id == payload.team_id).first()
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target team not found.")

    project = Project(
        team_id=payload.team_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        start_date=payload.start_date,
        deadline=payload.deadline,
        original_deadline=payload.deadline,
        status=payload.status,
        teacher_id=current_teacher.id,
        created_by=current_teacher.id,
    )
    db.add(project)
    db.flush()

    log_activity(
        db=db,
        project_id=project.id,
        user_id=current_teacher.id,
        action="project_created",
        new_value=f"Academic Topic: {project.name}",
    )

    db.commit()
    db.refresh(project)
    return project


@router.post("/projects/{project_id}/assign", response_model=ProjectResponse)
def assign_project_to_team(
    project_id: uuid.UUID,
    payload: ProjectAssignRequest,
    db: Annotated[Session, Depends(get_db)],
    current_teacher: Annotated[User, Depends(get_current_teacher)],
):
    """Assign an academic project topic to a student team."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, (Project.teacher_id == current_teacher.id) | (Project.created_by == current_teacher.id))
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supervised project not found.")

    team = db.query(Team).filter(Team.id == payload.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target team not found.")

    old_team_id = str(project.team_id) if project.team_id else "Unassigned"
    project.team_id = team.id
    project.teacher_id = current_teacher.id

    log_activity(
        db=db,
        project_id=project.id,
        user_id=current_teacher.id,
        action="project_assigned",
        old_value=old_team_id,
        new_value=f"Assigned to {team.name}",
    )

    db.commit()
    db.refresh(project)
    return project


@router.post("/projects/{project_id}/extend-deadline", response_model=ProjectResponse)
def extend_project_deadline(
    project_id: uuid.UUID,
    payload: DeadlineExtensionRequest,
    db: Annotated[Session, Depends(get_db)],
    current_teacher: Annotated[User, Depends(get_current_teacher)],
):
    """Extend project overall deadline with mandatory recorded justification in audit trail."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, (Project.teacher_id == current_teacher.id) | (Project.created_by == current_teacher.id))
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supervised project not found.")

    if not project.original_deadline:
        project.original_deadline = project.deadline or payload.new_deadline

    old_deadline_str = str(project.deadline) if project.deadline else "No deadline"
    project.deadline = payload.new_deadline

    log_activity(
        db=db,
        project_id=project.id,
        user_id=current_teacher.id,
        action="deadline_extended",
        old_value=old_deadline_str,
        new_value=f"{payload.new_deadline} (Reason: {payload.reason})",
    )

    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}/export")
def export_project_report(
    project_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    format: Literal["json", "csv"] = Query("csv"),
):
    """Export comprehensive project progress, student task execution, and submission reports."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, (Project.teacher_id == current_teacher.id) | (Project.created_by == current_teacher.id))
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supervised project not found.")

    team = db.query(Team).filter(Team.id == project.team_id).first() if project.team_id else None
    tasks = db.query(Task).filter(Task.project_id == project.id).all()

    today = date.today()
    rows = []
    for task in tasks:
        assignee = db.query(User).filter(User.id == task.assigned_to).first() if task.assigned_to else None
        latest_sub = (
            db.query(TaskSubmission)
            .filter(TaskSubmission.task_id == task.id)
            .order_by(TaskSubmission.version.desc())
            .first()
        )
        is_overdue = bool(task.status != "done" and task.deadline and task.deadline < today)

        rows.append({
            "task_id": str(task.id),
            "project_name": project.name,
            "team_name": team.name if team else "Unassigned",
            "task_title": task.title,
            "status": task.status,
            "priority": task.priority,
            "assignee_name": assignee.full_name if assignee else "Unassigned",
            "assignee_email": assignee.email if assignee else "N/A",
            "deadline": str(task.deadline) if task.deadline else "None",
            "is_overdue": "Yes" if is_overdue else "No",
            "submission_version": latest_sub.version if latest_sub else "No submission",
            "submission_status": latest_sub.status if latest_sub else "N/A",
            "reviewer_feedback": latest_sub.review_feedback if (latest_sub and latest_sub.review_feedback) else "None",
        })

    if format == "csv":
        output = io.StringIO()
        fieldnames = [
            "task_id", "project_name", "team_name", "task_title", "status",
            "priority", "assignee_name", "assignee_email", "deadline",
            "is_overdue", "submission_version", "submission_status", "reviewer_feedback"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

        csv_content = output.getvalue()
        sanitized_filename = project.name.replace(" ", "_").lower()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{sanitized_filename}_report.csv"'},
        )

    return {
        "project_id": str(project.id),
        "project_name": project.name,
        "team_name": team.name if team else "Unassigned",
        "deadline": str(project.deadline) if project.deadline else None,
        "original_deadline": str(project.original_deadline) if project.original_deadline else None,
        "total_tasks": len(tasks),
        "tasks": rows,
    }

