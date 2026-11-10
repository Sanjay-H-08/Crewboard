"""Pytest global fixtures and test database setup."""

import uuid
from collections.abc import Generator

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_db
from app.db.session import Base
from app.main import app as fastapi_app
import app.models  # noqa: F401 - Register all models

# Use in-memory SQLite with StaticPool for fast, isolated unit/integration tests
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


# Enable foreign key constraint enforcement in SQLite
@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Create fresh tables for every test function and roll back after."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """FastAPI TestClient wired to the test database session."""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def create_user(client):
    """Factory fixture to register a user and return user credentials & token."""

    def _create_user(
        name="Marcus Vance",
        email=None,
        password="SecurePassword123!",
    ):
        if email is None:
            email = f"user_{uuid.uuid4().hex[:8]}@university.edu"

        reg_res = client.post(
            "/api/auth/register",
            json={
                "full_name": name,
                "email": email,
                "password": password,
            },
        )
        assert reg_res.status_code == 201
        user_data = reg_res.json()

        login_res = client.post(
            "/api/auth/login",
            json={
                "email": email,
                "password": password,
            },
        )
        assert login_res.status_code == 200
        token_data = login_res.json()

        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        return {
            "user": user_data,
            "token": token_data["access_token"],
            "headers": headers,
            "email": email,
            "password": password,
        }

    return _create_user
