"""
Crewboard Backend Application Entrypoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings

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
def health_check():
    """System health check endpoint for monitoring and container readiness."""
    return {
        "status": "healthy",
        "service": "crewboard-backend",
        "version": "0.1.0",
    }


# Include all domain API routers under /api prefix
app.include_router(api_router, prefix="/api")
