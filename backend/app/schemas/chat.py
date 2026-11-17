"""Chat request and response schemas."""

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field


class TeamMessageCreateRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class TeamMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None = None
    message: str
    created_at: datetime

