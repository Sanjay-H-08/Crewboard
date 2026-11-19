"""Gamification and achievement request/response schemas."""

from pydantic import BaseModel


class BadgeItem(BaseModel):
    id: str
    name: str
    description: str
    category: str
    is_unlocked: bool
    progress_text: str
    criteria: str


class TeamMilestoneItem(BaseModel):
    id: str
    name: str
    description: str
    is_unlocked: bool
    completion_percentage: float


class GamificationSummaryResponse(BaseModel):
    total_xp: int
    level: int
    level_title: str
    level_progress_percentage: float
    current_level_base_xp: int
    next_level_xp: int
    xp_to_next_level: int
    xp_breakdown: dict[str, int]
    active_streak_days: int
    completed_deliverables_count: int
    first_pass_count: int
    on_time_count: int
    peer_reviews_count: int
    badges: list[BadgeItem]
    team_milestones: list[TeamMilestoneItem]
