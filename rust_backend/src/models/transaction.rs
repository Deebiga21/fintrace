use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Transaction {
    pub transaction_id: String,
    pub sender_account: String,
    pub receiver_account: String,
    pub amount: f64,
    pub timestamp: Option<String>,
    pub status: Option<String>,
    pub transaction_type: Option<String>,
    pub description: Option<String>,
    pub is_suspicious: Option<bool>,
    pub flag_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TransactionFilterParams {
    pub skip: Option<i64>,
    pub limit: Option<i64>,
    pub account_id: Option<String>,
    pub transaction_type: Option<String>,
    pub is_suspicious: Option<bool>,
    pub min_amount: Option<f64>,
    pub max_amount: Option<f64>,
}
