from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class EvidenceCreate(BaseModel):
    evidence_type: str  # ACCOUNT, TRANSACTION, GRAPH_SUBGRAPH, COMPLAINT, GNN_ALERT, DOCUMENT
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
    status: Optional[str] = "New"  # New, Under_Investigation, Escalated, Closed, Reopened
    primary_account_id: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None

class CaseCreate(CaseBase):
    initial_evidence: Optional[List[EvidenceCreate]] = []
    source_type: Optional[str] = "Manual"
    source_reference_id: Optional[str] = None
    created_by: Optional[str] = "Investigator"

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[str] = None
    assigned_investigator: Optional[str] = None
    status: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None
    closure_reason: Optional[str] = None
    version: Optional[int] = None

class StatusUpdateRequest(BaseModel):
    status: str
    closure_reason: Optional[str] = None
    version: Optional[int] = None

class PriorityUpdateRequest(BaseModel):
    priority: str
    version: Optional[int] = None

class AssigneeUpdateRequest(BaseModel):
    assigned_investigator: str
    version: Optional[int] = None

class FindingsUpdateRequest(BaseModel):
    summary: Optional[str] = None
    findings: Optional[str] = None
    version: Optional[int] = None

class LinkAccountRequest(BaseModel):
    account_id: str
    role: Optional[str] = "Conduit Mule Account"
    notes: Optional[str] = "Linked via Investigation Case Docket"

class UnlinkAccountRequest(BaseModel):
    account_id: str

class LinkTransactionRequest(BaseModel):
    transaction_id: str
    relevance: Optional[str] = "Suspected Layering Transfer"
    notes: Optional[str] = "Linked via Investigation Case Docket"

class UnlinkTransactionRequest(BaseModel):
    transaction_id: str

class LinkComplaintRequest(BaseModel):
    complaint_id: str

class CaseSummaryOut(BaseModel):
    total_cases: int
    active_cases: int
    critical_priority: int
    high_priority: int
    closed_cases: int

class CaseOut(CaseBase):
    case_id: str
    case_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = "Investigator"
    source_type: Optional[str] = "GNN Alert"
    source_reference_id: Optional[str] = None
    closure_reason: Optional[str] = None
    version: Optional[int] = 1
    evidence_count: Optional[int] = 0
    evidence_items: List[EvidenceOut] = []
    linked_accounts: Optional[List[Any]] = []
    linked_transactions: Optional[List[Any]] = []
    correlated_complaints: Optional[List[Any]] = []
    audit_logs: Optional[List[Any]] = []

    class Config:
        from_attributes = True
