"""Activity log and Analytics calculation engine test suite."""

from datetime import date, timedelta


def test_activity_log_generation_and_feed(client, create_user):
    """Verify that user actions generate immutable activity audit logs with correct actors."""
    user1 = create_user(name="Marcus Vance")
    user2 = create_user(name="Elena Rostova")

    team = client.post("/api/teams", json={"name": "Activity Team"}, headers=user1["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=user2["headers"])

    # 1. Project creation log
    proj = client.post(
        "/api/projects", json={"team_id": team["id"], "name": "Rover Chassis"}, headers=user1["headers"]
    ).json()

    # 2. Task creation log
    task = client.post(
        "/api/tasks",
        json={"project_id": proj["id"], "title": "Motor Wiring", "assigned_to": user2["user"]["id"]},
        headers=user1["headers"],
    ).json()

    # 3. Status change by user 2
    client.patch(f"/api/tasks/{task['id']}", json={"status": "in_progress"}, headers=user2["headers"])

    # 4. Priority change by user 1
    client.patch(f"/api/tasks/{task['id']}", json={"priority": "high"}, headers=user1["headers"])

    # 5. Retrieve activity feed
    feed = client.get(f"/api/teams/{team['id']}/activity", headers=user1["headers"]).json()
    assert len(feed) >= 4

    # Verify actions in reverse chronological order
    actions = [f["action"] for f in feed]
    assert "priority_changed" in actions
    assert "status_changed" in actions
    assert "task_created" in actions
    assert "project_created" in actions

    # Verify actor names
    status_event = next(f for f in feed if f["action"] == "status_changed")
    assert status_event["user_name"] == "Elena Rostova"
    assert status_event["old_value"] == "todo"
    assert status_event["new_value"] == "in_progress"


def test_empty_project_analytics(client, create_user):
    """Verify analytics calculation handles empty projects without division by zero."""
    user = create_user()
    team = client.post("/api/teams", json={"name": "Empty Team"}, headers=user["headers"]).json()
    proj = client.post(
        "/api/projects", json={"team_id": team["id"], "name": "Empty Milestone"}, headers=user["headers"]
    ).json()

    res = client.get(f"/api/projects/{proj['id']}/analytics", headers=user["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["completion_percentage"] == 0.0
    assert data["summary"]["total_tasks"] == 0
    assert data["summary"]["completed_tasks"] == 0
    assert data["summary"]["overdue_tasks"] == 0
    assert len(data["imbalance_warnings"]) == 0
    assert len(data["workload_distribution"]) == 1
    assert data["workload_distribution"][0]["workload_share_percentage"] == 0.0


def test_analytics_imbalance_and_overdue_warnings(client, create_user):
    """Verify analytics engine triggers concentration, idle member, and overdue alerts."""
    lead = create_user(name="Heavy Worker")
    idle = create_user(name="Idle Member")

    team = client.post("/api/teams", json={"name": "Imbalance Team"}, headers=lead["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=idle["headers"])

    proj = client.post(
        "/api/projects", json={"team_id": team["id"], "name": "Heavy Sprint"}, headers=lead["headers"]
    ).json()

    yesterday = (date.today() - timedelta(days=2)).isoformat()

    # Create 5 tasks, all assigned to 'lead' (100% concentration, idle member has 0, 1 overdue)
    # Task 1: overdue
    client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "Task 1",
            "assigned_to": lead["user"]["id"],
            "status": "in_progress",
            "deadline": yesterday,
        },
        headers=lead["headers"],
    )
    # Tasks 2-5: active
    for i in range(2, 6):
        client.post(
            "/api/tasks",
            json={
                "project_id": proj["id"],
                "title": f"Task {i}",
                "assigned_to": lead["user"]["id"],
                "status": "todo",
            },
            headers=lead["headers"],
        )

    analytics = client.get(f"/api/projects/{proj['id']}/analytics", headers=lead["headers"]).json()

    assert analytics["summary"]["total_tasks"] == 5
    assert analytics["summary"]["overdue_tasks"] == 1
    assert analytics["completion_percentage"] == 0.0

    warnings = analytics["imbalance_warnings"]
    assert any("Workload Concentration" in w and "Heavy Worker" in w for w in warnings)
    assert any("Idle Member Alert" in w and "Idle Member" in w for w in warnings)
    assert any("Overdue Alert" in w for w in warnings)

    # Verify workload distribution numbers
    worker_stat = next(m for m in analytics["workload_distribution"] if m["full_name"] == "Heavy Worker")
    assert worker_stat["assigned_tasks"] == 5
    assert worker_stat["workload_share_percentage"] == 100.0

    idle_stat = next(m for m in analytics["workload_distribution"] if m["full_name"] == "Idle Member")
    assert idle_stat["assigned_tasks"] == 0
    assert idle_stat["workload_share_percentage"] == 0.0
