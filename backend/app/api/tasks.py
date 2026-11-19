"""Tasks API endpoints."""

from datetime import date, datetime, timezone
import os
from typing import Annotated
import uuid
import zipfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import (
    get_current_user,
    get_team_membership_or_403,
    get_user_project_or_403,
    get_user_task_or_403,
    is_team_leader_or_reviewer,
    validate_assignee_in_project_team,
)
from app.db.session import get_db
from app.models.project import Project
from app.models.submission import SubmissionFile, TaskSubmission
from app.models.task import Task
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.assessment import (
    StudentSubmissionOverviewResponse,
    SubmissionFileSummary,
)
from app.schemas.task import (
    SubmissionFileResponse,
    TaskCreateRequest,
    TaskResponse,
    TaskReviewRequest,
    TaskSubmissionResponse,
    TaskUpdateRequest,
)
from app.services.activity_service import log_activity

router = APIRouter(tags=["Tasks"])

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB individual file limit
CHUNK_SIZE = 64 * 1024  # 64KB bounded streaming chunk

ALLOWED_EXTENSIONS = {
    ".pdf": ["application/pdf"],
    ".docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/octet-stream",
    ],
    ".pptx": [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
        "application/x-mspowerpoint",
        "application/powerpoint",
        "application/octet-stream",
    ],
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".webp": ["image/webp"],
    ".zip": [
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
    ],
}

DISALLOWED_EXTENSIONS = {
    ".exe",
    ".sh",
    ".bat",
    ".bin",
    ".cmd",
    ".msi",
    ".py",
    ".js",
    ".html",
    ".htm",
    ".svg",
    ".php",
    ".phtml",
}


def validate_file_signature(file_path: str, ext: str, original_filename: str) -> None:
    """Verify actual file header magic bytes and structure to prevent spoofing."""
    with open(file_path, "rb") as f:
        header = f.read(512)

    if ext == ".pdf":
        if not header.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{original_filename}' does not have a valid PDF header signature.",
            )
    elif ext in (".jpg", ".jpeg"):
        if not header.startswith(b"\xff\xd8\xff"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{original_filename}' does not have a valid JPEG image signature.",
            )
    elif ext == ".png":
        if not header.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{original_filename}' does not have a valid PNG image signature.",
            )
    elif ext == ".webp":
        if not (header.startswith(b"RIFF") and header[8:12] == b"WEBP"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{original_filename}' does not have a valid WEBP image signature.",
            )
    elif ext in (".zip", ".docx", ".pptx"):
        if not header.startswith((b"PK\x03\x04", b"PK\x05\x06")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{original_filename}' does not have a valid ZIP archive signature.",
            )
        if ext in (".docx", ".pptx"):
            try:
                with zipfile.ZipFile(file_path, "r") as zf:
                    namelist = zf.namelist()
                    if "[Content_Types].xml" not in namelist:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File '{original_filename}' is not a valid Office OpenXML package.",
                        )
                    if ext == ".docx" and not any(n.startswith("word/") for n in namelist):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File '{original_filename}' is missing required Word document structures.",
                        )
                    if ext == ".pptx" and not any(n.startswith("ppt/") for n in namelist):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File '{original_filename}' is missing required PowerPoint document structures.",
                        )
            except zipfile.BadZipFile:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{original_filename}' is corrupted and could not be verified as a valid Office document.",
                )


def serialize_submission(db: Session, sub: TaskSubmission) -> TaskSubmissionResponse:
    """Build serialized TaskSubmissionResponse with files and submitter/reviewer names."""
    submitter = db.query(User).filter(User.id == sub.submitted_by).first() if sub.submitted_by else None
    reviewer = db.query(User).filter(User.id == sub.reviewed_by).first() if sub.reviewed_by else None
    files = db.query(SubmissionFile).filter(SubmissionFile.submission_id == sub.id).all()
    file_responses = [
        SubmissionFileResponse(
            id=f.id,
            submission_id=f.submission_id,
            original_filename=f.original_filename,
            file_size_bytes=f.file_size_bytes,
            mime_type=f.mime_type,
            uploaded_at=f.uploaded_at,
        )
        for f in files
    ]
    return TaskSubmissionResponse(
        id=sub.id,
        task_id=sub.task_id,
        submitted_by=sub.submitted_by,
        submitter_name=submitter.full_name if submitter else "Unknown Submitter",
        version=sub.version,
        notes=sub.notes,
        status=sub.status,
        reviewed_by=sub.reviewed_by,
        reviewer_name=reviewer.full_name if reviewer else None,
        review_feedback=sub.review_feedback,
        reviewed_at=sub.reviewed_at,
        created_at=sub.created_at,
        files=file_responses,
    )


def build_task_response(db: Session, task: Task) -> TaskResponse:
    """Build enriched TaskResponse with names, overdue calculation, and latest submission."""
    assignee = db.query(User).filter(User.id == task.assigned_to).first() if task.assigned_to else None
    reviewer = db.query(User).filter(User.id == task.reviewer_id).first() if task.reviewer_id else None
    creator = db.query(User).filter(User.id == task.created_by).first() if task.created_by else None

    today = date.today()
    is_overdue = bool(task.status != "done" and task.deadline is not None and task.deadline < today)

    latest_sub = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.task_id == task.id)
        .order_by(TaskSubmission.version.desc())
        .first()
    )
    latest_sub_response = serialize_submission(db, latest_sub) if latest_sub else None

    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        assignee_name=assignee.full_name if assignee else None,
        reviewer_id=task.reviewer_id,
        reviewer_name=reviewer.full_name if reviewer else None,
        created_by=task.created_by,
        creator_name=creator.full_name if creator else "Unknown User",
        status=task.status,
        priority=task.priority,
        deadline=task.deadline,
        is_overdue=is_overdue,
        created_at=task.created_at,
        updated_at=task.updated_at,
        latest_submission=latest_sub_response,
    )


@router.get("/tasks/my", response_model=list[TaskResponse])
def get_my_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: str | None = Query(None),
    team_id: uuid.UUID | None = Query(None),
):
    """Retrieve all tasks assigned to the caller across projects and teams in a single query."""
    query = (
        db.query(Task, Project, Team)
        .join(Project, Project.id == Task.project_id)
        .outerjoin(Team, Team.id == Project.team_id)
        .filter(Task.assigned_to == current_user.id)
    )

    if team_id:
        query = query.filter(Project.team_id == team_id)

    if status and status.lower() != "all":
        query = query.filter(Task.status == status.lower())

    results = query.order_by(Task.deadline.is_(None), Task.deadline.asc(), Task.created_at.desc()).all()

    today = date.today()
    task_responses = []
    for task, proj, team in results:
        is_overdue = bool(task.status != "done" and task.deadline is not None and task.deadline < today)
        task_responses.append(
            TaskResponse(
                id=task.id,
                project_id=task.project_id,
                project_name=proj.name,
                team_id=team.id if team else None,
                team_name=team.name if team else None,
                title=task.title,
                description=task.description,
                assigned_to=task.assigned_to,
                assignee_name=current_user.full_name,
                created_by=task.created_by,
                creator_name=None,
                status=task.status,
                priority=task.priority,
                deadline=task.deadline,
                is_overdue=is_overdue,
                created_at=task.created_at,
                updated_at=task.updated_at,
            )
        )
    return task_responses


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a task within a project and log audit event."""
    if current_user.system_role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers have supervisory read-only access and cannot create student execution tasks.",
        )

    project = get_user_project_or_403(db, payload.project_id, current_user.id)
    validate_assignee_in_project_team(db, project.team_id, payload.assigned_to)

    if payload.reviewer_id:
        # Only the Team Leader of the relevant team can designate a task reviewer
        membership = (
            db.query(TeamMember)
            .filter(TeamMember.team_id == project.team_id, TeamMember.user_id == current_user.id)
            .first()
        )
        if not membership or membership.role not in ("owner", "leader"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the Team Leader can designate a task reviewer.",
            )
        validate_assignee_in_project_team(db, project.team_id, payload.reviewer_id)

    task = Task(
        project_id=project.id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        assigned_to=payload.assigned_to,
        reviewer_id=payload.reviewer_id,
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
    if current_user.system_role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers have supervisory read-only access and cannot modify student tasks.",
        )

    task = get_user_task_or_403(db, task_id, current_user)
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

    if "reviewer_id" in update_data:
        # Only Team Leaders can designate or change a task reviewer. Designated reviewers cannot appoint reviewers.
        membership = (
            db.query(TeamMember)
            .filter(TeamMember.team_id == project.team_id, TeamMember.user_id == current_user.id)
            .first()
        )
        if not membership or membership.role not in ("owner", "leader"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the Team Leader can designate or change a task reviewer.",
            )
        new_reviewer = update_data["reviewer_id"]
        validate_assignee_in_project_team(db, project.team_id, new_reviewer)
        task.reviewer_id = new_reviewer

    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data["status"]
        if task.status != new_status:
            # 1. Ordinary task PATCH must NEVER set status to done (formal review required for all roles)
            if new_status == "done":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Submitted tasks cannot be marked done directly via update. Deliverables must be submitted for review and approved via the formal review endpoint.",
                )

            # 2. Transitioning to 'submitted' or 'changes_requested' can only be done via dedicated submit/review endpoints
            if new_status in ("submitted", "changes_requested"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot transition task directly to '{new_status}' via update. Use the dedicated deliverable submission or review endpoints.",
                )

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


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve details of a single task by its ID with full authorization check."""
    task = get_user_task_or_403(db, task_id, current_user)
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
    project = get_user_project_or_403(db, project_id, current_user)

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


@router.post("/tasks/{task_id}/submit", response_model=TaskSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_task_work(
    task_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    notes: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
):
    """Submit deliverables and notes for reviewer evaluation with chunked streaming and cleanup on failure."""
    if current_user.system_role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers have supervisory read-only access and cannot submit deliverables.",
        )

    task = get_user_task_or_403(db, task_id, current_user)
    project = db.query(Project).filter(Project.id == task.project_id).first()
    assert project is not None

    # Verify team membership
    get_team_membership_or_403(db, project.team_id, current_user.id)

    prev_sub = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.task_id == task.id)
        .order_by(TaskSubmission.version.desc())
        .first()
    )
    next_version = (prev_sub.version + 1) if prev_sub else 1

    submission = TaskSubmission(
        task_id=task.id,
        submitted_by=current_user.id,
        version=next_version,
        notes=notes.strip() if notes else None,
        status="submitted",
    )
    db.add(submission)
    db.flush()

    sub_dir = os.path.join(
        settings.UPLOAD_DIR,
        str(project.team_id or "unassigned"),
        str(task.id),
        str(submission.id),
    )
    os.makedirs(sub_dir, exist_ok=True)

    abs_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    created_file_paths = []

    try:
        for upload in files:
            if not upload.filename:
                continue

            # Validate extension
            ext = os.path.splitext(upload.filename)[1].lower()
            if ext in DISALLOWED_EXTENSIONS or ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{upload.filename}' has an unapproved format ('{ext}'). Allowed formats: PDF, DOCX, PPTX, JPG, JPEG, PNG, WEBP, ZIP.",
                )

            # Validate MIME consistency
            raw_mime = (upload.content_type or "application/octet-stream").lower()
            valid_mimes = ALLOWED_EXTENSIONS[ext]
            if raw_mime != "application/octet-stream" and raw_mime not in valid_mimes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{upload.filename}' content type '{raw_mime}' is inconsistent with extension '{ext}'.",
                )

            # Generate random storage filename
            stored_name = f"{uuid.uuid4().hex}{ext}"
            target_path = os.path.abspath(os.path.join(sub_dir, stored_name))

            # Verify path traversal containment
            if os.path.commonpath([abs_upload_dir, target_path]) != abs_upload_dir:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid storage path generated.",
                )

            # Bounded chunk streaming to prevent RAM exhaustion
            file_size = 0
            with open(target_path, "wb") as f_out:
                while True:
                    chunk = await upload.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    file_size += len(chunk)
                    if file_size > MAX_FILE_SIZE:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File '{upload.filename}' exceeds maximum allowed size of 25MB.",
                        )
                    f_out.write(chunk)

            created_file_paths.append(target_path)

            # Deep file signature and content verification
            validate_file_signature(target_path, ext, upload.filename)

            sub_file = SubmissionFile(
                submission_id=submission.id,
                original_filename=upload.filename,
                stored_filename=stored_name,
                file_path=target_path,
                file_size_bytes=file_size,
                mime_type=raw_mime,
            )
            db.add(sub_file)

        old_status = task.status
        task.status = "submitted"
        task.updated_at = datetime.now(timezone.utc)

        log_activity(
            db=db,
            project_id=project.id,
            user_id=current_user.id,
            action="submission_created",
            task_id=task.id,
            old_value=old_status,
            new_value=f"Version {next_version}",
        )

        db.commit()
        db.refresh(submission)
        return serialize_submission(db, submission)

    except IntegrityError:
        # Concurrent submission race condition on (task_id, version)
        for fpath in created_file_paths:
            try:
                if os.path.exists(fpath):
                    os.remove(fpath)
            except OSError:
                pass
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A submission for this version was already recorded concurrently. Please refresh and try again.",
        )
    except Exception as exc:
        # Clean up any files created during this failed submission attempt
        for fpath in created_file_paths:
            try:
                if os.path.exists(fpath):
                    os.remove(fpath)
            except OSError:
                pass
        try:
            if os.path.exists(sub_dir) and not os.listdir(sub_dir):
                os.rmdir(sub_dir)
        except OSError:
            pass
        db.rollback()
        raise exc


@router.post("/tasks/{task_id}/review", response_model=TaskResponse)
def review_task_submission(
    task_id: uuid.UUID,
    payload: TaskReviewRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Team leader or designated reviewer decision: approve or request changes with feedback."""
    if current_user.system_role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers have supervisory read-only access and cannot review or approve student deliverables.",
        )

    task = get_user_task_or_403(db, task_id, current_user)
    project = db.query(Project).filter(Project.id == task.project_id).first()
    assert project is not None

    # Only Team Leaders or explicitly designated reviewers can review submissions
    is_authorized = is_team_leader_or_reviewer(db, project.team_id, current_user.id, task)
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leaders or designated reviewers can review submissions.",
        )

    submission = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.task_id == task.id)
        .order_by(TaskSubmission.version.desc())
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No submission found to review on this task.",
        )

    # Prevent self-approval (both submitter and assignee)
    if submission.submitted_by == current_user.id or task.assigned_to == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot review your own submission or assigned deliverable.",
        )

    now = datetime.now(timezone.utc)
    submission.reviewed_by = current_user.id
    submission.reviewed_at = now
    submission.review_feedback = payload.feedback.strip()

    old_status = task.status
    if payload.decision == "approved":
        submission.status = "approved"
        task.status = "done"
        action_name = "submission_approved"
    else:
        submission.status = "changes_requested"
        task.status = "changes_requested"
        action_name = "changes_requested"

    task.updated_at = now

    log_activity(
        db=db,
        project_id=project.id,
        user_id=current_user.id,
        action=action_name,
        task_id=task.id,
        old_value=old_status,
        new_value=submission.status,
    )

    db.commit()
    db.refresh(task)
    return build_task_response(db, task)


@router.get("/tasks/{task_id}/submissions", response_model=list[TaskSubmissionResponse])
def get_task_submissions(
    task_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve full chronological submission and review history for a deliverable."""
    task = get_user_task_or_403(db, task_id, current_user)
    submissions = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.task_id == task.id)
        .order_by(TaskSubmission.version.desc())
        .all()
    )
    return [serialize_submission(db, s) for s in submissions]


@router.get("/files/{file_id}/download")
def download_submission_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Download deliverable file with authorization check against parent team or supervising teacher."""
    sub_file = db.query(SubmissionFile).filter(SubmissionFile.id == file_id).first()
    if not sub_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    submission = db.query(TaskSubmission).filter(TaskSubmission.id == sub_file.submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission record not found.")

    # Access check: caller must belong to the task's project team or be the supervising teacher
    get_user_task_or_403(db, submission.task_id, current_user)

    abs_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    abs_file_path = os.path.abspath(sub_file.file_path)

    # Path traversal check: file must be located within configured UPLOAD_DIR
    if os.path.commonpath([abs_upload_dir, abs_file_path]) != abs_upload_dir:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to requested file path.")

    if not os.path.exists(abs_file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content missing from storage volume.")

    return FileResponse(
        path=sub_file.file_path,
        filename=sub_file.original_filename,
        media_type=sub_file.mime_type,
    )


@router.get("/files/{file_id}/preview")
def preview_submission_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Preview deliverable file in browser (inline content disposition) with authorization check."""
    sub_file = db.query(SubmissionFile).filter(SubmissionFile.id == file_id).first()
    if not sub_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    submission = db.query(TaskSubmission).filter(TaskSubmission.id == sub_file.submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission record not found.")

    # Access check: caller must belong to the task's project team or be the supervising teacher
    get_user_task_or_403(db, submission.task_id, current_user)

    abs_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    abs_file_path = os.path.abspath(sub_file.file_path)

    # Path traversal check: file must be located within configured UPLOAD_DIR
    if os.path.commonpath([abs_upload_dir, abs_file_path]) != abs_upload_dir:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to requested file path.")

    if not os.path.exists(abs_file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content missing from storage volume.")

    return FileResponse(
        path=sub_file.file_path,
        media_type=sub_file.mime_type,
        content_disposition_type="inline",
    )


@router.get("/submissions/my", response_model=list[StudentSubmissionOverviewResponse])
def get_my_submissions(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve all deliverable submissions created by the authenticated student across projects."""
    submissions = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.submitted_by == current_user.id)
        .order_by(TaskSubmission.created_at.desc())
        .all()
    )

    if not submissions:
        return []

    task_ids = {s.task_id for s in submissions}
    tasks = db.query(Task).filter(Task.id.in_(task_ids)).all()
    task_map = {t.id: t for t in tasks}

    project_ids = {t.project_id for t in tasks}
    projects = db.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
    project_map = {p.id: p for p in projects}

    reviewer_ids = {s.reviewed_by for s in submissions if s.reviewed_by}
    reviewers = db.query(User).filter(User.id.in_(reviewer_ids)).all() if reviewer_ids else []
    reviewer_map = {r.id: r.full_name for r in reviewers}

    results = []
    for s in submissions:
        task = task_map.get(s.task_id)
        if not task:
            continue
        project = project_map.get(task.project_id)
        project_name = project.name if project else "Academic Project"

        is_final_approved = s.status == "approved" and task.status == "done"

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
            StudentSubmissionOverviewResponse(
                submission_id=s.id,
                task_id=s.task_id,
                task_title=task.title,
                project_id=task.project_id,
                project_name=project_name,
                version=s.version,
                notes=s.notes,
                status=s.status,
                reviewed_by=s.reviewed_by,
                reviewer_name=reviewer_map.get(s.reviewed_by),
                review_feedback=s.review_feedback,
                reviewed_at=s.reviewed_at,
                created_at=s.created_at,
                is_final_approved=is_final_approved,
                files=files_summary,
            )
        )

    return results
