from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from ..database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user = Column(String(128), default="Investigator")
    action = Column(String(64), nullable=False)  # INGESTION, GNN_EVALUATION, CASE_CREATED, EVIDENCE_ADDED, STATUS_CHANGE
    target_type = Column(String(32), nullable=True)  # ACCOUNT, CASE, COMPLAINT, MODEL
    target_id = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)
