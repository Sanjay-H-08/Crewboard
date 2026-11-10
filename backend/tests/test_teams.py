"""Teams API test suite."""

import uuid


def test_create_team_success(client, create_user):
    """Verify team creation establishes unique join code and owner membership."""
    u = create_user()
    payload = {
        "name": "Robotics Capstone Group 4",
        "description": "Senior design project for Mechatronics Engineering",
    }
    response = client.post("/api/teams", json=payload, headers=u["headers"])
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["description"] == payload["description"]
    assert data["role"] == "owner"
    assert data["member_count"] == 1
    assert "join_code" in data
    assert len(data["join_code"]) >= 6


def test_list_my_teams(client, create_user):
    """Verify user can retrieve all teams they belong to."""
    u1 = create_user()
    u2 = create_user()

    # User 1 creates team
    t1_res = client.post("/api/teams", json={"name": "Team 1"}, headers=u1["headers"])
    assert t1_res.status_code == 201
    t1_id = t1_res.json()["id"]

    # User 2 creates team
    t2_res = client.post("/api/teams", json={"name": "Team 2"}, headers=u2["headers"])
    assert t2_res.status_code == 201
    t2_id = t2_res.json()["id"]

    # User 1 lists teams -> only sees Team 1
    u1_teams = client.get("/api/teams", headers=u1["headers"]).json()
    assert len(u1_teams) == 1
    assert u1_teams[0]["id"] == t1_id

    # User 2 lists teams -> only sees Team 2
    u2_teams = client.get("/api/teams", headers=u2["headers"]).json()
    assert len(u2_teams) == 1
    assert u2_teams[0]["id"] == t2_id


def test_join_team_success_and_failures(client, create_user):
    """Verify team joining via code, duplicate membership rejection, and invalid code handling."""
    owner = create_user()
    joiner = create_user()

    # Owner creates team
    team_data = client.post("/api/teams", json={"name": "Joinable Team"}, headers=owner["headers"]).json()
    join_code = team_data["join_code"]

    # Non-existent code -> 404
    res_404 = client.post("/api/teams/join", json={"join_code": "INVALID-999"}, headers=joiner["headers"])
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "Team with this join code does not exist."

    # Joiner joins team -> 200 OK
    res_join = client.post("/api/teams/join", json={"join_code": join_code}, headers=joiner["headers"])
    assert res_join.status_code == 200
    assert res_join.json()["role"] == "member"
    assert res_join.json()["id"] == team_data["id"]

    # Duplicate join -> 409 Conflict
    res_dup = client.post("/api/teams/join", json={"join_code": join_code}, headers=joiner["headers"])
    assert res_dup.status_code == 409
    assert res_dup.json()["detail"] == "You are already a member of this team."


def test_get_team_details_and_authorization(client, create_user):
    """Verify team detail retrieval with member list and authorization boundaries."""
    owner = create_user(name="Owner User")
    member = create_user(name="Member User")
    stranger = create_user(name="Stranger User")

    # Create team and join
    team = client.post("/api/teams", json={"name": "Alpha Team"}, headers=owner["headers"]).json()
    client.post("/api/teams/join", json={"join_code": team["join_code"]}, headers=member["headers"])

    # Owner gets team details
    owner_view = client.get(f"/api/teams/{team['id']}", headers=owner["headers"])
    assert owner_view.status_code == 200
    data = owner_view.json()
    assert data["current_user_role"] == "owner"
    assert len(data["members"]) == 2

    # Member gets team details
    member_view = client.get(f"/api/teams/{team['id']}", headers=member["headers"])
    assert member_view.status_code == 200
    assert member_view.json()["current_user_role"] == "member"

    # Stranger tries to get team details -> 403 Forbidden
    stranger_view = client.get(f"/api/teams/{team['id']}", headers=stranger["headers"])
    assert stranger_view.status_code == 403

    # Non-existent team -> 404 Not Found
    random_id = uuid.uuid4()
    not_found_view = client.get(f"/api/teams/{random_id}", headers=owner["headers"])
    assert not_found_view.status_code == 404
