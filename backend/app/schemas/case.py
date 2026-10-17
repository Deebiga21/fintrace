from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class EvidenceCreate(BaseModel):
    evidence_type: str  # ACCOUNT, TRANSACTION, GRAPH_SUBGRAPH, COMPLAINT, GNN_ALERT
    reference_id: str
    description: str
    metadata_json: Optional[str] = "{}"

class EvidenceOut(EvidenceCreate):
    id: int
    case_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class CaseBase(BaseModel):
    title: str
    priority: Optional[str] = "High"  # Critical, High, Medium, Low
    assigned_investigator: Optional[str] = "Lead Financial Crime Specialist"
    status: Optional[str] = "New"  # New, Under_Investigation, Escalated, Closed
    primary_account_id: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None

class CaseCreate(CaseBase):
    initial_evidence: Optional[List[EvidenceCreate]] = []

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[str] = None
    assigned_investigator: Optional[str] = None
    status: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None

class CaseOut(CaseBase):
    case_id: str
    created_at: datetime
    updated_at: datetime
    evidence_items: List[EvidenceOut] = []

    class Config:
        from_attributes = True
