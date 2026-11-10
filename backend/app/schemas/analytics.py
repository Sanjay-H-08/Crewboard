"""Analytics and ActivityLog request and response schemas."""

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class TaskSummary(BaseModel):
    total_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0
    todo_tasks: int = 0
    overdue_tasks: int = 0
    unassigned_tasks: int = 0


class WorkloadMember(BaseModel):
    user_id: uuid.UUID
    full_name: str
    assigned_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0
    todo_tasks: int = 0
    workload_share_percentage: float = 0.0


class ProjectAnalyticsResponse(BaseModel):
    project_id: uuid.UUID
    project_name: str
    completion_percentage: float = 0.0
    summary: TaskSummary
    workload_distribution: list[WorkloadMember]
    imbalance_warnings: list[str]


class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    project_name: str | None = None
    task_id: uuid.UUID | None = None
    task_title: str | None = None
    user_id: uuid.UUID
    user_name: str | None = None
    action: str
    old_value: str | None = None
    new_value: str | None = None
    created_at: datetime
