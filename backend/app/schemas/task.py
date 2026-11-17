"""Task request and response schemas."""

from datetime import date, datetime
from typing import Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field

TaskStatus = Literal["todo", "in_progress", "submitted", "changes_requested", "done"]
TaskPriority = Literal["low", "medium", "high"]


class TaskCreateRequest(BaseModel):
    project_id: uuid.UUID
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    reviewer_id: uuid.UUID | None = None
    priority: TaskPriority = "medium"
    deadline: date | None = None
    status: TaskStatus = "todo"


class TaskUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    reviewer_id: uuid.UUID | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    deadline: date | None = None


class SubmissionFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    submission_id: uuid.UUID
    original_filename: str
    file_size_bytes: int
    mime_type: str
    uploaded_at: datetime


class TaskSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    submitted_by: uuid.UUID
    submitter_name: str | None = None
    version: int
    notes: str | None = None
    status: str
    reviewed_by: uuid.UUID | None = None
    reviewer_name: str | None = None
    review_feedback: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    files: list[SubmissionFileResponse] = []


class TaskSubmitRequest(BaseModel):
    notes: str | None = None


class TaskReviewRequest(BaseModel):
    decision: Literal["approved", "changes_requested"]
    feedback: str = Field(..., min_length=2, max_length=2000)


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    project_name: str | None = None
    team_id: uuid.UUID | None = None
    team_name: str | None = None
    title: str
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    assignee_name: str | None = None
    reviewer_id: uuid.UUID | None = None
    reviewer_name: str | None = None
    created_by: uuid.UUID
    creator_name: str | None = None
    status: str
    priority: str
    deadline: date | None = None
    is_overdue: bool | None = None
    created_at: datetime
    updated_at: datetime
    latest_submission: TaskSubmissionResponse | None = None
