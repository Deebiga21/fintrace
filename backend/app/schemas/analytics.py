from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class DashboardOverview(BaseModel):
    total_accounts: int
    total_transactions: int
    total_volume: float
    flagged_accounts: int
    high_risk_accounts: int
    medium_risk_accounts: int
    low_risk_accounts: int
    open_cases: int
    closed_cases: int
    total_complaints: int
    total_complaint_amount: float
    risk_distribution: Dict[str, int]
    top_suspicious_patterns: Dict[str, int]
    recent_suspicious_accounts: List[Dict[str, Any]]
    transaction_volume_by_day: List[Dict[str, Any]]

class GraphNode(BaseModel):
    id: str
    label: str
    risk_level: str
    risk_score: float
    account_type: str
    balance: float
    flags: List[str]

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    amount: float
    timestamp: str
    is_suspicious: bool
    transaction_type: str

class GraphDataResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    statistics: Dict[str, Any]

class AuditLogOut(BaseModel):
    id: int
    timestamp: str
    user: str
    action: str
    target_type: Optional[str]
    target_id: Optional[str]
    details: Optional[str]
