use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Complaint {
    pub complaint_id: String,
    pub date_reported: Option<String>,
    pub complainant_name: String,
    pub description: String,
    pub reported_account_id: String,
    pub transaction_id: Option<String>,
    pub amount_lost: f64,
    pub status: Option<String>,
    pub source: Option<String>,
    pub category: Option<String>,
    pub assigned_to: Option<String>,
    pub linked_case_id: Option<String>,
    pub correlation_data_json: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateComplaintRequest {
    pub complaint_id: Option<String>,
    pub complainant_name: String,
    pub description: String,
    pub reported_account_id: String,
    pub transaction_id: Option<String>,
    pub amount_lost: f64,
    pub category: Option<String>,
    pub source: Option<String>,
    pub assigned_to: Option<String>,
    pub status: Option<String>,
}
