"""API routers aggregator."""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.projects import router as projects_router
from app.api.tasks import router as tasks_router
from app.api.teacher import router as teacher_router
from app.api.teams import router as teams_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(teams_router)
api_router.include_router(projects_router)
api_router.include_router(tasks_router)
api_router.include_router(teacher_router)
api_router.include_router(chat_router)

__all__ = ["api_router"]
