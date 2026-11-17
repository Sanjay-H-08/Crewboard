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


def test_login_handles_incompatible_or_corrupt_hash_safely(client, db):
    """Verify login with legacy/corrupt/unknown hash formats returns 401 instead of crashing with HTTP 500."""
    from app.models.user import User

    # Create user with an incompatible or legacy hash string (e.g. bcrypt or raw plaintext)
    legacy_user = User(
        full_name="Legacy User",
        email="legacy.hash@university.edu",
        hashed_password="$2b$12$e8O6nU8Yn27s7aG47d/1e.e8O6nU8Yn27s7aG47d/1e.e8O6nU8Yn",
    )
    db.add(legacy_user)
    db.commit()

    res = client.post(
        "/api/auth/login",
        json={"email": "legacy.hash@university.edu", "password": "AnyPassword123!"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect email or password."


def test_registration_integrity_error_rollback(client, db):
    """Verify concurrent or unhandled DB constraint failures roll back and return 400."""
    from unittest.mock import patch
    from sqlalchemy.exc import IntegrityError

    with patch.object(db, "commit", side_effect=IntegrityError("duplicate", {}, Exception())):
        res = client.post(
            "/api/auth/register",
            json={
                "full_name": "Conflict User",
                "email": "conflict.test@university.edu",
                "password": "ValidPassword123!",
            },
        )
        assert res.status_code == 400
        assert res.json()["detail"] == "Email already registered."


def test_public_registration_cannot_register_as_teacher(client, db):
    """Test 1: Verify anonymous users cannot register as teachers even if submitting role: 'teacher'."""
    from app.models.user import User

    res = client.post(
        "/api/auth/register",
        json={
            "full_name": "Infiltrator",
            "email": "infiltrator@university.edu",
            "password": "Password123!",
            "role": "teacher",
        },
    )
    assert res.status_code == 201
    user_data = res.json()
    assert user_data["system_role"] == "student"

    # Query directly from DB
    db_user = db.query(User).filter(User.email == "infiltrator@university.edu").first()
    assert db_user is not None
    assert db_user.system_role == "student"


def test_administrative_cli_provision_teacher(db):
    """Verify backend-controlled administrative provisioning promotes user to teacher."""
    from app.cli.provision_teacher import provision_teacher
    from app.models.user import User

    # Provision brand new teacher
    provision_teacher("prof.jones@university.edu", "Prof. Indiana Jones", "SecretPass123!", db=db)
    user = db.query(User).filter(User.email == "prof.jones@university.edu").first()
    assert user is not None
    assert user.system_role == "teacher"

    # Promote existing student user to teacher
    student = User(
        full_name="Student Promoted",
        email="promoted@university.edu",
        hashed_password="hash",
        system_role="student",
    )
    db.add(student)
    db.commit()

    provision_teacher("promoted@university.edu", db=db)
    db.refresh(student)
    assert student.system_role == "teacher"


