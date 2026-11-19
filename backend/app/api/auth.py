"""Authentication API endpoints."""

from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserRegisterRequest, UserResponse
from app.schemas.gamification import GamificationSummaryResponse
from app.services.gamification_service import calculate_user_gamification

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegisterRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Register a new student user."""
    normalized_email = payload.email.lower().strip()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    hashed_pw = get_password_hash(payload.password)
    user = User(
        full_name=payload.full_name.strip(),
        email=normalized_email,
        hashed_password=hashed_pw,
        system_role="student",
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )
    return user


@router.post("/login", response_model=TokenResponse)
def login_user(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Authenticate credentials and issue JWT access token."""
    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return authenticated caller's profile."""
    return current_user


@router.get("/gamification", response_model=GamificationSummaryResponse)
def get_my_gamification(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    team_id: uuid.UUID | None = Query(None, description="Optional team ID to scope team milestones to"),
):
    """Retrieve verifiable personal XP, level, badges, and team milestone achievements."""
    return calculate_user_gamification(db, current_user, team_id=team_id)
