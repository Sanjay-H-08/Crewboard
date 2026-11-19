"""Gamification service for verifiable, evidence-based student XP, levels, and badges."""

from datetime import date, datetime, timedelta, timezone
import math
import uuid

from sqlalchemy.orm import Session

from app.models.activity import ActivityLog
from app.models.project import Project
from app.models.submission import TaskSubmission
from app.models.task import Task
from app.models.team import TeamMember
from app.models.user import User
from app.schemas.gamification import BadgeItem, GamificationSummaryResponse, TeamMilestoneItem


def calculate_user_gamification(
    db: Session, user: User, team_id: uuid.UUID | None = None
) -> GamificationSummaryResponse:
    """Calculate verifiable XP, level, badges, and team milestone achievements from actual database evidence."""

    # 1. Query all tasks assigned to user
    assigned_tasks = db.query(Task).filter(Task.assigned_to == user.id).all()
    completed_tasks = [t for t in assigned_tasks if t.status == "done"]
    completed_deliverables_count = len(completed_tasks)

    # 2. Query all approved submissions authored by user
    approved_submissions = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.submitted_by == user.id, TaskSubmission.status == "approved")
        .all()
    )

    # First-pass approvals: approved at version 1 (no changes requested)
    first_pass_count = sum(1 for s in approved_submissions if s.version == 1)

    # 3. Punctual completions: tasks done on or before deadline
    on_time_count = 0
    for t in completed_tasks:
        if t.deadline:
            # Check updated_at date against deadline
            task_finish_date = t.updated_at.date() if t.updated_at else date.today()
            if task_finish_date <= t.deadline:
                on_time_count += 1

    # 4. Peer reviews conducted for teammates (reviewed_by == user.id and submitted_by != user.id)
    peer_reviews = (
        db.query(TaskSubmission)
        .filter(
            TaskSubmission.reviewed_by == user.id,
            TaskSubmission.submitted_by != user.id,
            TaskSubmission.review_feedback.isnot(None),
        )
        .all()
    )
    # Apply per-task reward cap: at most 1 rewarded review per unique task
    # to prevent repeated submission/rejection cycling from generating infinite XP.
    reviewed_task_ids = set()
    for sub in peer_reviews:
        if sub.task_id and sub.review_feedback and len(sub.review_feedback.strip()) > 1:
            reviewed_task_ids.add(sub.task_id)
    peer_reviews_count = len(reviewed_task_ids)

    # 5. Calculate XP breakdown
    xp_from_deliverables = completed_deliverables_count * 100
    xp_from_first_pass = first_pass_count * 50
    xp_from_punctuality = on_time_count * 25
    xp_from_peer_reviews = peer_reviews_count * 40

    total_xp = (
        xp_from_deliverables
        + xp_from_first_pass
        + xp_from_punctuality
        + xp_from_peer_reviews
    )

    # 6. Calculate Level
    # Level formula: Level = 1 + floor(sqrt(total_xp / 50))
    # Level 1: 0 - 49 XP
    # Level 2: 50 - 199 XP
    # Level 3: 200 - 449 XP
    # Level 4: 450 - 799 XP
    # Level 5: 800 - 1249 XP
    # Level 6: 1250+ XP
    level = 1 + int(math.floor(math.sqrt(total_xp / 50.0))) if total_xp > 0 else 1

    level_titles = {
        1: "Apprentice Contributor",
        2: "Active Scholar",
        3: "Reliable Specialist",
        4: "Lead Architect",
        5: "Distinguished Collaborator",
        6: "Master Scholar",
    }
    level_title = level_titles.get(level, "Senior Fellow")

    current_level_base_xp = 50 * ((level - 1) ** 2)
    next_level_xp = 50 * (level ** 2)
    bracket_range = next_level_xp - current_level_base_xp
    xp_in_level = total_xp - current_level_base_xp
    level_progress_percentage = (
        round(min(max((xp_in_level / bracket_range) * 100, 0.0), 100.0), 1)
        if bracket_range > 0
        else 0.0
    )
    xp_to_next_level = max(next_level_xp - total_xp, 0)

    # 7. Calculate Active Days in Current Week (Mon-Sun)
    now = datetime.now(timezone.utc)
    monday_start = now - timedelta(days=now.weekday())
    monday_start = monday_start.replace(hour=0, minute=0, second=0, microsecond=0)

    weekly_logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == user.id, ActivityLog.created_at >= monday_start)
        .all()
    )
    active_streak_days = len({log.created_at.date() for log in weekly_logs if log.created_at})

    # 8. Team Milestone Progress
    # If team_id is provided, verify membership and scope strictly to that team.
    # Otherwise, fall back to user's primary/first team rather than aggregating disparate teams together.
    target_team_ids: list[uuid.UUID] = []
    if team_id:
        is_member = (
            db.query(TeamMember)
            .filter(TeamMember.team_id == team_id, TeamMember.user_id == user.id)
            .first()
        )
        if is_member:
            target_team_ids = [team_id]

    if not target_team_ids:
        first_membership = (
            db.query(TeamMember.team_id)
            .filter(TeamMember.user_id == user.id)
            .order_by(TeamMember.joined_at.asc())
            .first()
        )
        if first_membership:
            target_team_ids = [first_membership[0]]

    team_projects = (
        db.query(Project).filter(Project.team_id.in_(target_team_ids)).all()
        if target_team_ids
        else []
    )

    total_team_tasks = 0
    completed_team_tasks = 0
    for proj in team_projects:
        tasks = db.query(Task).filter(Task.project_id == proj.id).all()
        total_team_tasks += len(tasks)
        completed_team_tasks += sum(1 for t in tasks if t.status == "done")

    team_milestone_pct = (
        round((completed_team_tasks / total_team_tasks) * 100, 1)
        if total_team_tasks > 0
        else 0.0
    )

    team_milestones = [
        TeamMilestoneItem(
            id="milestone_kickoff",
            name="Sprint Kickoff",
            description="Team completes initial 25% of assignment deliverables.",
            is_unlocked=team_milestone_pct >= 25.0,
            completion_percentage=min(round((team_milestone_pct / 25.0) * 100, 1), 100.0),
        ),
        TeamMilestoneItem(
            id="milestone_halfway",
            name="Midterm Milestone",
            description="Team completes 50% of assignment deliverables with verified approvals.",
            is_unlocked=team_milestone_pct >= 50.0,
            completion_percentage=min(round((team_milestone_pct / 50.0) * 100, 1), 100.0),
        ),
        TeamMilestoneItem(
            id="milestone_completion",
            name="Capstone Completion",
            description="All project deliverables completed, submitted, and peer approved.",
            is_unlocked=team_milestone_pct >= 100.0 and total_team_tasks > 0,
            completion_percentage=team_milestone_pct,
        ),
    ]

    # 9. Badges with transparent earning criteria
    badges = [
        BadgeItem(
            id="badge_first_deliverable",
            name="First Deliverable",
            description="Completed and approved your first academic deliverable.",
            category="Delivery",
            is_unlocked=completed_deliverables_count >= 1,
            progress_text=f"{min(completed_deliverables_count, 1)}/1 completed",
            criteria="Complete and obtain approval on 1 task deliverable.",
        ),
        BadgeItem(
            id="badge_clean_delivery",
            name="One-Shot Precision",
            description="Delivered a task that was approved on version 1 without revisions requested.",
            category="Quality",
            is_unlocked=first_pass_count >= 1,
            progress_text=f"{min(first_pass_count, 1)}/1 v1 approved",
            criteria="Achieve approval on submission version 1 without changes requested.",
        ),
        BadgeItem(
            id="badge_peer_reviewer",
            name="Quality Guardian",
            description="Conducted formal peer reviews with written feedback on teammate deliverables.",
            category="Collaboration",
            is_unlocked=peer_reviews_count >= 2,
            progress_text=f"{min(peer_reviews_count, 2)}/2 peer reviews",
            criteria="Review and provide constructive feedback on at least 2 teammate submissions.",
        ),
        BadgeItem(
            id="badge_punctual_pro",
            name="Ahead of Time",
            description="Consistently finished milestone deliverables on or before designated deadlines.",
            category="Punctuality",
            is_unlocked=on_time_count >= 3,
            progress_text=f"{min(on_time_count, 3)}/3 on-time",
            criteria="Complete at least 3 task deliverables on or before the target deadline.",
        ),
        BadgeItem(
            id="badge_sprint_driver",
            name="Heavy Lifter",
            description="Owned and delivered 5 or more verified deliverables for the capstone team.",
            category="Delivery",
            is_unlocked=completed_deliverables_count >= 5,
            progress_text=f"{min(completed_deliverables_count, 5)}/5 completed",
            criteria="Successfully complete 5 verified task deliverables.",
        ),
        BadgeItem(
            id="badge_team_synergy",
            name="Team Cohesion",
            description="Your team reached the 50% milestone with verified progress.",
            category="Teamwork",
            is_unlocked=team_milestone_pct >= 50.0,
            progress_text=f"{team_milestone_pct}% / 50% team progress",
            criteria="Contribute to a team that achieves at least 50% completion.",
        ),
    ]

    return GamificationSummaryResponse(
        total_xp=total_xp,
        level=level,
        level_title=level_title,
        level_progress_percentage=level_progress_percentage,
        current_level_base_xp=current_level_base_xp,
        next_level_xp=next_level_xp,
        xp_to_next_level=xp_to_next_level,
        xp_breakdown={
            "deliverables_xp": xp_from_deliverables,
            "first_pass_xp": xp_from_first_pass,
            "punctuality_xp": xp_from_punctuality,
            "peer_reviews_xp": xp_from_peer_reviews,
        },
        active_streak_days=active_streak_days,
        completed_deliverables_count=completed_deliverables_count,
        first_pass_count=first_pass_count,
        on_time_count=on_time_count,
        peer_reviews_count=peer_reviews_count,
        badges=badges,
        team_milestones=team_milestones,
    )
