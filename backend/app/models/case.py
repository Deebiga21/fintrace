from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Float
from datetime import datetime
from ..database import Base

class InvestigationCase(Base):
    __tablename__ = "cases"

    case_id = Column(String(64), primary_key=True, index=True)
    case_number = Column(String(64), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    priority = Column(String(32), default="High")  # Critical, High, Medium, Low
    assigned_investigator = Column(String(128), default="Lead Financial Crime Specialist")
    status = Column(String(32), default="New")  # New, Under_Investigation, Escalated, Closed, Reopened
    primary_account_id = Column(String(64), ForeignKey("accounts.account_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(128), default="Investigator")
    source_type = Column(String(64), default="GNN Alert")
    source_reference_id = Column(String(128), nullable=True)
    summary = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)
    closure_reason = Column(Text, nullable=True)
    version = Column(Integer, default=1)

class CaseEvidence(Base):
    __tablename__ = "case_evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), index=True, nullable=False)
    evidence_type = Column(String(32), nullable=False)  # ACCOUNT, TRANSACTION, GRAPH_SUBGRAPH, COMPLAINT, GNN_ALERT, DOCUMENT
    reference_id = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

class CaseAccount(Base):
    __tablename__ = "case_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), index=True, nullable=False)
    account_id = Column(String(64), ForeignKey("accounts.account_id"), index=True, nullable=False)
    role = Column(String(64), default="Conduit Mule Account")
    notes = Column(Text, nullable=True)
    linked_at = Column(DateTime, default=datetime.utcnow)
    linked_by = Column(String(128), default="Investigator")

class CaseTransaction(Base):
    __tablename__ = "case_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), index=True, nullable=False)
    transaction_id = Column(String(64), ForeignKey("transactions.transaction_id"), index=True, nullable=False)
    relevance = Column(String(128), default="Suspected Layering Transfer")
    notes = Column(Text, nullable=True)
    linked_at = Column(DateTime, default=datetime.utcnow)
    linked_by = Column(String(128), default="Investigator")

class CaseComplaint(Base):
    __tablename__ = "case_complaints"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), index=True, nullable=False)
    complaint_id = Column(String(64), ForeignKey("complaints.complaint_id"), index=True, nullable=False)
    linked_at = Column(DateTime, default=datetime.utcnow)
    linked_by = Column(String(128), default="Investigator")
