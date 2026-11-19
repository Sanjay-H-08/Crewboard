"""Projects API endpoints."""

from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_user_project_or_403, get_user_team_or_403
from app.db.session import get_db
from app.models.assessment import StudentAssessment
from app.models.project import Project
from app.models.task import Task
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.analytics import ProjectAnalyticsResponse
from app.schemas.assessment import StudentAssessmentResponse
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectResponse,
)
from app.services.activity_service import log_activity
from app.services.analytics_service import calculate_project_analytics

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a new project milestone under caller's team."""
    team = get_user_team_or_403(db, payload.team_id, current_user.id)

    project = Project(
        team_id=team.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        start_date=payload.start_date,
        deadline=payload.deadline,
        status=payload.status,
        created_by=current_user.id,
    )
    db.add(project)
    db.flush()

    # Log project creation event
    log_activity(
        db=db,
        project_id=project.id,
        user_id=current_user.id,
        action="project_created",
        new_value=project.name,
    )

    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectListResponse])
def list_projects(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    team_id: uuid.UUID | None = Query(None),
):
    """List projects for a specific team or across all user's teams."""
    if team_id:
        get_user_team_or_403(db, team_id, current_user)
        projects = db.query(Project).filter(Project.team_id == team_id).all()
    else:
        if current_user.system_role == "teacher":
            projects = (
                db.query(Project)
                .filter(
                    (Project.teacher_id == current_user.id)
                    | (Project.created_by == current_user.id)
                )
                .all()
            )
        else:
            # Retrieve teams current user belongs to
            user_team_ids = [
                tm.team_id
                for tm in db.query(TeamMember.team_id)
                .filter(TeamMember.user_id == current_user.id)
                .all()
            ]
            projects = (
                db.query(Project)
                .filter(
                    (Project.team_id.in_(user_team_ids))
                    | (Project.created_by == current_user.id)
                )
                .all()
            )

    results: list[ProjectListResponse] = []
    for proj in projects:
        team = db.query(Team).filter(Team.id == proj.team_id).first()
        tasks = db.query(Task).filter(Task.project_id == proj.id).all()
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == "done")

        results.append(
            ProjectListResponse(
                id=proj.id,
                team_id=proj.team_id,
                team_name=team.name if team else "Unknown Team",
                name=proj.name,
                description=proj.description,
                start_date=proj.start_date,
                deadline=proj.deadline,
                status=proj.status,
                created_by=proj.created_by,
                created_at=proj.created_at,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
            )
        )

    return results


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project_details(
    project_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get detailed project view with parent team name."""
    project = get_user_project_or_403(db, project_id, current_user.id)
    team = db.query(Team).filter(Team.id == project.team_id).first()

    return ProjectDetailResponse(
        id=project.id,
        team_id=project.team_id,
        team_name=team.name if team else "Unknown Team",
        name=project.name,
        description=project.description,
        start_date=project.start_date,
        deadline=project.deadline,
        status=project.status,
        created_by=project.created_by,
        created_at=project.created_at,
    )


@router.get("/{project_id}/analytics", response_model=ProjectAnalyticsResponse)
def get_project_analytics(
    project_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Compute real-time project metrics, completion %, and workload distribution."""
    project = get_user_project_or_403(db, project_id, current_user.id)
    return calculate_project_analytics(db, project)


@router.get("/{project_id}/my-assessment", response_model=StudentAssessmentResponse | None)
def get_my_project_assessment(
    project_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve authenticated student's own rubric assessment and teacher feedback for this project."""
    get_user_project_or_403(db, project_id, current_user.id)

    assessment_rec = (
        db.query(StudentAssessment)
        .filter(
            StudentAssessment.project_id == project_id,
            StudentAssessment.student_id == current_user.id,
        )
        .first()
    )
    if not assessment_rec:
        return None

    teacher = db.query(User).filter(User.id == assessment_rec.teacher_id).first()
    total_rubric = (
        assessment_rec.technical_score
        + assessment_rec.documentation_score
        + assessment_rec.collaboration_score
    )
    return StudentAssessmentResponse(
        id=assessment_rec.id,
        project_id=assessment_rec.project_id,
        student_id=assessment_rec.student_id,
        teacher_id=assessment_rec.teacher_id,
        teacher_name=teacher.full_name if teacher else "Supervising Teacher",
        technical_score=assessment_rec.technical_score,
        documentation_score=assessment_rec.documentation_score,
        collaboration_score=assessment_rec.collaboration_score,
        total_rubric_score=total_rubric,
        max_rubric_score=15,
        feedback=assessment_rec.feedback,
        created_at=assessment_rec.created_at,
        updated_at=assessment_rec.updated_at,
    )
