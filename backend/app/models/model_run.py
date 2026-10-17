from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text
from datetime import datetime
from ..database import Base

class ModelRun(Base):
    __tablename__ = "model_runs"

    run_id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    model_name = Column(String(128), default="GraphSAGE (PyTorch Geometric)")
    architecture = Column(String(64), default="2-layer GraphSAGE with Mean Aggregator")
    num_nodes = Column(Integer, default=0)
    num_edges = Column(Integer, default=0)
    epochs = Column(Integer, default=100)
    train_loss = Column(Float, nullable=True)
    val_loss = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    confusion_matrix_json = Column(Text, nullable=True)  # [[TN, FP], [FN, TP]]
    is_trained_on_ground_truth = Column(Boolean, default=False)
    hyperparameters_json = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
