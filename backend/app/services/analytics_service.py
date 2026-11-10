"""Analytics and Workload Imbalance calculation engine."""

from datetime import date
import uuid

from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.task import Task
from app.models.team import TeamMember
from app.models.user import User
from app.schemas.analytics import (
    ProjectAnalyticsResponse,
    TaskSummary,
    WorkloadMember,
)


def calculate_project_analytics(db: Session, project: Project) -> ProjectAnalyticsResponse:
    """Calculate real-time project metrics, completion %, and workload distribution."""
    today = date.today()

    # Retrieve all tasks for this project
    tasks = db.query(Task).filter(Task.project_id == project.id).all()
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "done")
    in_progress_tasks = sum(1 for t in tasks if t.status == "in_progress")
    todo_tasks = sum(1 for t in tasks if t.status == "todo")
    overdue_tasks = sum(
        1 for t in tasks if t.status != "done" and t.deadline is not None and t.deadline < today
    )
    unassigned_tasks = sum(1 for t in tasks if t.assigned_to is None)

    completion_percentage = (
        round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0.0
    )

    summary = TaskSummary(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        in_progress_tasks=in_progress_tasks,
        todo_tasks=todo_tasks,
        overdue_tasks=overdue_tasks,
        unassigned_tasks=unassigned_tasks,
    )

    # Fetch team members for the project's parent team
    memberships = (
        db.query(TeamMember, User)
        .join(User, User.id == TeamMember.user_id)
        .filter(TeamMember.team_id == project.team_id)
        .all()
    )

    total_assigned_tasks = sum(1 for t in tasks if t.assigned_to is not None)

    workload_distribution: list[WorkloadMember] = []
    imbalance_warnings: list[str] = []

    for membership, user in memberships:
        member_tasks = [t for t in tasks if t.assigned_to == user.id]
        m_assigned = len(member_tasks)
        m_completed = sum(1 for t in member_tasks if t.status == "done")
        m_in_progress = sum(1 for t in member_tasks if t.status == "in_progress")
        m_todo = sum(1 for t in member_tasks if t.status == "todo")

        m_share = (
            round((m_assigned / total_assigned_tasks) * 100, 1)
            if total_assigned_tasks > 0
            else 0.0
        )

        workload_distribution.append(
            WorkloadMember(
                user_id=user.id,
                full_name=user.full_name,
                assigned_tasks=m_assigned,
                completed_tasks=m_completed,
                in_progress_tasks=m_in_progress,
                todo_tasks=m_todo,
                workload_share_percentage=m_share,
            )
        )

        # Rule 1: Workload Concentration Warning
        # Triggered if any single member holds >= 50% of all assigned tasks in projects with at least 4 tasks and more than 1 member
        if len(memberships) > 1 and total_tasks >= 4 and m_share >= 50.0:
            imbalance_warnings.append(
                f"Workload Concentration: {user.full_name} holds {m_share}% of all project tasks."
            )

        # Rule 2: Idle Member Warning
        # Triggered if an active team member has 0 assigned tasks while more than 4 tasks are active
        active_tasks_count = total_tasks - completed_tasks
        if active_tasks_count > 4 and m_assigned == 0:
            imbalance_warnings.append(
                f"Idle Member Alert: {user.full_name} has 0 assigned tasks."
            )

    # Rule 3: Overdue Warning
    # Triggered if any task with status != 'done' has deadline < current_date
    if overdue_tasks > 0:
        task_str = "1 task is" if overdue_tasks == 1 else f"{overdue_tasks} tasks are"
        imbalance_warnings.append(f"Overdue Alert: {task_str} past designated deadline.")

    return ProjectAnalyticsResponse(
        project_id=project.id,
        project_name=project.name,
        completion_percentage=completion_percentage,
        summary=summary,
        workload_distribution=workload_distribution,
        imbalance_warnings=imbalance_warnings,
    )
