use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Alert {
    pub alert_id: String,
    pub target_type: String, // ACCOUNT, TRANSACTION
    pub target_id: String,
    pub severity: String,    // Critical, High, Medium, Low
    pub reason_code: String,
    pub status: String,      // New, Investigating, Escalated, Resolved, Dismissed
    pub assigned_to: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateAlertRequest {
    pub target_type: String,
    pub target_id: String,
    pub severity: String,
    pub reason_code: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAlertRequest {
    pub status: Option<String>,
    pub assigned_to: Option<String>,
    pub notes: Option<String>,
}
