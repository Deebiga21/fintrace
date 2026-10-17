from sqlalchemy import Column, String, Float, DateTime, Boolean, Text, ForeignKey, Index
from datetime import datetime
from ..database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String(64), primary_key=True, index=True)
    sender_account = Column(String(64), ForeignKey("accounts.account_id"), index=True, nullable=False)
    receiver_account = Column(String(64), ForeignKey("accounts.account_id"), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(32), default="COMPLETED")  # COMPLETED, PENDING, FAILED
    transaction_type = Column(String(32), default="IMPS")  # IMPS, NEFT, RTGS, UPI, WIRE
    description = Column(String(255), nullable=True)

    # Flagging
    is_suspicious = Column(Boolean, default=False)
    flag_reason = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_sender_receiver", "sender_account", "receiver_account"),
        Index("idx_timestamp_amount", "timestamp", "amount"),
    )
