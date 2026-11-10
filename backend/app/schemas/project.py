"""Project request and response schemas."""

from datetime import date, datetime
from typing import Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field

ProjectStatus = Literal["planning", "active", "completed", "archived"]


class ProjectCreateRequest(BaseModel):
    team_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=150)
    description: str | None = None
    start_date: date | None = None
    deadline: date | None = None
    status: ProjectStatus = "active"


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_id: uuid.UUID
    name: str
    description: str | None
    start_date: date | None
    deadline: date | None
    status: str
    created_by: uuid.UUID
    created_at: datetime


class ProjectDetailResponse(ProjectResponse):
    team_name: str | None = None


class ProjectListResponse(ProjectResponse):
    team_name: str
    total_tasks: int = 0
    completed_tasks: int = 0
