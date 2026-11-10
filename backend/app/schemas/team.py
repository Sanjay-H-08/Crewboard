"""Team request and response schemas."""

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field


class TeamCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(None, max_length=1000)


class TeamJoinRequest(BaseModel):
    join_code: str = Field(..., min_length=1, max_length=20)


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    full_name: str
    email: str
    role: str
    joined_at: datetime


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    join_code: str
    created_by: uuid.UUID
    created_at: datetime
    role: str
    member_count: int


class TeamDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    join_code: str
    created_by: uuid.UUID
    created_at: datetime
    current_user_role: str
    members: list[TeamMemberResponse]


class TeamJoinResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    role: str
    joined_at: datetime
