"""Core application configuration."""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Crewboard"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://crewboard_user:crewboard_secure_password@localhost:5432/crewboard",
    )

    # CORS
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parsed list of allowed CORS origins without wildcards."""
        if not self.CORS_ORIGINS:
            return []
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def validate_production_security(self) -> None:
        """Enforce strong JWT secret in production environments."""
        placeholder_secrets = {
            "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7",
            "CHANGE_ME_GENERATE_A_RANDOM_SECRET",
            "secret",
            "changeme",
        }
        if self.ENVIRONMENT == "production":
            if not self.SECRET_KEY or self.SECRET_KEY in placeholder_secrets or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY ERROR: A secure, non-default SECRET_KEY with at least "
                    "32 characters must be configured in production."
                )


settings = Settings()
settings.validate_production_security()
