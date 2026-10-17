from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from datetime import datetime
from ..database import Base

class InvestigationCase(Base):
    __tablename__ = "cases"

    case_id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    priority = Column(String(32), default="High")  # Critical, High, Medium, Low
    assigned_investigator = Column(String(128), default="Lead Financial Crime Specialist")
    status = Column(String(32), default="New")  # New, Under_Investigation, Escalated, Closed
    primary_account_id = Column(String(64), ForeignKey("accounts.account_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    summary = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)

class CaseEvidence(Base):
    __tablename__ = "case_evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), index=True, nullable=False)
    evidence_type = Column(String(32), nullable=False)  # ACCOUNT, TRANSACTION, GRAPH_SUBGRAPH, COMPLAINT, GNN_ALERT
    reference_id = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
