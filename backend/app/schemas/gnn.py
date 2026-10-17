from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class GNNTrainRequest(BaseModel):
    epochs: Optional[int] = 100
    learning_rate: Optional[float] = 0.01
    hidden_dim: Optional[int] = 32
    num_layers: Optional[int] = 2

class GNNTrainResponse(BaseModel):
    status: str
    model_name: str
    run_id: int
    num_nodes: int
    num_edges: int
    epochs: int
    final_loss: float
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: List[List[int]]
    is_trained_on_ground_truth: bool
    notes: str

class GNNInferenceResponse(BaseModel):
    total_accounts_scored: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    execution_time_ms: float
    is_trained_model: bool
    status: str

class AccountRiskExplanation(BaseModel):
    account_id: str
    customer_name: Optional[str]
    risk_score: float
    risk_level: str
    prediction_confidence: float
    is_simulated: bool
    structural_features: Dict[str, Any]
    detected_patterns: List[str]
    connected_high_risk_accounts: List[str]
    supporting_transactions_count: int
    graph_context: Dict[str, Any]
