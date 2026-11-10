"""Tasks API test suite."""

from datetime import date, timedelta
import uuid


def test_task_creation_and_cross_team_defense(client, create_user):
    """Verify task creation and rejection of cross-team assignment attempts."""
    lead = create_user(name="Team Lead")
    teammate = create_user(name="Verified Teammate")
    outsider = create_user(name="Outsider User")

    # Lead creates team, teammate joins
    team = client.post("/api/teams", json={"name": "Dev Team"}, headers=lead["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=teammate["headers"])

    # Lead creates project
    proj = client.post(
        "/api/projects", json={"team_id": team["id"], "name": "Milestone A"}, headers=lead["headers"]
    ).json()

    # 1. Valid task creation assigned to verified teammate
    task_res = client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "Calibrate PWM",
            "description": "Oscilloscope 20kHz",
            "assigned_to": teammate["user"]["id"],
            "priority": "high",
            "status": "todo",
            "deadline": "2026-11-20",
        },
        headers=lead["headers"],
    )
    assert task_res.status_code == 201
    task_data = task_res.json()
    assert task_data["title"] == "Calibrate PWM"
    assert task_data["assigned_to"] == teammate["user"]["id"]
    assert task_data["assignee_name"] == "Verified Teammate"
    assert task_data["creator_name"] == "Team Lead"

    # 2. Cross-team assignment defense: attempt to assign to outsider
    cross_team_res = client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "Malicious Task",
            "assigned_to": outsider["user"]["id"],
        },
        headers=lead["headers"],
    )
    assert cross_team_res.status_code == 400
    assert (
        cross_team_res.json()["detail"]
        == "Assigned user is not a member of this project's team."
    )

    # 3. Outsider attempts to create task in project -> 403 Forbidden
    outsider_res = client.post(
        "/api/tasks",
        json={"project_id": proj["id"], "title": "Unauthorized Task"},
        headers=outsider["headers"],
    )
    assert outsider_res.status_code == 403


def test_task_partial_update_and_reassignment(client, create_user):
    """Verify PATCH /api/tasks/{task_id} supports partial updates, transitions, and unassigning."""
    u1 = create_user(name="User One")
    u2 = create_user(name="User Two")
    outsider = create_user(name="Outsider")

    team = client.post("/api/teams", json={"name": "Sprint Team"}, headers=u1["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=u2["headers"])

    proj = client.post(
        "/api/projects", json={"team_id": team["id"], "name": "Sprint 1"}, headers=u1["headers"]
    ).json()

    task = client.post(
        "/api/tasks",
        json={"project_id": proj["id"], "title": "Initial Task", "assigned_to": u1["user"]["id"]},
        headers=u1["headers"],
    ).json()

    # 1. Update status to in_progress
    patch_status = client.patch(
        f"/api/tasks/{task['id']}", json={"status": "in_progress"}, headers=u1["headers"]
    )
    assert patch_status.status_code == 200
    assert patch_status.json()["status"] == "in_progress"

    # 2. Reassign to u2
    patch_assign = client.patch(
        f"/api/tasks/{task['id']}", json={"assigned_to": u2["user"]["id"]}, headers=u1["headers"]
    )
    assert patch_assign.status_code == 200
    assert patch_assign.json()["assigned_to"] == u2["user"]["id"]
    assert patch_assign.json()["assignee_name"] == "User Two"

    # 3. Unassign task
    patch_unassign = client.patch(
        f"/api/tasks/{task['id']}", json={"assigned_to": None}, headers=u1["headers"]
    )
    assert patch_unassign.status_code == 200
    assert patch_unassign.json()["assigned_to"] is None
    assert patch_unassign.json()["assignee_name"] is None

    # 4. Update title, description, priority, and deadline
    patch_fields = client.patch(
        f"/api/tasks/{task['id']}",
        json={
            "title": "Updated Title",
            "description": "Updated Description",
            "priority": "high",
            "deadline": "2026-12-01",
        },
        headers=u1["headers"],
    )
    assert patch_fields.status_code == 200
    data = patch_fields.json()
    assert data["title"] == "Updated Title"
    assert data["description"] == "Updated Description"
    assert data["priority"] == "high"
    assert data["deadline"] == "2026-12-01"

    # 5. Attempt to reassign to outsider -> 400 Bad Request
    patch_invalid_assign = client.patch(
        f"/api/tasks/{task['id']}", json={"assigned_to": outsider["user"]["id"]}, headers=u1["headers"]
    )
    assert patch_invalid_assign.status_code == 400

    # 6. Outsider tries to modify task -> 403 Forbidden
    outsider_patch = client.patch(
        f"/api/tasks/{task['id']}", json={"title": "Hacked"}, headers=outsider["headers"]
    )
    assert outsider_patch.status_code == 403


def test_list_tasks_with_filtering_and_overdue(client, create_user):
    """Verify task query filtering by status, priority, assignee, and overdue calculation."""
    user = create_user()
    team = client.post("/api/teams", json={"name": "Filter Team"}, headers=user["headers"]).json()
    proj = client.post(
        "/api/projects", json={"team_id": team["id"], "name": "Filter Proj"}, headers=user["headers"]
    ).json()

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    # Create task 1: Overdue (yesterday, status=todo, priority=high, assigned)
    client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "Task 1",
            "status": "todo",
            "priority": "high",
            "deadline": yesterday,
            "assigned_to": user["user"]["id"],
        },
        headers=user["headers"],
    )

    # Create task 2: Completed overdue (yesterday, status=done -> NOT overdue because completed)
    client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "Task 2",
            "status": "done",
            "priority": "low",
            "deadline": yesterday,
            "assigned_to": user["user"]["id"],
        },
        headers=user["headers"],
    )

    # Create task 3: Unassigned, future deadline
    client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "Task 3",
            "status": "in_progress",
            "priority": "medium",
            "deadline": tomorrow,
            "assigned_to": None,
        },
        headers=user["headers"],
    )

    # Fetch all tasks
    all_tasks = client.get(f"/api/projects/{proj['id']}/tasks", headers=user["headers"]).json()
    assert len(all_tasks) == 3

    t1 = next(t for t in all_tasks if t["title"] == "Task 1")
    assert t1["is_overdue"] is True

    t2 = next(t for t in all_tasks if t["title"] == "Task 2")
    assert t2["is_overdue"] is False

    # Filter by status=todo
    todo_tasks = client.get(f"/api/projects/{proj['id']}/tasks?status=todo", headers=user["headers"]).json()
    assert len(todo_tasks) == 1
    assert todo_tasks[0]["title"] == "Task 1"

    # Filter by priority=low
    low_tasks = client.get(f"/api/projects/{proj['id']}/tasks?priority=low", headers=user["headers"]).json()
    assert len(low_tasks) == 1
    assert low_tasks[0]["title"] == "Task 2"

    # Filter by assigned_to=unassigned
    unassigned = client.get(
        f"/api/projects/{proj['id']}/tasks?assigned_to=unassigned", headers=user["headers"]
    ).json()
    assert len(unassigned) == 1
    assert unassigned[0]["title"] == "Task 3"
