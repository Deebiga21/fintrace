from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ComplaintBase(BaseModel):
    complaint_id: str
    date_reported: datetime
    complainant_name: str
    description: str
    reported_account_id: str
    transaction_id: Optional[str] = None
    amount_lost: float
    status: Optional[str] = "New"
    source: Optional[str] = "National Cyber Crime Portal"

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintOut(ComplaintBase):
    created_at: datetime

    class Config:
        from_attributes = True
