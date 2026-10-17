from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TransactionBase(BaseModel):
    transaction_id: str
    sender_account: str
    receiver_account: str
    amount: float
    timestamp: datetime
    status: Optional[str] = "COMPLETED"
    transaction_type: Optional[str] = "IMPS"
    description: Optional[str] = None
    is_suspicious: Optional[bool] = False
    flag_reason: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionOut(TransactionBase):
    class Config:
        from_attributes = True

class TransactionFilter(BaseModel):
    account_id: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_suspicious: Optional[bool] = None
    limit: Optional[int] = 100
    skip: Optional[int] = 0
