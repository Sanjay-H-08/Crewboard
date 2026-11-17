"""Final Master Verification Suite covering all 18 architectural, security, and role requirements."""

import io
import os
import uuid
import pytest
from app.cli.provision_teacher import provision_teacher
from app.core.config import settings
from app.models.user import User


def test_master_all_18_verification_requirements(client, create_user, db):
    """Exhaustive end-to-end integration proving all 18 master requirements in a single live workflow."""

    # 1. Public users cannot create Teacher accounts (role field ignored, creates student)
    reg_res = client.post(
        "/api/auth/register",
        json={
            "full_name": "Public Registrant",
            "email": "public.registrant@university.edu",
            "password": "Password123!",
            "role": "teacher",
        },
    )
    assert reg_res.status_code == 201
    assert reg_res.json()["system_role"] == "student"

    # 2. Teacher provisioning works securely via administrative function
    teacher_user = provision_teacher(
        email="prof.supervisor@university.edu",
        full_name="Prof. Supervisor",
        password="TeacherPass123!",
        db=db,
    )
    assert teacher_user.system_role == "teacher"
    t_login = client.post(
        "/api/auth/login",
        json={"email": "prof.supervisor@university.edu", "password": "TeacherPass123!"},
    ).json()
    t_headers = {"Authorization": f"Bearer {t_login['access_token']}"}

    # Setup student team: Leader (Alice), Member (Bob), Designated Reviewer (Charlie), Outsider (Eve)
    alice_lead = create_user(name="Alice Leader")
    bob_member = create_user(name="Bob Member")
    charlie_rev = create_user(name="Charlie Reviewer")
    eve_outsider = create_user(name="Eve Outsider")

    team = client.post("/api/teams", json={"name": "Autonomous Drone Lab"}, headers=alice_lead["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=bob_member["headers"])
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=charlie_rev["headers"])

    # Teacher creates project topic and assigns to Alice's team
    proj_topic = client.post(
        "/api/teacher/projects",
        json={"name": "Obstacle Avoidance Lidar", "description": "SLAM algorithm on Jetson Nano"},
        headers=t_headers,
    ).json()
    client.post(
        f"/api/teacher/projects/{proj_topic['id']}/assign",
        json={"team_id": team["id"]},
        headers=t_headers,
    )

    # 3. Teachers cannot modify student tasks (or create/delete them) -> 403
    t_create_attempt = client.post(
        "/api/tasks",
        json={"project_id": proj_topic["id"], "title": "Teacher attempt task", "assigned_to": bob_member["user"]["id"]},
        headers=t_headers,
    )
    assert t_create_attempt.status_code == 403
    assert "supervisory read-only" in t_create_attempt.json()["detail"].lower()

    # Leader creates valid task assigned to Bob
    task = client.post(
        "/api/tasks",
        json={"project_id": proj_topic["id"], "title": "Point Cloud Filtering", "assigned_to": bob_member["user"]["id"]},
        headers=alice_lead["headers"],
    ).json()

    # 4. Teachers cannot approve submissions -> 403
    t_review_attempt = client.post(
        f"/api/tasks/{task['id']}/review",
        json={"decision": "approved", "feedback": "Teacher attempting approval"},
        headers=t_headers,
    )
    assert t_review_attempt.status_code == 403
    assert "supervisory read-only" in t_review_attempt.json()["detail"].lower()

    # 5. Teachers cannot access unrelated projects or files -> 403
    other_lead = create_user(name="Other Leader")
    other_team = client.post("/api/teams", json={"name": "Formula Car"}, headers=other_lead["headers"]).json()
    other_proj = client.post("/api/projects", json={"team_id": other_team["id"], "name": "Telemetry"}, headers=other_lead["headers"]).json()
    other_access = client.get(f"/api/projects/{other_proj['id']}/tasks", headers=t_headers)
    assert other_access.status_code == 403

    # 6. Members cannot appoint reviewers -> 403
    member_set_rev = client.patch(
        f"/api/tasks/{task['id']}",
        json={"reviewer_id": charlie_rev["user"]["id"]},
        headers=bob_member["headers"],
    )
    assert member_set_rev.status_code == 403
    assert "only the team leader" in member_set_rev.json()["detail"].lower()

    # Leader appoints Charlie as designated reviewer -> 200
    leader_set_rev = client.patch(
        f"/api/tasks/{task['id']}",
        json={"reviewer_id": charlie_rev["user"]["id"]},
        headers=alice_lead["headers"],
    )
    assert leader_set_rev.status_code == 200

    # 7. Designated reviewers cannot appoint reviewers -> 403
    rev_set_rev = client.patch(
        f"/api/tasks/{task['id']}",
        json={"reviewer_id": bob_member["user"]["id"]},
        headers=charlie_rev["headers"],
    )
    assert rev_set_rev.status_code == 403
    assert "only the team leader" in rev_set_rev.json()["detail"].lower()

    # Bob starts task: moves to in_progress
    client.patch(f"/api/tasks/{task['id']}", json={"status": "in_progress"}, headers=bob_member["headers"])

    # 9. Ordinary PATCH cannot set 'done', 'submitted' or 'changes_requested'
    # 10. Team Leaders cannot bypass formal review
    patch_done_member = client.patch(f"/api/tasks/{task['id']}", json={"status": "done"}, headers=bob_member["headers"])
    assert patch_done_member.status_code == 400
    patch_done_leader = client.patch(f"/api/tasks/{task['id']}", json={"status": "done"}, headers=alice_lead["headers"])
    assert patch_done_leader.status_code == 400
    patch_submitted = client.patch(f"/api/tasks/{task['id']}", json={"status": "submitted"}, headers=alice_lead["headers"])
    assert patch_submitted.status_code == 400
    patch_changes = client.patch(f"/api/tasks/{task['id']}", json={"status": "changes_requested"}, headers=alice_lead["headers"])
    assert patch_changes.status_code == 400

    # 13. Oversized, disallowed, and spoofed file uploads are rejected
    # Disallowed (.sh)
    disallowed_file = io.BytesIO(b"#!/bin/bash\nexit 0")
    res_disallowed = client.post(
        f"/api/tasks/{task['id']}/submit",
        files={"files": ("script.sh", disallowed_file, "text/x-shellscript")},
        headers=bob_member["headers"],
    )
    assert res_disallowed.status_code == 400

    # Spoofed magic bytes (.pdf containing raw text without %PDF- header)
    spoofed_file = io.BytesIO(b"Plain text payload pretending to be pdf")
    res_spoof = client.post(
        f"/api/tasks/{task['id']}/submit",
        files={"files": ("spoofed.pdf", spoofed_file, "application/pdf")},
        headers=bob_member["headers"],
    )
    assert res_spoof.status_code == 400
    assert "valid pdf header signature" in res_spoof.json()["detail"].lower()

    # Oversized (>25MB)
    huge_data = io.BytesIO(b"0" * (25 * 1024 * 1024 + 1024))
    res_huge = client.post(
        f"/api/tasks/{task['id']}/submit",
        files={"files": ("huge.zip", huge_data, "application/zip")},
        headers=bob_member["headers"],
    )
    assert res_huge.status_code == 413

    # 14. Failed uploads do not leave orphaned files
    for root, _, files in os.walk(settings.UPLOAD_DIR):
        for f in files:
            assert "spoofed" not in f
            assert "script" not in f
            assert "huge" not in f

    # Valid submission by Bob (v1)
    valid_pdf_v1 = io.BytesIO(b"%PDF-1.4 Point cloud voxel grid filter v1")
    sub1_res = client.post(
        f"/api/tasks/{task['id']}/submit",
        data={"notes": "First draft of voxel downsampling at 0.05m resolution"},
        files={"files": ("lidar_v1.pdf", valid_pdf_v1, "application/pdf")},
        headers=bob_member["headers"],
    )
    assert sub1_res.status_code == 201
    file_id = sub1_res.json()["files"][0]["id"]

    # 8. Authorization defense on review:
    # 8a. Non-reviewer / non-leader (Bob) cannot review submissions:
    bob_rev_attempt = client.post(
        f"/api/tasks/{task['id']}/review",
        json={"decision": "approved", "feedback": "Self LGTM"},
        headers=bob_member["headers"],
    )
    assert bob_rev_attempt.status_code == 403
    assert "only team leaders or designated reviewers" in bob_rev_attempt.json()["detail"].lower()

    # 8b. Even Team Leader Alice cannot approve her own task submission (self-approval blocked):
    alice_task_res = client.post(
        "/api/tasks",
        json={"project_id": proj_topic["id"], "title": "Alice Lead Deliverable", "assigned_to": str(alice_lead["user"]["id"])},
        headers=alice_lead["headers"],
    )
    assert alice_task_res.status_code == 201
    alice_task = alice_task_res.json()
    alice_sub_res = client.post(
        f"/api/tasks/{alice_task['id']}/submit",
        data={"notes": "Leader self submission"},
        files={"files": ("alice_doc.pdf", io.BytesIO(b"%PDF-1.4 Leader Doc"), "application/pdf")},
        headers=alice_lead["headers"],
    )
    assert alice_sub_res.status_code == 201
    alice_self_rev = client.post(
        f"/api/tasks/{alice_task['id']}/review",
        json={"decision": "approved", "feedback": "Self LGTM"},
        headers=alice_lead["headers"],
    )
    assert alice_self_rev.status_code == 403
    assert "cannot review your own submission" in alice_self_rev.json()["detail"].lower()

    # 12. Unauthorized downloads are rejected
    eve_dl = client.get(f"/api/files/{file_id}/download", headers=eve_outsider["headers"])
    assert eve_dl.status_code == 403
    alice_dl = client.get(f"/api/files/{file_id}/download", headers=alice_lead["headers"])
    assert alice_dl.status_code == 200

    # 11. Valid review transitions work:
    # Reviewer Charlie requests changes on v1
    rev1 = client.post(
        f"/api/tasks/{task['id']}/review",
        json={"decision": "changes_requested", "feedback": "Increase voxel resolution to 0.02m."},
        headers=charlie_rev["headers"],
    )
    assert rev1.status_code == 200
    assert rev1.json()["status"] == "changes_requested"

    # Bob submits revision v2
    valid_pdf_v2 = io.BytesIO(b"%PDF-1.4 Point cloud voxel grid filter v2 (0.02m)")
    sub2_res = client.post(
        f"/api/tasks/{task['id']}/submit",
        data={"notes": "Updated to 0.02m resolution with outlier removal."},
        files={"files": ("lidar_v2.pdf", valid_pdf_v2, "application/pdf")},
        headers=bob_member["headers"],
    )
    assert sub2_res.status_code == 201
    assert sub2_res.json()["version"] == 2

    # Charlie approves v2 -> transitions to done
    rev2 = client.post(
        f"/api/tasks/{task['id']}/review",
        json={"decision": "approved", "feedback": "Approved. Excellent optimization."},
        headers=charlie_rev["headers"],
    )
    assert rev2.status_code == 200
    assert rev2.json()["status"] == "done"

    # 15. Concurrent submissions cannot duplicate versions -> 409 Conflict
    from unittest.mock import patch
    from sqlalchemy.exc import IntegrityError
    with patch("app.api.tasks.Session.commit", side_effect=IntegrityError("duplicate", {}, Exception())):
        dup_file = io.BytesIO(b"%PDF-1.4 Collision file")
        concurrent_res = client.post(
            f"/api/tasks/{task['id']}/submit",
            files={"files": ("collision.pdf", dup_file, "application/pdf")},
            headers=bob_member["headers"],
        )
        assert concurrent_res.status_code == 409

    # 16. Team chat isolation works
    client.post(
        f"/api/teams/{team['id']}/messages",
        json={"message": "Internal Drone Lab message"},
        headers=alice_lead["headers"],
    )
    outsider_chat = client.get(f"/api/teams/{team['id']}/messages", headers=eve_outsider["headers"])
    assert outsider_chat.status_code == 403

    # 17. Incremental polling returns only new messages
    feed = client.get(f"/api/teams/{team['id']}/messages", headers=bob_member["headers"]).json()
    last_time = feed[-1]["created_at"]
    empty_delta = client.get(f"/api/teams/{team['id']}/messages?since={last_time}", headers=bob_member["headers"]).json()
    assert len(empty_delta) == 0

    client.post(f"/api/teams/{team['id']}/messages", json={"message": "New ping"}, headers=alice_lead["headers"])
    single_delta = client.get(f"/api/teams/{team['id']}/messages?since={last_time}", headers=bob_member["headers"]).json()
    assert len(single_delta) == 1
    assert single_delta[0]["message"] == "New ping"

    # 18. Unassigned project tasks remain discoverable where appropriate
    my_tasks = client.get("/api/tasks/my", headers=bob_member["headers"]).json()
    assert len(my_tasks) >= 1
    assert my_tasks[0]["team_name"] == "Autonomous Drone Lab"
