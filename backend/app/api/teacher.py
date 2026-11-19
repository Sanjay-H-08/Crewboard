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
from app.models.assessment import StudentAssessment
from app.models.project import Project
from app.models.submission import SubmissionFile, TaskSubmission
from app.models.task import Task
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.assessment import (
    StudentAssessmentCreateRequest,
    StudentAssessmentResponse,
    StudentContributionSummary,
    SubmissionFileSummary,
    TeacherSubmissionOverviewResponse,
    TeamContributionOverviewResponse,
)
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

    # 1. Build Task Deliverable Audit Rows
    today = date.today()
    task_rows = []
    for task in tasks:
        assignee = db.query(User).filter(User.id == task.assigned_to).first() if task.assigned_to else None
        latest_sub = (
            db.query(TaskSubmission)
            .filter(TaskSubmission.task_id == task.id)
            .order_by(TaskSubmission.version.desc())
            .first()
        )
        is_overdue = bool(task.status != "done" and task.deadline and task.deadline < today)

        task_rows.append({
            "Task ID": str(task.id),
            "Task Title": task.title,
            "Status": task.status,
            "Priority": task.priority,
            "Assignee Name": assignee.full_name if assignee else "Unassigned",
            "Assignee Email": assignee.email if assignee else "N/A",
            "Deadline": str(task.deadline) if task.deadline else "None",
            "Overdue": "Yes" if is_overdue else "No",
            "Submission Version": latest_sub.version if latest_sub else "No submission",
            "Submission Status": latest_sub.status if latest_sub else "N/A",
            "Reviewer Feedback": latest_sub.review_feedback if (latest_sub and latest_sub.review_feedback) else "None",
        })

    # 2. Build Student Contribution & Rubric Assessment Rows
    student_rows = []
    if project.team_id:
        memberships = (
            db.query(TeamMember, User)
            .join(User, User.id == TeamMember.user_id)
            .filter(TeamMember.team_id == project.team_id)
            .all()
        )

        for tm, student in memberships:
            student_tasks = [t for t in tasks if t.assigned_to == student.id]
            assigned_count = len(student_tasks)
            completed_count = sum(1 for t in student_tasks if t.status == "done")
            completion_pct = round((completed_count / assigned_count * 100), 1) if assigned_count > 0 else 0.0

            student_task_ids = [t.id for t in student_tasks]
            submissions = (
                db.query(TaskSubmission)
                .filter(TaskSubmission.task_id.in_(student_task_ids), TaskSubmission.submitted_by == student.id)
                .all()
                if student_task_ids
                else []
            )

            submission_ids = [s.id for s in submissions]
            files_count = (
                db.query(SubmissionFile).filter(SubmissionFile.submission_id.in_(submission_ids)).count()
                if submission_ids
                else 0
            )

            revision_cycles = sum(1 for s in submissions if s.version > 1)
            first_pass = sum(1 for s in submissions if s.version == 1 and s.status == "approved")

            on_time = 0
            for t in student_tasks:
                if t.status == "done" and t.deadline:
                    finished_at = t.updated_at.date() if t.updated_at else today
                    if finished_at <= t.deadline:
                        on_time += 1

            peer_reviews = (
                db.query(TaskSubmission)
                .filter(
                    TaskSubmission.task_id.in_([t.id for t in tasks]),
                    TaskSubmission.reviewed_by == student.id,
                    TaskSubmission.submitted_by != student.id,
                )
                .count()
            )

            assessment_rec = (
                db.query(StudentAssessment)
                .filter(
                    StudentAssessment.project_id == project.id,
                    StudentAssessment.student_id == student.id,
                )
                .first()
            )

            eval_status = "Evaluated" if assessment_rec else "Pending Evaluation"
            tech_score = assessment_rec.technical_score if assessment_rec else "N/A"
            doc_score = assessment_rec.documentation_score if assessment_rec else "N/A"
            collab_score = assessment_rec.collaboration_score if assessment_rec else "N/A"
            total_rubric = (
                (assessment_rec.technical_score + assessment_rec.documentation_score + assessment_rec.collaboration_score)
                if assessment_rec
                else "N/A"
            )
            feedback_text = assessment_rec.feedback if (assessment_rec and assessment_rec.feedback) else "None"
            evaluated_date = assessment_rec.updated_at.strftime("%Y-%m-%d") if assessment_rec else "N/A"

            student_rows.append({
                "Project Name": project.name,
                "Team Name": team.name if team else "Unassigned",
                "Student Name": student.full_name,
                "Student Email": student.email,
                "Team Role": tm.role,
                "Tasks Assigned": assigned_count,
                "Tasks Completed": completed_count,
                "Completion Rate (%)": completion_pct,
                "Files Submitted": files_count,
                "Revision Cycles": revision_cycles,
                "First-Pass Approvals": first_pass,
                "Punctual Tasks": on_time,
                "Peer Reviews Conducted": peer_reviews,
                "Assessment Status": eval_status,
                "Technical Score (1-5)": tech_score,
                "Documentation Score (1-5)": doc_score,
                "Collaboration Score (1-5)": collab_score,
                "Total Rubric Score (/15)": total_rubric,
                "Teacher Feedback": feedback_text,
                "Evaluated Date": evaluated_date,
                "Evaluator Teacher": current_teacher.full_name,
            })

    if format == "csv":
        output = io.StringIO()
        student_fieldnames = [
            "Project Name", "Team Name", "Student Name", "Student Email", "Team Role",
            "Tasks Assigned", "Tasks Completed", "Completion Rate (%)", "Files Submitted",
            "Revision Cycles", "First-Pass Approvals", "Punctual Tasks", "Peer Reviews Conducted",
            "Assessment Status", "Technical Score (1-5)", "Documentation Score (1-5)",
            "Collaboration Score (1-5)", "Total Rubric Score (/15)", "Teacher Feedback",
            "Evaluated Date", "Evaluator Teacher",
        ]

        task_fieldnames = [
            "Task ID", "Task Title", "Status", "Priority", "Assignee Name",
            "Assignee Email", "Deadline", "Overdue", "Submission Version",
            "Submission Status", "Reviewer Feedback",
        ]

        if student_rows:
            student_writer = csv.DictWriter(output, fieldnames=student_fieldnames)
            student_writer.writeheader()
            student_writer.writerows(student_rows)
            output.write("\n")

        task_writer = csv.DictWriter(output, fieldnames=task_fieldnames)
        task_writer.writeheader()
        task_writer.writerows(task_rows)

        csv_content = output.getvalue()
        sanitized_filename = project.name.replace(" ", "_").lower()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{sanitized_filename}_academic_report.csv"'},
        )

    return {
        "project_id": str(project.id),
        "project_name": project.name,
        "team_name": team.name if team else "Unassigned",
        "deadline": str(project.deadline) if project.deadline else None,
        "original_deadline": str(project.original_deadline) if project.original_deadline else None,
        "total_tasks": len(tasks),
        "students": student_rows,
        "tasks": task_rows,
    }


@router.get("/projects/{project_id}/contributions", response_model=TeamContributionOverviewResponse)
def get_project_team_contributions(
    project_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_teacher: Annotated[User, Depends(get_current_teacher)],
):
    """Retrieve verified individual contribution evidence and rubric assessment status for all students in a team project."""
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            (Project.teacher_id == current_teacher.id) | (Project.created_by == current_teacher.id),
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supervised project not found.")

    team = db.query(Team).filter(Team.id == project.team_id).first() if project.team_id else None
    tasks = db.query(Task).filter(Task.project_id == project.id).all()
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "done")
    completion_pct = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    students_summary: list[StudentContributionSummary] = []

    if project.team_id:
        memberships = (
            db.query(TeamMember, User)
            .join(User, User.id == TeamMember.user_id)
            .filter(TeamMember.team_id == project.team_id)
            .all()
        )

        today = date.today()
        for tm, student in memberships:
            # Tasks assigned to this student in this project
            student_tasks = [t for t in tasks if t.assigned_to == student.id]
            assigned_count = len(student_tasks)
            student_completed = sum(1 for t in student_tasks if t.status == "done")

            # Files submitted by this student on this project
            student_task_ids = [t.id for t in student_tasks]
            submissions = (
                db.query(TaskSubmission)
                .filter(TaskSubmission.task_id.in_(student_task_ids), TaskSubmission.submitted_by == student.id)
                .all()
                if student_task_ids
                else []
            )

            submission_ids = [s.id for s in submissions]
            files_count = (
                db.query(SubmissionFile).filter(SubmissionFile.submission_id.in_(submission_ids)).count()
                if submission_ids
                else 0
            )

            # Revision cycles (submissions with version > 1)
            revision_cycles = sum(1 for s in submissions if s.version > 1)

            # First-pass approvals
            first_pass = sum(1 for s in submissions if s.version == 1 and s.status == "approved")

            # On-time completions
            on_time = 0
            for t in student_tasks:
                if t.status == "done" and t.deadline:
                    finished_at = t.updated_at.date() if t.updated_at else today
                    if finished_at <= t.deadline:
                        on_time += 1

            # Peer reviews conducted by this student on this project
            peer_reviews = (
                db.query(TaskSubmission)
                .filter(
                    TaskSubmission.task_id.in_([t.id for t in tasks]),
                    TaskSubmission.reviewed_by == student.id,
                    TaskSubmission.submitted_by != student.id,
                )
                .count()
            )

            # Fetch existing assessment record if any
            assessment_rec = (
                db.query(StudentAssessment)
                .filter(
                    StudentAssessment.project_id == project.id,
                    StudentAssessment.student_id == student.id,
                )
                .first()
            )

            assessment_resp = None
            if assessment_rec:
                total_rubric = (
                    assessment_rec.technical_score
                    + assessment_rec.documentation_score
                    + assessment_rec.collaboration_score
                )
                assessment_resp = StudentAssessmentResponse(
                    id=assessment_rec.id,
                    project_id=assessment_rec.project_id,
                    student_id=assessment_rec.student_id,
                    teacher_id=assessment_rec.teacher_id,
                    teacher_name=current_teacher.full_name,
                    technical_score=assessment_rec.technical_score,
                    documentation_score=assessment_rec.documentation_score,
                    collaboration_score=assessment_rec.collaboration_score,
                    total_rubric_score=total_rubric,
                    max_rubric_score=15,
                    feedback=assessment_rec.feedback,
                    created_at=assessment_rec.created_at,
                    updated_at=assessment_rec.updated_at,
                )

            students_summary.append(
                StudentContributionSummary(
                    user_id=student.id,
                    full_name=student.full_name,
                    email=student.email,
                    role=tm.role,
                    assigned_tasks_count=assigned_count,
                    completed_tasks_count=student_completed,
                    submitted_files_count=files_count,
                    revision_cycles_count=revision_cycles,
                    first_pass_count=first_pass,
                    on_time_count=on_time,
                    peer_reviews_conducted=peer_reviews,
                    assessment=assessment_resp,
                )
            )

    return TeamContributionOverviewResponse(
        project_id=project.id,
        project_name=project.name,
        team_id=project.team_id,
        team_name=team.name if team else "Unassigned",
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_percentage=completion_pct,
        students=students_summary,
    )


@router.post(
    "/projects/{project_id}/assessments/{student_id}",
    response_model=StudentAssessmentResponse,
    status_code=status.HTTP_200_OK,
)
def save_student_rubric_assessment(
    project_id: uuid.UUID,
    student_id: uuid.UUID,
    payload: StudentAssessmentCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_teacher: Annotated[User, Depends(get_current_teacher)],
):
    """Save or update individual rubric scoring and written qualitative feedback for a student in a team assignment."""
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            (Project.teacher_id == current_teacher.id) | (Project.created_by == current_teacher.id),
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supervised project not found.")

    if not project.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assess a student on an unassigned project template.",
        )

    # Validate that student belongs to project's team
    membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == project.team_id, TeamMember.user_id == student_id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target student is not a member of this project's team.",
        )

    # Upsert assessment
    assessment = (
        db.query(StudentAssessment)
        .filter(StudentAssessment.project_id == project.id, StudentAssessment.student_id == student_id)
        .first()
    )

    now = datetime.now(timezone.utc)
    if assessment:
        assessment.technical_score = payload.technical_score
        assessment.documentation_score = payload.documentation_score
        assessment.collaboration_score = payload.collaboration_score
        assessment.feedback = payload.feedback.strip() if payload.feedback else None
        assessment.teacher_id = current_teacher.id
        assessment.updated_at = now
    else:
        assessment = StudentAssessment(
            project_id=project.id,
            student_id=student_id,
            teacher_id=current_teacher.id,
            technical_score=payload.technical_score,
            documentation_score=payload.documentation_score,
            collaboration_score=payload.collaboration_score,
            feedback=payload.feedback.strip() if payload.feedback else None,
            created_at=now,
            updated_at=now,
        )
        db.add(assessment)

    db.commit()
    db.refresh(assessment)

    total_rubric = (
        assessment.technical_score + assessment.documentation_score + assessment.collaboration_score
    )

    return StudentAssessmentResponse(
        id=assessment.id,
        project_id=assessment.project_id,
        student_id=assessment.student_id,
        teacher_id=assessment.teacher_id,
        teacher_name=current_teacher.full_name,
        technical_score=assessment.technical_score,
        documentation_score=assessment.documentation_score,
        collaboration_score=assessment.collaboration_score,
        total_rubric_score=total_rubric,
        max_rubric_score=15,
        feedback=assessment.feedback,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
    )


@router.get("/submissions", response_model=list[TeacherSubmissionOverviewResponse])
def list_supervised_submissions(
    db: Annotated[Session, Depends(get_db)],
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    project_id: uuid.UUID | None = Query(None, description="Filter by supervised project ID"),
    team_id: uuid.UUID | None = Query(None, description="Filter by team ID"),
    status: str | None = Query(None, description="Filter by submission status"),
    student_id: uuid.UUID | None = Query(None, description="Filter by submitter student ID"),
):
    """Retrieve all student deliverables and submissions across supervised projects with authorization checks."""
    supervised_projects_query = db.query(Project).filter(
        (Project.teacher_id == current_teacher.id) | (Project.created_by == current_teacher.id)
    )
    if project_id:
        supervised_projects_query = supervised_projects_query.filter(Project.id == project_id)

    supervised_projects = supervised_projects_query.all()
    if not supervised_projects:
        return []

    project_map = {p.id: p for p in supervised_projects}
    project_ids = list(project_map.keys())

    tasks = db.query(Task).filter(Task.project_id.in_(project_ids)).all()
    if not tasks:
        return []

    task_map = {t.id: t for t in tasks}
    task_ids = list(task_map.keys())

    sub_query = db.query(TaskSubmission).filter(TaskSubmission.task_id.in_(task_ids))
    if status:
        sub_query = sub_query.filter(TaskSubmission.status == status)
    if student_id:
        sub_query = sub_query.filter(TaskSubmission.submitted_by == student_id)

    submissions = sub_query.order_by(TaskSubmission.created_at.desc()).all()

    team_ids = {p.team_id for p in supervised_projects if p.team_id}
    teams = db.query(Team).filter(Team.id.in_(team_ids)).all() if team_ids else []
    team_map = {tm.id: tm.name for tm in teams}

    user_ids = set()
    for s in submissions:
        user_ids.add(s.submitted_by)
        if s.reviewed_by:
            user_ids.add(s.reviewed_by)

    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {u.id: u for u in users}

    task_max_versions = {}
    for s in submissions:
        if s.task_id not in task_max_versions or s.version > task_max_versions[s.task_id]:
            task_max_versions[s.task_id] = s.version

    results = []
    for s in submissions:
        task = task_map.get(s.task_id)
        if not task:
            continue
        project = project_map.get(task.project_id)
        if not project:
            continue
        if team_id and project.team_id != team_id:
            continue

        submitter = user_map.get(s.submitted_by)
        reviewer = user_map.get(s.reviewed_by) if s.reviewed_by else None

        is_final_approved = (
            s.status == "approved"
            and (s.version == task_max_versions.get(s.task_id, 1) or task.status == "done")
        )

        files_summary = [
            SubmissionFileSummary(
                id=f.id,
                original_filename=f.original_filename,
                file_size_bytes=f.file_size_bytes,
                mime_type=f.mime_type,
                uploaded_at=f.uploaded_at,
            )
            for f in s.files
        ]

        results.append(
            TeacherSubmissionOverviewResponse(
                submission_id=s.id,
                task_id=s.task_id,
                task_title=task.title,
                task_priority=task.priority,
                task_deadline=task.deadline,
                project_id=project.id,
                project_name=project.name,
                team_id=project.team_id,
                team_name=team_map.get(project.team_id, "Unassigned"),
                student_id=s.submitted_by,
                student_name=submitter.full_name if submitter else "Unknown Student",
                student_email=submitter.email if submitter else "",
                version=s.version,
                notes=s.notes,
                status=s.status,
                reviewed_by=s.reviewed_by,
                reviewer_name=reviewer.full_name if reviewer else None,
                review_feedback=s.review_feedback,
                reviewed_at=s.reviewed_at,
                created_at=s.created_at,
                is_final_approved=is_final_approved,
                files=files_summary,
            )
        )

    return results
