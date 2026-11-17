"""Teacher supervision and team chat test suite."""

import uuid
import pytest


def test_teacher_supervision_lifecycle(client, create_user, db):
    """Verify teacher project creation, team assignment, deadline extension with reason, and report export."""
    from app.cli.provision_teacher import provision_teacher

    # 1. Provision teacher via administrative command
    provision_teacher("prof.wright@university.edu", "Prof. Eleanor Wright", "SecurePassword123!", db=db)

    teacher_login = client.post(
        "/api/auth/login",
        json={"email": "prof.wright@university.edu", "password": "SecurePassword123!"},
    ).json()
    teacher_headers = {"Authorization": f"Bearer {teacher_login['access_token']}"}

    student_lead = create_user(name="Lead Student")
    student_headers = student_lead["headers"]

    # Student cannot access teacher endpoints -> 403
    unauth_teacher_res = client.get("/api/teacher/projects", headers=student_headers)
    assert unauth_teacher_res.status_code == 403

    # Student creates team
    team = client.post("/api/teams", json={"name": "Formula Student EV"}, headers=student_headers).json()

    # Teacher creates academic project topic
    topic = client.post(
        "/api/teacher/projects",
        json={
            "name": "Battery Pack Thermal Management",
            "description": "Design cooling jacket for 400V pouch cell module",
            "deadline": "2026-12-01",
        },
        headers=teacher_headers,
    ).json()
    assert topic["name"] == "Battery Pack Thermal Management"
    assert topic["team_id"] is None

    # Teacher assigns topic to student team
    assigned = client.post(
        f"/api/teacher/projects/{topic['id']}/assign",
        json={"team_id": team["id"]},
        headers=teacher_headers,
    ).json()
    assert assigned["team_id"] == team["id"]

    # Student creates a subtask under the assigned project
    client.post(
        "/api/tasks",
        json={
            "project_id": topic["id"],
            "title": "CFD Pressure Drop Simulation",
            "assigned_to": student_lead["user"]["id"],
            "status": "todo",
        },
        headers=student_headers,
    )

    # Teacher lists supervised projects
    supervised_list = client.get("/api/teacher/projects", headers=teacher_headers).json()
    assert len(supervised_list) >= 1
    proj_summary = next(p for p in supervised_list if p["id"] == topic["id"])
    assert proj_summary["team_name"] == "Formula Student EV"
    assert proj_summary["total_tasks"] == 1

    # Teacher extends deadline with mandatory reason
    ext_res = client.post(
        f"/api/teacher/projects/{topic['id']}/extend-deadline",
        json={
            "new_deadline": "2026-12-15",
            "reason": "Lab power outage delayed battery thermal wind tunnel testing by two weeks.",
        },
        headers=teacher_headers,
    )
    assert ext_res.status_code == 200
    assert ext_res.json()["deadline"] == "2026-12-15"
    assert ext_res.json()["original_deadline"] == "2026-12-01"

    # Teacher exports project progress as CSV
    csv_res = client.get(f"/api/teacher/projects/{topic['id']}/export?format=csv", headers=teacher_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Battery Pack Thermal Management" in csv_res.text
    assert "CFD Pressure Drop Simulation" in csv_res.text


def test_team_chat_workflow(client, create_user):
    """Verify group chat posting, polling, and access controls."""
    user1 = create_user(name="Alice")
    user2 = create_user(name="Bob")
    outsider = create_user(name="Eve")

    team = client.post("/api/teams", json={"name": "Rocketry Avionics"}, headers=user1["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=user2["headers"])

    # Alice posts a message
    msg1_res = client.post(
        f"/api/teams/{team['id']}/messages",
        json={"message": "Telemetry link established at 915 MHz."},
        headers=user1["headers"],
    )
    assert msg1_res.status_code == 201
    msg1 = msg1_res.json()
    assert msg1["user_name"] == "Alice"
    assert msg1["message"] == "Telemetry link established at 915 MHz."

    # Bob posts a message
    msg2_res = client.post(
        f"/api/teams/{team['id']}/messages",
        json={"message": "Confirmed. RSSI is -68 dBm, zero packet loss."},
        headers=user2["headers"],
    )
    assert msg2_res.status_code == 201

    # Bob lists messages
    feed = client.get(f"/api/teams/{team['id']}/messages", headers=user2["headers"]).json()
    assert len(feed) == 2
    assert feed[0]["message"] == "Telemetry link established at 915 MHz."
    assert feed[1]["message"] == "Confirmed. RSSI is -68 dBm, zero packet loss."

    # Outsider cannot read or post messages
    assert client.get(f"/api/teams/{team['id']}/messages", headers=outsider["headers"]).status_code == 403
    assert (
        client.post(
            f"/api/teams/{team['id']}/messages",
            json={"message": "I'm listening in"},
            headers=outsider["headers"],
        ).status_code
        == 403
    )

    # Test 11: Cross-team chat message isolation
    team2 = client.post("/api/teams", json={"name": "Team Beta"}, headers=outsider["headers"]).json()
    client.post(
        f"/api/teams/{team2['id']}/messages",
        json={"message": "Secret Beta discussion"},
        headers=outsider["headers"],
    )
    # Alice (Team Alpha) cannot see Team Beta's messages
    team2_leak_check = client.get(f"/api/teams/{team2['id']}/messages", headers=user1["headers"])
    assert team2_leak_check.status_code == 403

    # Test 12: Incremental chat polling using 'since' timestamp
    last_msg_time = feed[-1]["created_at"]
    # Poll with since=last_msg_time: should return 0 new messages
    delta_empty = client.get(f"/api/teams/{team['id']}/messages?since={last_msg_time}", headers=user2["headers"]).json()
    assert len(delta_empty) == 0

    # Alice posts a new message
    client.post(
        f"/api/teams/{team['id']}/messages",
        json={"message": "New packet arrived."},
        headers=user1["headers"],
    )
    # Poll with since=last_msg_time: returns ONLY the single new message
    delta_new = client.get(f"/api/teams/{team['id']}/messages?since={last_msg_time}", headers=user2["headers"]).json()
    assert len(delta_new) == 1
    assert delta_new[0]["message"] == "New packet arrived."
    assert delta_new[0]["user_name"] == "Alice"

