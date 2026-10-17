import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinTrace AI - Intelligent Mule Account Detection Platform"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fintrace.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fintrace-secret-key-super-secure-2026-audit-investigation")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Thresholds for GNN Mule Account Risk Classification
    HIGH_RISK_THRESHOLD: float = 0.75
    MEDIUM_RISK_THRESHOLD: float = 0.40

    class Config:
        case_sensitive = True

settings = Settings()
