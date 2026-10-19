use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InvestigationCase {
    pub case_id: String,
    pub title: String,
    pub priority: Option<String>,
    pub assigned_investigator: Option<String>,
    pub status: Option<String>,
    pub primary_account_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub summary: Option<String>,
    pub findings: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CaseEvidence {
    pub id: i64,
    pub case_id: String,
    pub evidence_type: String,
    pub reference_id: String,
    pub description: String,
    pub metadata_json: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCaseRequest {
    pub title: String,
    pub priority: Option<String>,
    pub assigned_investigator: Option<String>,
    pub primary_account_id: Option<String>,
    pub summary: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCaseRequest {
    pub title: Option<String>,
    pub priority: Option<String>,
    pub assigned_investigator: Option<String>,
    pub status: Option<String>,
    pub summary: Option<String>,
    pub findings: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddEvidenceRequest {
    pub evidence_type: String,
    pub reference_id: String,
    pub description: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct CaseDossier {
    pub case_id: String,
    pub title: String,
    pub priority: String,
    pub status: String,
    pub assigned_investigator: String,
    pub created_at: String,
    pub updated_at: String,
    pub summary: Option<String>,
    pub findings: Option<String>,
    pub primary_account: Option<crate::models::account::Account>,
    pub evidence: Vec<CaseEvidence>,
    pub legal_attestation: String,
}
