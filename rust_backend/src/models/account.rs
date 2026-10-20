use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Account {
    pub account_id: String,
    pub customer_name: Option<String>,
    pub account_type: Option<String>,
    pub created_at: Option<String>,
    pub initial_balance: Option<f64>,
    pub current_balance: Option<f64>,
    pub status: Option<String>,

    // GNN & detection metrics
    pub risk_score: Option<f64>,
    pub risk_level: Option<String>,
    pub prediction_confidence: Option<f64>,
    pub is_ground_truth_mule: Option<bool>,

    // Graph features
    pub total_incoming: Option<f64>,
    pub total_outgoing: Option<f64>,
    pub in_degree: Option<i64>,
    pub out_degree: Option<i64>,
    pub unique_counterparties: Option<i64>,
    pub avg_txn_interval_hours: Option<f64>,
    pub turnover_ratio: Option<f64>,

    // Behavioral flags
    pub flags_json: Option<String>,
    pub embedding_json: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccountExplanation {
    pub account_id: String,
    pub customer_name: Option<String>,
    pub risk_score: f64,
    pub risk_level: String,
    pub confidence: f64,
    pub prediction_confidence: f64,
    pub is_simulated: bool,
    pub turnover_ratio: f64,
    pub in_degree: i64,
    pub out_degree: i64,
    pub total_incoming: f64,
    pub total_outgoing: f64,
    pub unique_counterparties: i64,
    pub flags: Vec<String>,
    pub detected_patterns: Vec<String>,
    pub connected_high_risk_accounts: Vec<String>,
    pub supporting_transactions_count: i64,
    pub structural_features: serde_json::Value,
    pub graph_context: serde_json::Value,
    pub embedding_summary: Option<String>,
    pub structural_signals: serde_json::Value,
}
