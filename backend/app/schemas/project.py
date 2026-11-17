"""Project request and response schemas."""

from datetime import date, datetime
from typing import Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field

ProjectStatus = Literal["planning", "active", "completed", "archived"]


class ProjectCreateRequest(BaseModel):
    team_id: uuid.UUID | None = None
    name: str = Field(..., min_length=2, max_length=150)
    description: str | None = None
    start_date: date | None = None
    deadline: date | None = None
    status: ProjectStatus = "active"


class ProjectAssignRequest(BaseModel):
    team_id: uuid.UUID


class DeadlineExtensionRequest(BaseModel):
    new_deadline: date
    reason: str = Field(..., min_length=3, max_length=500)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_id: uuid.UUID | None = None
    name: str
    description: str | None = None
    start_date: date | None = None
    deadline: date | None = None
    original_deadline: date | None = None
    status: str
    teacher_id: uuid.UUID | None = None
    teacher_name: str | None = None
    created_by: uuid.UUID
    created_at: datetime


class ProjectDetailResponse(ProjectResponse):
    team_name: str | None = None


class ProjectListResponse(ProjectResponse):
    team_name: str | None = "Unassigned"
    total_tasks: int = 0
    completed_tasks: int = 0


class TeacherProjectSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None = None
    start_date: date | None = None
    deadline: date | None = None
    original_deadline: date | None = None
    status: str = "active"
    team_id: uuid.UUID | None = None
    team_name: str | None = None
    team_members_count: int = 0
    completion_percentage: float = 0.0
    total_tasks: int = 0
    completed_tasks: int = 0
    in_review_tasks: int = 0
    overdue_tasks: int = 0
    created_at: datetime
