"""Projects API test suite."""

import uuid


def test_create_project_and_authorization(client, create_user):
    """Verify project creation requires team membership."""
    member = create_user()
    stranger = create_user()

    # Member creates team
    team = client.post("/api/teams", json={"name": "Engineering Team"}, headers=member["headers"]).json()

    # Member creates project -> 201 Created
    proj_payload = {
        "team_id": team["id"],
        "name": "Chassis Build Milestone",
        "description": "Base frame fabrication",
        "start_date": "2026-11-10",
        "deadline": "2026-11-25",
        "status": "active",
    }
    res = client.post("/api/projects", json=proj_payload, headers=member["headers"])
    assert res.status_code == 201
    proj_data = res.json()
    assert proj_data["name"] == proj_payload["name"]
    assert proj_data["team_id"] == team["id"]
    assert proj_data["status"] == "active"

    # Stranger tries to create project under member's team -> 403 Forbidden
    res_stranger = client.post(
        "/api/projects",
        json={"team_id": team["id"], "name": "Unauthorized Project"},
        headers=stranger["headers"],
    )
    assert res_stranger.status_code == 403


def test_list_and_get_projects_access_control(client, create_user):
    """Verify project retrieval enforces multi-tenant boundaries."""
    u1 = create_user()
    u2 = create_user()

    team1 = client.post("/api/teams", json={"name": "Team 1"}, headers=u1["headers"]).json()
    team2 = client.post("/api/teams", json={"name": "Team 2"}, headers=u2["headers"]).json()

    p1 = client.post(
        "/api/projects", json={"team_id": team1["id"], "name": "P1"}, headers=u1["headers"]
    ).json()
    p2 = client.post(
        "/api/projects", json={"team_id": team2["id"], "name": "P2"}, headers=u2["headers"]
    ).json()

    # User 1 lists all projects -> only sees P1
    u1_projs = client.get("/api/projects", headers=u1["headers"]).json()
    assert len(u1_projs) == 1
    assert u1_projs[0]["id"] == p1["id"]

    # User 1 lists projects for team1 -> 200 OK
    u1_team1_projs = client.get(f"/api/projects?team_id={team1['id']}", headers=u1["headers"]).json()
    assert len(u1_team1_projs) == 1

    # User 1 tries to list projects for team2 -> 403 Forbidden
    res_forbidden_team = client.get(f"/api/projects?team_id={team2['id']}", headers=u1["headers"])
    assert res_forbidden_team.status_code == 403

    # User 1 gets P1 details -> 200 OK
    p1_details = client.get(f"/api/projects/{p1['id']}", headers=u1["headers"])
    assert p1_details.status_code == 200
    assert p1_details.json()["name"] == "P1"

    # User 1 tries to get P2 details (IDOR attack) -> 403 Forbidden
    p2_attack = client.get(f"/api/projects/{p2['id']}", headers=u1["headers"])
    assert p2_attack.status_code == 403

    # Non-existent project -> 404 Not Found
    res_404 = client.get(f"/api/projects/{uuid.uuid4()}", headers=u1["headers"])
    assert res_404.status_code == 404
