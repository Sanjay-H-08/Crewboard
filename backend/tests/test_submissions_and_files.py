"""Task submissions, review workflow, and file storage test suite."""

import io
import uuid
import pytest


def test_submission_and_review_lifecycle(client, create_user):
    """Verify complete 5-state submission and review workflow with file attachments."""
    leader = create_user(name="Alice Leader")
    member = create_user(name="Bob Member")
    outsider = create_user(name="Eve Outsider")

    # Leader creates team, member joins
    team = client.post("/api/teams", json={"name": "Aero Design"}, headers=leader["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=member["headers"])

    # Create project
    proj = client.post(
        "/api/projects",
        json={"team_id": team["id"], "name": "Wing Spar FEA"},
        headers=leader["headers"],
    ).json()

    # Create task assigned to Bob
    task = client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "Perform stress analysis on root rib",
            "assigned_to": member["user"]["id"],
            "status": "todo",
        },
        headers=leader["headers"],
    ).json()

    # Bob starts working: moves to in_progress
    patch_res = client.patch(
        f"/api/tasks/{task['id']}",
        json={"status": "in_progress"},
        headers=member["headers"],
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "in_progress"

    # Bob attempts to mark done directly without review -> rejected with 400
    invalid_patch = client.patch(
        f"/api/tasks/{task['id']}",
        json={"status": "done"},
        headers=member["headers"],
    )
    assert invalid_patch.status_code == 400
    assert "submitted for review" in invalid_patch.json()["detail"].lower()

    # Bob submits deliverables (version 1) with notes and an attached report
    fake_pdf = io.BytesIO(b"%PDF-1.4 Fake FEA report content with stress tensors")
    sub_res = client.post(
        f"/api/tasks/{task['id']}/submit",
        data={"notes": "First draft of stress analysis completed at 2.5g limit load."},
        files={"files": ("fea_report_v1.pdf", fake_pdf, "application/pdf")},
        headers=member["headers"],
    )
    assert sub_res.status_code == 201
    sub_data = sub_res.json()
    assert sub_data["version"] == 1
    assert sub_data["status"] == "submitted"
    assert len(sub_data["files"]) == 1
    file_id = sub_data["files"][0]["id"]
    assert sub_data["files"][0]["original_filename"] == "fea_report_v1.pdf"

    # Verify task status is now 'submitted'
    task_check = client.get(f"/api/projects/{proj['id']}/tasks", headers=member["headers"]).json()
    t = next(x for x in task_check if x["id"] == task["id"])
    assert t["status"] == "submitted"
    assert t["latest_submission"]["version"] == 1

    # Bob (regular member) cannot review submissions -> 403
    unauth_review = client.post(
        f"/api/tasks/{task['id']}/review",
        json={"decision": "approved", "feedback": "LGTM approval attempt"},
        headers=member["headers"],
    )
    assert unauth_review.status_code == 403
    assert "only team leaders or designated reviewers" in unauth_review.json()["detail"].lower()

    # Even if Bob is set as the designated reviewer, he cannot approve his own submission
    client.patch(
        f"/api/tasks/{task['id']}",
        json={"reviewer_id": member["user"]["id"]},
        headers=leader["headers"],
    )
    self_review = client.post(
        f"/api/tasks/{task['id']}/review",
        json={"decision": "approved", "feedback": "Self approval attempt"},
        headers=member["headers"],
    )
    assert self_review.status_code == 403
    assert "cannot review your own submission" in self_review.json()["detail"].lower()

    # Outsider cannot download the uploaded file
    outsider_dl = client.get(f"/api/files/{file_id}/download", headers=outsider["headers"])
    assert outsider_dl.status_code == 403

    # Leader can download the uploaded file
    leader_dl = client.get(f"/api/files/{file_id}/download", headers=leader["headers"])
    assert leader_dl.status_code == 200
    assert b"Fake FEA report" in leader_dl.content

    # Leader requests changes on version 1
    review_res = client.post(
        f"/api/tasks/{task['id']}/review",
        json={
            "decision": "changes_requested",
            "feedback": "Please re-calculate buckling margins at 3.8g ultimate load.",
        },
        headers=leader["headers"],
    )
    assert review_res.status_code == 200
    reviewed_task = review_res.json()
    assert reviewed_task["status"] == "changes_requested"
    assert reviewed_task["latest_submission"]["status"] == "changes_requested"
    assert "re-calculate" in reviewed_task["latest_submission"]["review_feedback"]

    # Bob submits revision v2
    fake_pdf_v2 = io.BytesIO(b"%PDF-1.4 Revision 2 with ultimate load buckling check")
    sub_res_v2 = client.post(
        f"/api/tasks/{task['id']}/submit",
        data={"notes": "Buckling check added at 3.8g ultimate load with 1.5 SF."},
        files={"files": ("fea_report_v2.pdf", fake_pdf_v2, "application/pdf")},
        headers=member["headers"],
    )
    assert sub_res_v2.status_code == 201
    assert sub_res_v2.json()["version"] == 2

    # Check submissions history
    history_res = client.get(f"/api/tasks/{task['id']}/submissions", headers=member["headers"])
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 2
    assert history[0]["version"] == 2
    assert history[1]["version"] == 1

    # Leader approves revision v2
    final_review = client.post(
        f"/api/tasks/{task['id']}/review",
        json={"decision": "approved", "feedback": "Excellent work. Calculations verified and approved."},
        headers=leader["headers"],
    )
    assert final_review.status_code == 200
    assert final_review.json()["status"] == "done"
    assert final_review.json()["latest_submission"]["status"] == "approved"


def test_submission_security_bypasses_and_teacher_restrictions(client, create_user, db):
    """Verify Tests 2, 6, 8, 9, 10: File validation, teacher review block, status bypass block, and atomic cleanup."""
    import os
    from app.cli.provision_teacher import provision_teacher
    from app.core.config import settings

    lead = create_user(name="Lead Engineer")
    member = create_user(name="Cadet")
    outsider = create_user(name="Intruder")

    team = client.post("/api/teams", json={"name": "Propulsion"}, headers=lead["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=member["headers"])

    proj = client.post(
        "/api/projects", json={"team_id": team["id"], "name": "Injector Head"}, headers=lead["headers"]
    ).json()

    task = client.post(
        "/api/tasks",
        json={"project_id": proj["id"], "title": "Pintle injector sizing", "assigned_to": member["user"]["id"]},
        headers=lead["headers"],
    ).json()

    # Provision teacher
    provision_teacher("prof.propulsion@university.edu", "Prof. Propulsion", "Pass1234!", db=db)
    t_login = client.post(
        "/api/auth/login", json={"email": "prof.propulsion@university.edu", "password": "Pass1234!"}
    ).json()
    t_headers = {"Authorization": f"Bearer {t_login['access_token']}"}

    # Member moves task to in_progress
    client.patch(f"/api/tasks/{task['id']}", json={"status": "in_progress"}, headers=member["headers"])

    # Test 8: Disallowed file extension (.sh, .exe, .svg) is rejected with 400
    sh_file = io.BytesIO(b"#!/bin/bash\nrm -rf /")
    res_disallowed = client.post(
        f"/api/tasks/{task['id']}/submit",
        files={"files": ("malicious.sh", sh_file, "text/x-shellscript")},
        headers=member["headers"],
    )
    assert res_disallowed.status_code == 400
    assert "unapproved format" in res_disallowed.json()["detail"].lower()

    # Test 8: MIME inconsistency (.pdf with application/x-dosexec) is rejected
    fake_exe = io.BytesIO(b"MZ executable header")
    res_mime = client.post(
        f"/api/tasks/{task['id']}/submit",
        files={"files": ("report.pdf", fake_exe, "application/x-dosexec")},
        headers=member["headers"],
    )
    assert res_mime.status_code == 400
    assert "inconsistent with extension" in res_mime.json()["detail"].lower()

    # Test 8b: Magic bytes spoofing (.pdf containing executable bytes with spoofed application/pdf MIME) is rejected
    spoofed_pdf = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00fake pe header")
    res_spoof = client.post(
        f"/api/tasks/{task['id']}/submit",
        files={"files": ("spoofed.pdf", spoofed_pdf, "application/pdf")},
        headers=member["headers"],
    )
    assert res_spoof.status_code == 400
    assert "valid pdf header signature" in res_spoof.json()["detail"].lower()

    # Test 8: Oversized file (>25MB) is rejected with 413
    oversized_content = b"0" * (25 * 1024 * 1024 + 1024)
    oversized_file = io.BytesIO(oversized_content)
    res_oversized = client.post(
        f"/api/tasks/{task['id']}/submit",
        files={"files": ("huge.zip", oversized_file, "application/zip")},
        headers=member["headers"],
    )
    assert res_oversized.status_code == 413
    assert "exceeds maximum allowed size" in res_oversized.json()["detail"].lower()

    # Valid submission by member
    valid_pdf = io.BytesIO(b"%PDF-1.4 Pintle injector geometry and discharge coefficients")
    valid_sub = client.post(
        f"/api/tasks/{task['id']}/submit",
        data={"notes": "Completed sizing for 150 bar chamber pressure."},
        files={"files": ("sizing_calc.pdf", valid_pdf, "application/pdf")},
        headers=member["headers"],
    )
    assert valid_sub.status_code == 201
    file_id = valid_sub.json()["files"][0]["id"]

    # Test 6: Member cannot directly mark submitted task as 'done' via PATCH -> 400
    bypass_attempt = client.patch(
        f"/api/tasks/{task['id']}",
        json={"status": "done"},
        headers=member["headers"],
    )
    assert bypass_attempt.status_code == 400
    assert "submitted tasks cannot be marked done directly" in bypass_attempt.json()["detail"].lower()

    # Team Leader also CANNOT bypass formal review to mark done via PATCH -> 400
    leader_bypass = client.patch(
        f"/api/tasks/{task['id']}",
        json={"status": "done"},
        headers=lead["headers"],
    )
    assert leader_bypass.status_code == 400
    assert "submitted for review" in leader_bypass.json()["detail"].lower()

    # Test 2: Teacher cannot approve or reject submission -> 403
    teacher_review_attempt = client.post(
        f"/api/tasks/{task['id']}/review",
        json={"decision": "approved", "feedback": "Teacher attempting approval"},
        headers=t_headers,
    )
    assert teacher_review_attempt.status_code == 403
    assert "supervisory" in teacher_review_attempt.json()["detail"].lower()

    # Test 10: Concurrent submissions cannot create duplicate versions -> unique constraint raises 409
    from unittest.mock import patch
    from sqlalchemy.exc import IntegrityError

    with patch("app.api.tasks.Session.commit", side_effect=IntegrityError("duplicate", {}, Exception())):
        dup_file = io.BytesIO(b"%PDF-1.4 Concurrent submission collision test")
        concurrent_res = client.post(
            f"/api/tasks/{task['id']}/submit",
            files={"files": ("collision.pdf", dup_file, "application/pdf")},
            headers=member["headers"],
        )
        assert concurrent_res.status_code == 409
        assert "concurrently" in concurrent_res.json()["detail"].lower()

    # Test 9: Verify failed submissions cleaned up and did not leave orphaned files on disk
    # Check that collision.pdf does not exist in any submission directory
    upload_root = settings.UPLOAD_DIR
    found_collision = False
    for root, _, files in os.walk(upload_root):
        for f in files:
            if "collision" in f:
                found_collision = True
    assert found_collision is False


def test_submission_upload_2mb_pptx_and_multi_attachment_matrix(client, create_user):
    """Verify that a 2 MB PPTX, valid PDF, and multiple attachments succeed, while files >25MB and outsiders are rejected."""
    import zipfile

    leader = create_user(name="Team Lead")
    member = create_user(name="Submitter Member")
    outsider = create_user(name="Outsider Student")

    team = client.post("/api/teams", json={"name": "Digital Logic Team"}, headers=leader["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=member["headers"])

    proj = client.post(
        "/api/projects",
        json={"team_id": team["id"], "name": "BCD Adder Milestone"},
        headers=leader["headers"],
    ).json()

    task = client.post(
        "/api/tasks",
        json={
            "project_id": proj["id"],
            "title": "BCD Adder Design and Simulation",
            "assigned_to": member["user"]["id"],
            "status": "in_progress",
        },
        headers=leader["headers"],
    ).json()

    # Helper: Create realistic valid PPTX with OpenXML structure and target size
    def make_pptx(target_size=2 * 1024 * 1024):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_STORED) as zf:
            zf.writestr(
                "[Content_Types].xml",
                b'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
            )
            zf.writestr(
                "ppt/presentation.xml",
                b'<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>',
            )
            current_len = buf.tell()
            padding = max(target_size - current_len - 150, 1024)
            zf.writestr("ppt/slides/slide1.xml", b"0" * padding)
        buf.seek(0)
        return buf

    # 1. Test 2 MB PPTX upload succeeds (matching the exact reported issue file)
    pptx_2mb = make_pptx(target_size=2 * 1024 * 1024)
    res_pptx = client.post(
        f"/api/tasks/{task['id']}/submit",
        data={"notes": "BCD-Adder with correction logic implemented and verified."},
        files=[
            (
                "files",
                (
                    "BCD-Adder-Using-Correction-Logic-updated (1).pptx",
                    pptx_2mb,
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ),
            )
        ],
        headers=member["headers"],
    )
    assert res_pptx.status_code == 201, f"Upload failed: {res_pptx.text}"
    pptx_sub = res_pptx.json()
    assert pptx_sub["version"] == 1
    assert pptx_sub["status"] == "submitted"
    assert len(pptx_sub["files"]) == 1
    assert pptx_sub["files"][0]["original_filename"] == "BCD-Adder-Using-Correction-Logic-updated (1).pptx"
    assert pptx_sub["files"][0]["file_size_bytes"] >= 2 * 1024 * 1024

    # 2. Test valid PDF upload succeeds (as revision 2)
    valid_pdf = io.BytesIO(b"%PDF-1.4 Logic Gate Truth Tables and Timing Diagrams")
    res_pdf = client.post(
        f"/api/tasks/{task['id']}/submit",
        data={"notes": "Added timing diagrams in PDF format."},
        files=[("files", ("timing_diagrams.pdf", valid_pdf, "application/pdf"))],
        headers=member["headers"],
    )
    assert res_pdf.status_code == 201
    pdf_sub = res_pdf.json()
    assert pdf_sub["version"] == 2
    assert len(pdf_sub["files"]) == 1
    assert pdf_sub["files"][0]["original_filename"] == "timing_diagrams.pdf"

    # 3. Test multiple attachments in a single submission (revision 3)
    multi_pptx = make_pptx(target_size=1 * 1024 * 1024)
    multi_pdf = io.BytesIO(b"%PDF-1.4 Circuit Schematics")
    multi_zip = io.BytesIO()
    with zipfile.ZipFile(multi_zip, "w") as zf:
        zf.writestr("testbench.v", b"module tb; endmodule")
    multi_zip.seek(0)

    res_multi = client.post(
        f"/api/tasks/{task['id']}/submit",
        data={"notes": "Complete project package with slides, schematic, and Verilog testbench."},
        files=[
            (
                "files",
                (
                    "presentation.pptx",
                    multi_pptx,
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ),
            ),
            ("files", ("schematic.pdf", multi_pdf, "application/pdf")),
            ("files", ("verilog_src.zip", multi_zip, "application/zip")),
        ],
        headers=member["headers"],
    )
    assert res_multi.status_code == 201
    multi_sub = res_multi.json()
    assert multi_sub["version"] == 3
    assert len(multi_sub["files"]) == 3
    filenames = [f["original_filename"] for f in multi_sub["files"]]
    assert "presentation.pptx" in filenames
    assert "schematic.pdf" in filenames
    assert "verilog_src.zip" in filenames

    # 4. Test file larger than 25 MB is rejected with 413
    huge_buf = io.BytesIO(b"0" * (25 * 1024 * 1024 + 1024))
    res_huge = client.post(
        f"/api/tasks/{task['id']}/submit",
        files=[("files", ("huge_archive.zip", huge_buf, "application/zip"))],
        headers=member["headers"],
    )
    assert res_huge.status_code == 413
    assert "exceeds maximum allowed size of 25mb" in res_huge.json()["detail"].lower()

    # 5. Test unsupported file extensions are rejected with 400
    bad_file = io.BytesIO(b"echo hello")
    res_bad = client.post(
        f"/api/tasks/{task['id']}/submit",
        files=[("files", ("script.sh", bad_file, "application/x-sh"))],
        headers=member["headers"],
    )
    assert res_bad.status_code == 400
    assert "unapproved format" in res_bad.json()["detail"].lower()

    # 6. Test unauthorized user cannot upload to another team's task -> 403 Forbidden
    outsider_buf = io.BytesIO(b"%PDF-1.4 Malicious attempt")
    res_outsider = client.post(
        f"/api/tasks/{task['id']}/submit",
        files=[("files", ("injected.pdf", outsider_buf, "application/pdf"))],
        headers=outsider["headers"],
    )
    assert res_outsider.status_code == 403

    # 7. Verify submission records and attachments are persisted correctly in database
    subs_list = client.get(f"/api/tasks/{task['id']}/submissions", headers=member["headers"]).json()
    assert len(subs_list) == 3
    latest = subs_list[0]
    assert latest["version"] == 3
    assert len(latest["files"]) == 3

