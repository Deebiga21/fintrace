from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, Text
from datetime import datetime
from ..database import Base

class Account(Base):
    __tablename__ = "accounts"

    account_id = Column(String(64), primary_key=True, index=True)
    customer_name = Column(String(128), nullable=True)
    account_type = Column(String(32), default="Savings")  # Savings, Current, Mule_Suspect, Shell_Corp, Merchant
    created_at = Column(DateTime, default=datetime.utcnow)
    initial_balance = Column(Float, default=1000.0)
    current_balance = Column(Float, default=1000.0)
    status = Column(String(32), default="Active")  # Active, Flagged, Under_Investigation, Frozen

    # GNN and Detection metrics
    risk_score = Column(Float, default=0.0)  # 0.0 - 1.0
    risk_level = Column(String(16), default="Low")  # Low, Medium, High
    prediction_confidence = Column(Float, default=0.0)
    is_ground_truth_mule = Column(Boolean, nullable=True)  # Used when evaluation ground truth exists

    # Graph engineered features
    total_incoming = Column(Float, default=0.0)
    total_outgoing = Column(Float, default=0.0)
    in_degree = Column(Integer, default=0)
    out_degree = Column(Integer, default=0)
    unique_counterparties = Column(Integer, default=0)
    avg_txn_interval_hours = Column(Float, default=0.0)
    turnover_ratio = Column(Float, default=0.0)  # total_outgoing / (total_incoming + 1e-5)

    # Behavioral flags & explanations
    flags_json = Column(Text, default="[]")  # JSON serialized list of pattern signals
    embedding_json = Column(Text, nullable=True)  # GraphSAGE latent representation vector
    notes = Column(Text, nullable=True)
