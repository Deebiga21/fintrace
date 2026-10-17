from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from datetime import datetime
from ..database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    complaint_id = Column(String(64), primary_key=True, index=True)
    date_reported = Column(DateTime, default=datetime.utcnow, index=True)
    complainant_name = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    reported_account_id = Column(String(64), ForeignKey("accounts.account_id"), index=True, nullable=False)
    transaction_id = Column(String(64), nullable=True)
    amount_lost = Column(Float, nullable=False)
    status = Column(String(32), default="New")  # New, Linked, Under_Investigation, Resolved
    source = Column(String(64), default="National Cyber Crime Portal")
    created_at = Column(DateTime, default=datetime.utcnow)
