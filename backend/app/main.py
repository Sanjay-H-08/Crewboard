"""
Crewboard Backend Application Entrypoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
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

