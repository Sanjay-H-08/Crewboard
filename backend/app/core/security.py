"""Security and Cryptography utilities (Argon2 password hashing & JWT token management)."""

from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import settings

# Initialize Argon2 password hasher
password_hasher = PasswordHash((Argon2Hasher(),))


def get_password_hash(password: str) -> str:
    """Hash a plaintext password using Argon2."""
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2 hash."""
    return password_hasher.verify(plain_password, hashed_password)


def create_access_token(subject: str | uuid.UUID, expires_delta: timedelta | None = None) -> str:
    """Generate a signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        return payload
    except (jwt.PyJWTError, ValueError):
        return None
