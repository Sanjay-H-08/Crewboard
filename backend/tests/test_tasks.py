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


def test_get_my_tasks_endpoint(client, create_user):
    """Verify GET /api/tasks/my returns tasks assigned across projects with project/team context."""
    user = create_user(name="Lead Dev")
    teammate = create_user(name="Active Dev")

    team = client.post("/api/teams", json={"name": "Alpha Squad"}, headers=user["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=teammate["headers"])

    proj1 = client.post("/api/projects", json={"team_id": team["id"], "name": "Sprint 1"}, headers=user["headers"]).json()
    proj2 = client.post("/api/projects", json={"team_id": team["id"], "name": "Sprint 2"}, headers=user["headers"]).json()

    # Create task assigned to teammate in sprint 1
    client.post(
        "/api/tasks",
        json={"project_id": proj1["id"], "title": "Implement Auth", "assigned_to": teammate["user"]["id"]},
        headers=user["headers"],
    )
    # Create task assigned to teammate in sprint 2
    client.post(
        "/api/tasks",
        json={"project_id": proj2["id"], "title": "Write Docs", "assigned_to": teammate["user"]["id"]},
        headers=user["headers"],
    )
    # Create task assigned to user (not teammate)
    client.post(
        "/api/tasks",
        json={"project_id": proj1["id"], "title": "Other Task", "assigned_to": user["user"]["id"]},
        headers=user["headers"],
    )

    # Teammate calls /api/tasks/my
    my_tasks_res = client.get("/api/tasks/my", headers=teammate["headers"])
    assert my_tasks_res.status_code == 200
    my_tasks = my_tasks_res.json()
    assert len(my_tasks) == 2
    titles = [t["title"] for t in my_tasks]
    assert "Implement Auth" in titles
    assert "Write Docs" in titles
    assert my_tasks[0]["team_name"] == "Alpha Squad"
    assert my_tasks[0]["assignee_name"] == "Active Dev"


def test_reviewer_designation_and_teacher_restrictions(client, create_user, db):
    """Verify Tests 3, 4, 5: Reviewer designation restricted to leaders and teachers blocked from task mutation."""
    from app.cli.provision_teacher import provision_teacher

    lead = create_user(name="Team Captain")
    member = create_user(name="Regular Member")
    other_member = create_user(name="Other Member")

    team = client.post("/api/teams", json={"name": "Formula Dynamics"}, headers=lead["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=member["headers"])
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=other_member["headers"])

    proj = client.post(
        "/api/projects", json={"team_id": team["id"], "name": "Suspension Kinematics"}, headers=lead["headers"]
    ).json()

    # Provision teacher
    provision_teacher("prof.dynamics@university.edu", "Prof. Dynamics", "SecretPass123!", db=db)
    t_login = client.post("/api/auth/login", json={"email": "prof.dynamics@university.edu", "password": "SecretPass123!"}).json()
    t_headers = {"Authorization": f"Bearer {t_login['access_token']}"}

    # Test 3: Teacher cannot create student tasks in project
    teacher_create = client.post(
        "/api/tasks",
        json={"project_id": proj["id"], "title": "Teacher created task", "assigned_to": member["user"]["id"]},
        headers=t_headers,
    )
    assert teacher_create.status_code == 403
    assert "supervisory read-only" in teacher_create.json()["detail"].lower()

    # Test 4: Regular member cannot designate a reviewer during creation -> 403
    unauth_create = client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "Member created task",
            "reviewer_id": other_member["user"]["id"],
        },
        headers=member["headers"],
    )
    assert unauth_create.status_code == 403
    assert "only the team leader" in unauth_create.json()["detail"].lower()

    # Leader creates task
    task = client.post(
        "/api/tasks",
        json={"project_id": proj["id"], "title": "Camber Analysis", "assigned_to": member["user"]["id"]},
        headers=lead["headers"],
    ).json()

    # Test 4: Regular member cannot modify reviewer_id -> 403
    unauth_patch = client.patch(
        f"/api/tasks/{task['id']}",
        json={"reviewer_id": other_member["user"]["id"]},
        headers=member["headers"],
    )
    assert unauth_patch.status_code == 403
    assert "only the team leader" in unauth_patch.json()["detail"].lower()

    # Leader appoints other_member as designated reviewer -> 200
    leader_patch = client.patch(
        f"/api/tasks/{task['id']}",
        json={"reviewer_id": other_member["user"]["id"]},
        headers=lead["headers"],
    )
    assert leader_patch.status_code == 200
    assert leader_patch.json()["reviewer_id"] == other_member["user"]["id"]

    # Test 5: Designated reviewer cannot appoint another reviewer -> 403
    reviewer_attempt = client.patch(
        f"/api/tasks/{task['id']}",
        json={"reviewer_id": member["user"]["id"]},
        headers=other_member["headers"],
    )
    assert reviewer_attempt.status_code == 403
    assert "only the team leader" in reviewer_attempt.json()["detail"].lower()

    # Test 3: Teacher cannot modify student task -> 403
    teacher_patch = client.patch(
        f"/api/tasks/{task['id']}",
        json={"title": "Teacher modified title"},
        headers=t_headers,
    )
    assert teacher_patch.status_code == 403
    assert "supervisory read-only" in teacher_patch.json()["detail"].lower()


def test_get_single_task_and_kanban_listing(client, create_user):
    """Verify GET /api/tasks/{task_id} and GET /api/projects/{project_id}/tasks for authorized members and 403 for outsiders."""
    lead = create_user(name="Team Lead")
    member = create_user(name="Team Member")
    outsider = create_user(name="Outsider")

    team = client.post("/api/teams", json={"name": "Kanban Team"}, headers=lead["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=member["headers"])

    proj = client.post(
        "/api/projects", json={"team_id": team["id"], "name": "Kanban Project"}, headers=lead["headers"]
    ).json()

    task_res = client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "Design PCB Layout",
            "assigned_to": member["user"]["id"],
            "priority": "high",
            "status": "todo",
        },
        headers=lead["headers"],
    )
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # 1. Lead and member can fetch single task via GET /api/tasks/{task_id}
    res_lead = client.get(f"/api/tasks/{task_id}", headers=lead["headers"])
    assert res_lead.status_code == 200
    assert res_lead.json()["title"] == "Design PCB Layout"

    res_member = client.get(f"/api/tasks/{task_id}", headers=member["headers"])
    assert res_member.status_code == 200
    assert res_member.json()["title"] == "Design PCB Layout"

    # 2. Outsider gets 403 Forbidden
    res_outsider = client.get(f"/api/tasks/{task_id}", headers=outsider["headers"])
    assert res_outsider.status_code == 403

    # 3. Kanban project task listing
    list_res = client.get(f"/api/projects/{proj['id']}/tasks", headers=member["headers"])
    assert list_res.status_code == 200
    tasks = list_res.json()
    assert len(tasks) == 1
    assert tasks[0]["id"] == task_id

