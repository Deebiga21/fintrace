from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AccountBase(BaseModel):
    account_id: str
    customer_name: Optional[str] = None
    account_type: Optional[str] = "Savings"
    initial_balance: Optional[float] = 1000.0
    current_balance: Optional[float] = 1000.0
    status: Optional[str] = "Active"

class AccountOut(AccountBase):
    risk_score: float
    risk_level: str
    prediction_confidence: float
    is_ground_truth_mule: Optional[bool] = None
    total_incoming: float
    total_outgoing: float
    in_degree: int
    out_degree: int
    unique_counterparties: int
    avg_txn_interval_hours: float
    turnover_ratio: float
    flags: List[str] = []
    created_at: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class AccountFilter(BaseModel):
    risk_level: Optional[str] = None
    min_risk_score: Optional[float] = None
    search: Optional[str] = None
    account_type: Optional[str] = None
