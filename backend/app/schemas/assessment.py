"""Student rubric assessment and contribution request and response schemas."""

from datetime import date, datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field


class StudentAssessmentCreateRequest(BaseModel):
    technical_score: int = Field(3, ge=1, le=5)
    documentation_score: int = Field(3, ge=1, le=5)
    collaboration_score: int = Field(3, ge=1, le=5)
    feedback: str | None = Field(None, max_length=2000)


class StudentAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    student_id: uuid.UUID
    teacher_id: uuid.UUID
    teacher_name: str | None = None
    technical_score: int
    documentation_score: int
    collaboration_score: int
    total_rubric_score: int = 0
    max_rubric_score: int = 15
    feedback: str | None = None
    created_at: datetime
    updated_at: datetime


class StudentContributionSummary(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    role: str
    assigned_tasks_count: int = 0
    completed_tasks_count: int = 0
    submitted_files_count: int = 0
    revision_cycles_count: int = 0
    first_pass_count: int = 0
    on_time_count: int = 0
    peer_reviews_conducted: int = 0
    assessment: StudentAssessmentResponse | None = None


class TeamContributionOverviewResponse(BaseModel):
    project_id: uuid.UUID
    project_name: str
    team_id: uuid.UUID | None = None
    team_name: str | None = None
    total_tasks: int = 0
    completed_tasks: int = 0
    completion_percentage: float = 0.0
    students: list[StudentContributionSummary] = []


class SubmissionFileSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    file_size_bytes: int
    mime_type: str
    uploaded_at: datetime


class TeacherSubmissionOverviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    submission_id: uuid.UUID
    task_id: uuid.UUID
    task_title: str
    task_priority: str
    task_deadline: date | None = None
    project_id: uuid.UUID
    project_name: str
    team_id: uuid.UUID | None = None
    team_name: str
    student_id: uuid.UUID
    student_name: str
    student_email: str
    version: int
    notes: str | None = None
    status: str
    reviewed_by: uuid.UUID | None = None
    reviewer_name: str | None = None
    review_feedback: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    is_final_approved: bool = False
    files: list[SubmissionFileSummary] = []


class StudentSubmissionOverviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    submission_id: uuid.UUID
    task_id: uuid.UUID
    task_title: str
    project_id: uuid.UUID
    project_name: str
    version: int
    notes: str | None = None
    status: str
    reviewed_by: uuid.UUID | None = None
    reviewer_name: str | None = None
    review_feedback: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    is_final_approved: bool = False
    files: list[SubmissionFileSummary] = []
