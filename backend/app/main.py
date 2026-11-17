"""
Crewboard Backend Application Entrypoint
"""

from typing import Annotated

from fastapi import Depends, FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import api_router
from app.core.config import settings
from app.db.session import get_db

app = FastAPI(
    title="Crewboard API",
    description="Student team project management and contribution tracking platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["System"])
def health_check(
    response: Response,
    db: Annotated[Session, Depends(get_db)] = None,
):
    """System health check endpoint for monitoring and container readiness.
    Verifies database connectivity so infrastructure health monitors reflect actual readiness.
    """
    db_status = "connected"
    if db is not None:
        try:
            db.execute(text("SELECT 1"))
        except Exception:
            db_status = "disconnected"
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "service": "crewboard-backend",
        "version": "0.1.0",
    }


# Include all domain API routers under /api prefix
app.include_router(api_router, prefix="/api")
