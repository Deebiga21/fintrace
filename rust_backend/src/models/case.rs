use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InvestigationCase {
    pub case_id: String,
    pub case_number: Option<String>,
    pub title: String,
    pub priority: Option<String>,
    pub assigned_investigator: Option<String>,
    pub status: Option<String>,
    pub primary_account_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub created_by: Option<String>,
    pub source_type: Option<String>,
    pub source_reference_id: Option<String>,
    pub summary: Option<String>,
    pub findings: Option<String>,
    pub closure_reason: Option<String>,
    pub version: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CaseEvidence {
    pub id: i64,
    pub case_id: String,
    pub evidence_type: String,
    pub reference_id: String,
    pub description: String,
    pub metadata_json: Option<String>,
    pub status: Option<String>,
    pub attached_by: Option<String>,
    pub integrity_hash: Option<String>,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CaseAccount {
    pub id: i64,
    pub case_id: String,
    pub account_id: String,
    pub role: Option<String>,
    pub notes: Option<String>,
    pub linked_at: String,
    pub linked_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CaseTransaction {
    pub id: i64,
    pub case_id: String,
    pub transaction_id: String,
    pub relevance: Option<String>,
    pub notes: Option<String>,
    pub linked_at: String,
    pub linked_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CaseAuditLog {
    pub id: i64,
    pub timestamp: Option<String>,
    pub user: Option<String>,
    pub action: String,
    pub target_type: Option<String>,
    pub target_id: Option<String>,
    pub details: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCaseRequest {
    pub title: String,
    pub priority: Option<String>,
    pub assigned_investigator: Option<String>,
    pub primary_account_id: Option<String>,
    pub summary: Option<String>,
    pub findings: Option<String>,
    pub source_type: Option<String>,
    pub source_reference_id: Option<String>,
    pub created_by: Option<String>,
    pub initial_evidence: Option<Vec<AddEvidenceRequest>>,
    pub initial_accounts: Option<Vec<String>>,
    pub initial_transactions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCaseRequest {
    pub title: Option<String>,
    pub priority: Option<String>,
    pub assigned_investigator: Option<String>,
    pub status: Option<String>,
    pub primary_account_id: Option<String>,
    pub summary: Option<String>,
    pub findings: Option<String>,
    pub closure_reason: Option<String>,
    pub version: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCaseStatusRequest {
    pub status: String,
    pub closure_reason: Option<String>,
    pub version: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCasePriorityRequest {
    pub priority: String,
    pub version: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCaseAssigneeRequest {
    pub assigned_investigator: String,
    pub version: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCaseFindingsRequest {
    pub summary: Option<String>,
    pub findings: Option<String>,
    pub version: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct LinkAccountRequest {
    pub account_id: String,
    pub role: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LinkTransactionRequest {
    pub transaction_id: String,
    pub relevance: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LinkComplaintRequest {
    pub complaint_id: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddEvidenceRequest {
    pub evidence_type: String,
    pub reference_id: String,
    pub description: String,
    pub metadata: Option<serde_json::Value>,
    pub attached_by: Option<String>,
    pub integrity_hash: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CaseDossier {
    pub case_id: String,
    pub case_number: String,
    pub title: String,
    pub priority: String,
    pub status: String,
    pub assigned_investigator: String,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: String,
    pub source_type: String,
    pub source_reference_id: Option<String>,
    pub summary: Option<String>,
    pub findings: Option<String>,
    pub closure_reason: Option<String>,
    pub version: i64,
    pub primary_account: Option<crate::models::account::Account>,
    pub evidence: Vec<CaseEvidence>,
    pub linked_accounts: Vec<serde_json::Value>,
    pub linked_transactions: Vec<serde_json::Value>,
    pub correlated_complaints: Vec<serde_json::Value>,
    pub audit_history: Vec<CaseAuditLog>,
    pub legal_attestation: String,
    pub integrity_seal: String,
}
