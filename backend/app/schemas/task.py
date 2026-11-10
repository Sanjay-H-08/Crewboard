"""Task request and response schemas."""

from datetime import date, datetime
from typing import Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field

TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]


class TaskCreateRequest(BaseModel):
    project_id: uuid.UUID
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    priority: TaskPriority = "medium"
    deadline: date | None = None
    status: TaskStatus = "todo"


class TaskUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    assigned_to: uuid.UUID | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    deadline: date | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None
    assigned_to: uuid.UUID | None
    assignee_name: str | None = None
    created_by: uuid.UUID
    creator_name: str | None = None
    status: str
    priority: str
    deadline: date | None
    is_overdue: bool | None = None
    created_at: datetime
    updated_at: datetime
