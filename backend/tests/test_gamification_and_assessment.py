"""Test suite for gamification and teacher rubric assessment workflows."""

import io
from uuid import UUID
import uuid
import pytest
from app.cli.provision_teacher import provision_teacher
from app.models.submission import TaskSubmission
from app.models.task import Task
from app.models.team import Team, TeamMember


def test_student_gamification_endpoint(client, create_user, db):
    """Test verifiable student XP, level, badges, and milestones calculation."""
    student = create_user(name="Gamification Student")

    # Initial state: 0 XP, Level 1
    res = client.get("/api/auth/gamification", headers=student["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["total_xp"] == 0
    assert data["level"] == 1
    assert data["level_title"] == "Apprentice Contributor"
    assert data["completed_deliverables_count"] == 0
    assert len(data["badges"]) >= 6

    # Create team and project
    team_res = client.post("/api/teams", json={"name": "Gamification Lab"}, headers=student["headers"]).json()
    proj_res = client.post(
        "/api/projects",
        json={"team_id": team_res["id"], "name": "Telemetry Pipeline"},
        headers=student["headers"],
    ).json()

    # Create a task assigned to student
    task_res = client.post(
        "/api/tasks",
        json={"project_id": proj_res["id"], "title": "Setup InfluxDB", "assigned_to": student["user"]["id"]},
        headers=student["headers"],
    ).json()

    # Submit work
    sub_res = client.post(
        f"/api/tasks/{task_res['id']}/submit",
        data={"notes": "Completed initial telemetry ingestion"},
        files={"files": ("metrics.pdf", io.BytesIO(b"%PDF-1.4 Telemetry Spec"), "application/pdf")},
        headers=student["headers"],
    )
    assert sub_res.status_code == 201

    # Simulate review approval on v1 by team owner
    review_res = client.post(
        f"/api/tasks/{task_res['id']}/review",
        json={"decision": "approved", "feedback": "Excellent clean implementation"},
        headers=student["headers"],
    )
    # Note: self-approval is blocked in app logic if caller is submitter
    # Let's verify self-approval is rejected with 403
    assert review_res.status_code == 403

    # Manually approve in DB for deterministic gamification calculation test
    sub_rec = db.query(TaskSubmission).filter(TaskSubmission.task_id == UUID(task_res["id"])).first()
    sub_rec.status = "approved"
    task_rec = db.query(Task).filter(Task.id == UUID(task_res["id"])).first()
    task_rec.status = "done"
    db.commit()

    # Re-fetch gamification: Deliverable Approved (100 XP) + First Pass (50 XP) = 150 XP
    res2 = client.get("/api/auth/gamification", headers=student["headers"])
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total_xp"] >= 150
    assert data2["completed_deliverables_count"] == 1
    assert data2["first_pass_count"] == 1

    first_badge = next(b for b in data2["badges"] if b["id"] == "badge_first_deliverable")
    assert first_badge["is_unlocked"] is True

    clean_badge = next(b for b in data2["badges"] if b["id"] == "badge_clean_delivery")
    assert clean_badge["is_unlocked"] is True

    # Test team_id scoping query param
    scoped_res = client.get(f"/api/auth/gamification?team_id={team_res['id']}", headers=student["headers"])
    assert scoped_res.status_code == 200
    scoped_data = scoped_res.json()
    assert len(scoped_data["team_milestones"]) >= 3

    # Test peer review per-task deduplication:
    # Create teammate Charlie and a task assigned to Charlie
    charlie = create_user(name="Charlie Teammate")
    client.post("/api/teams/join", json={"join_code": team_res["join_code"]}, headers=charlie["headers"])
    charlie_task = client.post(
        "/api/tasks",
        json={"project_id": proj_res["id"], "title": "Setup Prometheus", "assigned_to": charlie["user"]["id"]},
        headers=charlie["headers"],
    ).json()

    # Create submission 1 by Charlie, reviewed by student
    sub1 = TaskSubmission(
        task_id=UUID(charlie_task["id"]),
        submitted_by=UUID(charlie["user"]["id"]),
        version=1,
        status="changes_requested",
        reviewed_by=UUID(student["user"]["id"]),
        review_feedback="Please add retention configuration.",
    )
    # Create submission 2 on same task by Charlie, also reviewed by student
    sub2 = TaskSubmission(
        task_id=UUID(charlie_task["id"]),
        submitted_by=UUID(charlie["user"]["id"]),
        version=2,
        status="approved",
        reviewed_by=UUID(student["user"]["id"]),
        review_feedback="Retention config verified. Looks great.",
    )
    db.add(sub1)
    db.add(sub2)
    db.commit()

    # Re-fetch gamification: student should be rewarded for 1 distinct task review (+40 XP),
    # not 2 (+80 XP), ensuring repeat review/resubmit cycling is capped per task.
    res3 = client.get("/api/auth/gamification", headers=student["headers"])
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["peer_reviews_count"] == 1
    assert data3["xp_breakdown"]["peer_reviews_xp"] == 40


def test_teacher_rubric_assessment_workflow(client, create_user, db):
    """Test teacher contribution overview and individual rubric scoring."""
    # 1. Provision Teacher
    teacher = provision_teacher(
        email="prof.assessment@university.edu",
        full_name="Prof. Assessment",
        password="TeacherPassword123!",
        db=db,
    )
    t_login = client.post(
        "/api/auth/login",
        json={"email": "prof.assessment@university.edu", "password": "TeacherPassword123!"},
    ).json()
    t_headers = {"Authorization": f"Bearer {t_login['access_token']}"}

    # 2. Students & Team
    alice = create_user(name="Alice Engineer")
    bob = create_user(name="Bob Designer")

    team = client.post("/api/teams", json={"name": "Aero Design Team"}, headers=alice["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=bob["headers"])

    # 3. Teacher creates and assigns project
    project = client.post(
        "/api/teacher/projects",
        json={"name": "Wind Tunnel Analysis", "description": "CFD model testing"},
        headers=t_headers,
    ).json()
    client.post(
        f"/api/teacher/projects/{project['id']}/assign",
        json={"team_id": team["id"]},
        headers=t_headers,
    )

    # 4. Fetch contributions overview
    contrib_res = client.get(
        f"/api/teacher/projects/{project['id']}/contributions",
        headers=t_headers,
    )
    assert contrib_res.status_code == 200
    contrib_data = contrib_res.json()
    assert contrib_data["team_name"] == "Aero Design Team"
    assert len(contrib_data["students"]) == 2

    # Check initial assessment status is None
    alice_entry = next(s for s in contrib_data["students"] if s["user_id"] == alice["user"]["id"])
    assert alice_entry["assessment"] is None

    # 5. Teacher grades Alice using Rubric
    grade_res = client.post(
        f"/api/teacher/projects/{project['id']}/assessments/{alice['user']['id']}",
        json={
            "technical_score": 5,
            "documentation_score": 4,
            "collaboration_score": 4,
            "feedback": "Outstanding technical CFD simulation and clear reporting.",
        },
        headers=t_headers,
    )
    assert grade_res.status_code == 200
    grade_data = grade_res.json()
    assert grade_data["technical_score"] == 5
    assert grade_data["documentation_score"] == 4
    assert grade_data["collaboration_score"] == 4
    assert grade_data["total_rubric_score"] == 13
    assert grade_data["max_rubric_score"] == 15
    assert grade_data["feedback"] == "Outstanding technical CFD simulation and clear reporting."

    # 6. Re-fetch contributions: verify Alice now shows graded assessment
    contrib_res2 = client.get(
        f"/api/teacher/projects/{project['id']}/contributions",
        headers=t_headers,
    )
    assert contrib_res2.status_code == 200
    alice_entry2 = next(s for s in contrib_res2.json()["students"] if s["user_id"] == alice["user"]["id"])
    assert alice_entry2["assessment"] is not None
    assert alice_entry2["assessment"]["total_rubric_score"] == 13

    # 7. Security: Student cannot assess other students -> 403
    student_attempt = client.post(
        f"/api/teacher/projects/{project['id']}/assessments/{bob['user']['id']}",
        json={"technical_score": 5, "documentation_score": 5, "collaboration_score": 5},
        headers=alice["headers"],
    )
    assert student_attempt.status_code == 403

    # 8. Student-facing Assessment View: Alice securely fetches her own evaluation
    alice_view_res = client.get(
        f"/api/projects/{project['id']}/my-assessment",
        headers=alice["headers"],
    )
    assert alice_view_res.status_code == 200
    alice_view = alice_view_res.json()
    assert alice_view is not None
    assert alice_view["student_id"] == alice["user"]["id"]
    assert alice_view["technical_score"] == 5
    assert alice_view["documentation_score"] == 4
    assert alice_view["collaboration_score"] == 4
    assert alice_view["total_rubric_score"] == 13
    assert alice_view["teacher_name"] == "Prof. Assessment"
    assert "Outstanding technical CFD" in alice_view["feedback"]

    # 9. Student-facing Assessment View: Bob has not been assessed yet -> returns null (200)
    bob_view_res = client.get(
        f"/api/projects/{project['id']}/my-assessment",
        headers=bob["headers"],
    )
    assert bob_view_res.status_code == 200
    assert bob_view_res.json() is None

    # 10. Security: Student cannot modify their assessment via POST/PUT on /my-assessment -> 405
    alice_tamper_attempt = client.post(
        f"/api/projects/{project['id']}/my-assessment",
        json={"technical_score": 5, "documentation_score": 5, "collaboration_score": 5},
        headers=alice["headers"],
    )
    assert alice_tamper_attempt.status_code == 405

    # 11. Teacher Academic Report Export: Structured CSV includes rubric scores & student contribution
    csv_res = client.get(
        f"/api/teacher/projects/{project['id']}/export?format=csv",
        headers=t_headers,
    )
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    csv_text = csv_res.text
    assert "Student Name" in csv_text
    assert "Alice Engineer" in csv_text
    assert "Technical Score (1-5)" in csv_text
    assert "Total Rubric Score (/15)" in csv_text
    assert "Outstanding technical CFD simulation" in csv_text

    # 12. Teacher Submissions & Documents: Teacher lists student submissions across supervised projects
    teacher_subs_res = client.get(
        f"/api/teacher/submissions?project_id={project['id']}",
        headers=t_headers,
    )
    assert teacher_subs_res.status_code == 200
    teacher_subs = teacher_subs_res.json()
    assert isinstance(teacher_subs, list)
    if teacher_subs:
        sub_record = teacher_subs[0]
        assert "submission_id" in sub_record
        assert "task_title" in sub_record
        assert "student_name" in sub_record
        assert "files" in sub_record

    # 13. Student Deliverables History: Alice retrieves her own submissions across projects
    alice_subs_res = client.get(
        "/api/submissions/my",
        headers=alice["headers"],
    )
    assert alice_subs_res.status_code == 200
    alice_subs = alice_subs_res.json()
    assert isinstance(alice_subs, list)


def test_rubric_assessment_uuid_validation_and_duplicate_prevention(client, create_user, db):
    """Verify UUID validation, unauthorized teacher blocks, student blocks, and duplicate prevention on upsert."""
    lead = create_user(name="Team Lead")
    student1 = create_user(name="Assessed Student")

    # Provision supervising teacher
    provision_teacher("prof.super@university.edu", "Prof. Supervisor", "Pass1234!", db=db)
    t_login = client.post(
        "/api/auth/login", json={"email": "prof.super@university.edu", "password": "Pass1234!"}
    ).json()
    t_headers = {"Authorization": f"Bearer {t_login['access_token']}"}

    # Provision second teacher not assigned to project
    provision_teacher("prof.other@university.edu", "Prof. Other", "Pass1234!", db=db)
    other_login = client.post(
        "/api/auth/login", json={"email": "prof.other@university.edu", "password": "Pass1234!"}
    ).json()
    other_headers = {"Authorization": f"Bearer {other_login['access_token']}"}

    # Setup team
    team = client.post("/api/teams", json={"name": "Assessment Unit Team"}, headers=lead["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=student1["headers"])

    # Teacher creates project topic and assigns to team
    topic = client.post(
        "/api/teacher/projects",
        json={"name": "Avionics Telemetry", "description": "High altitude balloon tracker"},
        headers=t_headers,
    ).json()
    client.post(
        f"/api/teacher/projects/{topic['id']}/assign",
        json={"team_id": team["id"]},
        headers=t_headers,
    )

    # 1. Test invalid UUID in URL path (e.g. 'undefined' or malformed string) is rejected with 422
    bad_uuid_res = client.post(
        f"/api/teacher/projects/{topic['id']}/assessments/undefined",
        json={"technical_score": 4, "documentation_score": 4, "collaboration_score": 4},
        headers=t_headers,
    )
    assert bad_uuid_res.status_code == 422
    assert "uuid" in bad_uuid_res.text.lower()

    # 2. Test valid student UUID saves successfully (score 12/15)
    valid_res = client.post(
        f"/api/teacher/projects/{topic['id']}/assessments/{student1['user']['id']}",
        json={
            "technical_score": 4,
            "documentation_score": 4,
            "collaboration_score": 4,
            "feedback": "Solid embedded C telemetry firmware.",
        },
        headers=t_headers,
    )
    assert valid_res.status_code == 200
    data = valid_res.json()
    assert data["student_id"] == student1["user"]["id"]
    assert data["total_rubric_score"] == 12
    assert data["feedback"] == "Solid embedded C telemetry firmware."

    # 3. Test updating existing assessment updates in-place without creating duplicate records
    update_res = client.post(
        f"/api/teacher/projects/{topic['id']}/assessments/{student1['user']['id']}",
        json={
            "technical_score": 5,
            "documentation_score": 5,
            "collaboration_score": 4,
            "feedback": "Upgraded after comprehensive hardware testing.",
        },
        headers=t_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["total_rubric_score"] == 14
    assert update_res.json()["id"] == data["id"]  # Same assessment ID preserved!

    # 4. Test unauthorized teacher cannot assess a project they do not supervise -> 404 Not Found
    unauth_teacher_res = client.post(
        f"/api/teacher/projects/{topic['id']}/assessments/{student1['user']['id']}",
        json={"technical_score": 3, "documentation_score": 3, "collaboration_score": 3},
        headers=other_headers,
    )
    assert unauth_teacher_res.status_code == 404

    # 5. Test student cannot assess themselves or others -> 403 Forbidden
    student_attempt = client.post(
        f"/api/teacher/projects/{topic['id']}/assessments/{student1['user']['id']}",
        json={"technical_score": 5, "documentation_score": 5, "collaboration_score": 5},
        headers=student1["headers"],
    )
    assert student_attempt.status_code == 403

    # 6. Test invalid rubric scores (e.g. 0 or 6) are rejected by schema with 422
    out_of_range = client.post(
        f"/api/teacher/projects/{topic['id']}/assessments/{student1['user']['id']}",
        json={"technical_score": 6, "documentation_score": 3, "collaboration_score": 3},
        headers=t_headers,
    )
    assert out_of_range.status_code == 422
