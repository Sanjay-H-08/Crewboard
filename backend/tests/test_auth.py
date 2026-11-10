"""Authentication API test suite."""

from datetime import timedelta
import jwt

from app.core.config import settings
from app.core.security import create_access_token


def test_registration_success(client):
    """Verify standard user registration returns 201 and created user."""
    payload = {
        "full_name": "Elena Rostova",
        "email": "elena.r@university.edu",
        "password": "ValidPassword123!",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Elena Rostova"
    assert data["email"] == "elena.r@university.edu"
    assert "id" in data
    assert "hashed_password" not in data


def test_registration_duplicate_email(client, create_user):
    """Verify duplicate email registration returns 400 Bad Request."""
    u1 = create_user(email="duplicate@university.edu")

    payload = {
        "full_name": "Another User",
        "email": "duplicate@university.edu",
        "password": "Password123!",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered."


def test_registration_password_complexity(client):
    """Verify registration rejects passwords without numbers or letters."""
    # Only letters
    res1 = client.post(
        "/api/auth/register",
        json={
            "full_name": "User One",
            "email": "u1@univ.edu",
            "password": "onlylettershere",
        },
    )
    assert res1.status_code == 422

    # Only numbers
    res2 = client.post(
        "/api/auth/register",
        json={
            "full_name": "User Two",
            "email": "u2@univ.edu",
            "password": "1234567890",
        },
    )
    assert res2.status_code == 422

    # Too short
    res3 = client.post(
        "/api/auth/register",
        json={
            "full_name": "User Three",
            "email": "u3@univ.edu",
            "password": "Short1",
        },
    )
    assert res3.status_code == 422


def test_login_success_and_failure(client, create_user):
    """Verify login authenticates valid credentials and rejects invalid ones."""
    u = create_user(email="login_test@university.edu", password="SecretPassword123!")

    # Valid login
    res = client.post(
        "/api/auth/login",
        json={"email": "login_test@university.edu", "password": "SecretPassword123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "login_test@university.edu"

    # Wrong password
    res_wrong = client.post(
        "/api/auth/login",
        json={"email": "login_test@university.edu", "password": "WrongPassword999!"},
    )
    assert res_wrong.status_code == 401
    assert res_wrong.json()["detail"] == "Incorrect email or password."

    # Non-existent email
    res_nonexist = client.post(
        "/api/auth/login",
        json={"email": "nobody@university.edu", "password": "SecretPassword123!"},
    )
    assert res_nonexist.status_code == 401
    assert res_nonexist.json()["detail"] == "Incorrect email or password."


def test_get_current_user_me(client, create_user):
    """Verify /api/auth/me returns caller profile when authenticated."""
    u = create_user()
    response = client.get("/api/auth/me", headers=u["headers"])
    assert response.status_code == 200
    assert response.json()["id"] == u["user"]["id"]
    assert response.json()["email"] == u["email"]


def test_auth_me_unauthorized_and_invalid_tokens(client):
    """Verify /api/auth/me rejects missing, malformed, or expired tokens with 401."""
    # No header
    res_no_auth = client.get("/api/auth/me")
    assert res_no_auth.status_code == 401

    # Malformed token
    res_malformed = client.get("/api/auth/me", headers={"Authorization": "Bearer malformed.token.value"})
    assert res_malformed.status_code == 401

    # Expired token
    expired_token = create_access_token(
        subject="e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
        expires_delta=timedelta(seconds=-10),
    )
    res_expired = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401


def test_production_security_validation():
    """Verify production rejects placeholder secret keys."""
    import pytest
    from app.core.config import Settings

    # Placeholder secret in production raises ValueError
    with pytest.raises(ValueError, match="CRITICAL SECURITY ERROR"):
        s = Settings(ENVIRONMENT="production", SECRET_KEY="CHANGE_ME_GENERATE_A_RANDOM_SECRET")
        s.validate_production_security()

    # Short secret in production raises ValueError
    with pytest.raises(ValueError, match="CRITICAL SECURITY ERROR"):
        s = Settings(ENVIRONMENT="production", SECRET_KEY="short")
        s.validate_production_security()

    # Strong 32+ char secret in production passes
    s_good = Settings(ENVIRONMENT="production", SECRET_KEY="a" * 32)
    s_good.validate_production_security()

