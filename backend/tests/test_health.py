"""Health check test suite."""


def test_health_check(client):
    """Verify that the health check endpoint returns 200 and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "crewboard-backend"

