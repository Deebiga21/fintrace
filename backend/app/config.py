import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinTrace AI - Intelligent Mule Account Detection Platform"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fintrace.db")
    # Thresholds for GNN Mule Account Risk Classification
    HIGH_RISK_THRESHOLD: float = 0.75
    MEDIUM_RISK_THRESHOLD: float = 0.40

    class Config:
        case_sensitive = True

settings = Settings()
