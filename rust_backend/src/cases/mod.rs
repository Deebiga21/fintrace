use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;

use crate::{
    database::DbPool,
    errors::AppError,
    models::{
        account::Account,
        case::{AddEvidenceRequest, CaseDossier, CaseEvidence, CreateCaseRequest, InvestigationCase, UpdateCaseRequest},
    },
};

#[derive(Debug, Deserialize)]
pub struct CaseFilterParams {
    pub status: Option<String>,
    pub priority: Option<String>,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/", get(list_cases))
        .route("/", post(create_case))
        .route("/:id", get(get_case))
        .route("/:id", put(update_case))
        .route("/:id/evidence", post(add_evidence))
        .route("/:id/dossier", get(get_dossier))
        .with_state(pool)
}

async fn list_cases(
    State(pool): State<DbPool>,
    Query(params): Query<CaseFilterParams>,
) -> Result<impl IntoResponse, AppError> {
    let mut query = String::from("SELECT case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings FROM cases WHERE 1=1");

    if let Some(ref st) = params.status {
        query.push_str(&format!(" AND status = '{}'", st));
    }

    if let Some(ref pr) = params.priority {
        query.push_str(&format!(" AND priority = '{}'", pr));
    }

    query.push_str(" ORDER BY created_at DESC");

    let cases = sqlx::query_as::<_, InvestigationCase>(&query)
        .fetch_all(&pool)
        .await?;

    Ok(Json(json!({
        "total": cases.len(),
        "cases": cases
    })))
}

async fn get_case(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let kase = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings FROM cases WHERE case_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found", id)))?;

    let evidence = sqlx::query_as::<_, CaseEvidence>(
        "SELECT id, case_id, evidence_type, reference_id, description, metadata_json, created_at FROM case_evidence WHERE case_id = $1 ORDER BY created_at DESC"
    )
    .bind(&id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(json!({
        "case": kase,
        "evidence": evidence
    })))
}

async fn create_case(
    State(pool): State<DbPool>,
    Json(payload): Json<CreateCaseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let case_id = format!("CASE-{}", uuid::Uuid::new_v4().to_string().replace("-", "")[..8].to_uppercase());
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO cases (case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings)
        VALUES ($1, $2, $3, $4, 'New', $5, $6, $6, $7, '')
        "#
    )
    .bind(&case_id)
    .bind(&payload.title)
    .bind(payload.priority.as_deref().unwrap_or("High"))
    .bind(payload.assigned_investigator.as_deref().unwrap_or("Lead Financial Crime Specialist"))
    .bind(&payload.primary_account_id)
    .bind(&now)
    .bind(payload.summary.as_deref().unwrap_or(""))
    .execute(&pool)
    .await?;

    // Record audit event
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES (datetime('now'), 'Investigator', 'CASE_CREATED', 'CASE', $1, $2)"
    )
    .bind(&case_id)
    .bind(format!("Created investigation docket: {}", payload.title))
    .execute(&pool)
    .await;

    let kase = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings FROM cases WHERE case_id = $1"
    )
    .bind(&case_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(kase))
}

async fn update_case(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCaseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now().to_rfc3339();

    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings FROM cases WHERE case_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found", id)))?;

    let title = payload.title.unwrap_or(existing.title);
    let priority = payload.priority.unwrap_or(existing.priority.unwrap_or_else(|| "High".to_string()));
    let assigned = payload.assigned_investigator.unwrap_or(existing.assigned_investigator.unwrap_or_else(|| "Lead Financial Crime Specialist".to_string()));
    let status = payload.status.unwrap_or(existing.status.unwrap_or_else(|| "New".to_string()));
    let summary = payload.summary.or(existing.summary);
    let findings = payload.findings.or(existing.findings);

    sqlx::query(
        r#"
        UPDATE cases SET
            title = $1,
            priority = $2,
            assigned_investigator = $3,
            status = $4,
            summary = $5,
            findings = $6,
            updated_at = $7
        WHERE case_id = $8
        "#
    )
    .bind(&title)
    .bind(&priority)
    .bind(&assigned)
    .bind(&status)
    .bind(&summary)
    .bind(&findings)
    .bind(&now)
    .bind(&id)
    .execute(&pool)
    .await?;

    // Record audit event
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES (datetime('now'), 'Investigator', 'CASE_UPDATED', 'CASE', $1, $2)"
    )
    .bind(&id)
    .bind(format!("Updated case docket status to {}", status))
    .execute(&pool)
    .await;

    let updated = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings FROM cases WHERE case_id = $1"
    )
    .bind(&id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(updated))
}

async fn add_evidence(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<AddEvidenceRequest>,
) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now().to_rfc3339();
    let meta_str = payload.metadata.map(|m| m.to_string()).unwrap_or_else(|| "{}".to_string());

    sqlx::query(
        r#"
        INSERT INTO case_evidence (case_id, evidence_type, reference_id, description, metadata_json, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#
    )
    .bind(&id)
    .bind(&payload.evidence_type)
    .bind(&payload.reference_id)
    .bind(&payload.description)
    .bind(&meta_str)
    .bind(&now)
    .execute(&pool)
    .await?;

    let evidence = sqlx::query_as::<_, CaseEvidence>(
        "SELECT id, case_id, evidence_type, reference_id, description, metadata_json, created_at FROM case_evidence WHERE case_id = $1 ORDER BY id DESC LIMIT 1"
    )
    .bind(&id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(evidence))
}

async fn get_dossier(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let kase = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings FROM cases WHERE case_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found", id)))?;

    let evidence = sqlx::query_as::<_, CaseEvidence>(
        "SELECT id, case_id, evidence_type, reference_id, description, metadata_json, created_at FROM case_evidence WHERE case_id = $1 ORDER BY created_at ASC"
    )
    .bind(&id)
    .fetch_all(&pool)
    .await?;

    let primary_acc = if let Some(ref acc_id) = kase.primary_account_id {
        sqlx::query_as::<_, Account>(
            "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
        )
        .bind(acc_id)
        .fetch_optional(&pool)
        .await?
    } else {
        None
    };

    let dossier = CaseDossier {
        case_id: kase.case_id,
        title: kase.title,
        priority: kase.priority.unwrap_or_else(|| "High".to_string()),
        status: kase.status.unwrap_or_else(|| "New".to_string()),
        assigned_investigator: kase.assigned_investigator.unwrap_or_else(|| "Special Investigator".to_string()),
        created_at: kase.created_at.unwrap_or_default(),
        updated_at: kase.updated_at.unwrap_or_default(),
        summary: kase.summary,
        findings: kase.findings,
        primary_account: primary_acc,
        evidence,
        legal_attestation: "OFFICIAL LAW ENFORCEMENT & FIU DOSSIER - GENERATED UNDER PRECAUTIONARY FINANCIAL CRIME INVESTIGATION PROTOCOL".to_string(),
    };

    Ok(Json(dossier))
}
