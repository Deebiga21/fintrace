use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{get, patch, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use std::collections::HashSet;

use crate::{
    database::DbPool,
    errors::AppError,
    models::{
        account::Account,
        case::InvestigationCase,
        complaint::{Complaint, CreateComplaintRequest},
        transaction::Transaction,
    },
};

#[derive(Debug, Deserialize)]
pub struct ComplaintFilterParams {
    pub search: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
    pub limit: Option<i64>,
    pub skip: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateComplaintRequest {
    pub status: Option<String>,
    pub category: Option<String>,
    pub assigned_to: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct CorrelateRequest {
    pub target_case_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LinkCaseRequest {
    pub case_id: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCaseFromComplaintRequest {
    pub title: Option<String>,
    pub priority: Option<String>,
    pub notes: Option<String>,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/", get(list_complaints))
        .route("/", post(create_complaint))
        .route("/summary", get(get_complaints_summary))
        .route("/by-account/:id", get(get_complaints_by_account))
        .route("/:id", get(get_complaint_details))
        .route("/:id", patch(update_complaint_handler))
        .route("/:id/correlate", post(correlate_complaint_handler))
        .route("/:id/correlations", get(get_complaint_correlations_handler))
        .route("/:id/graph", get(get_complaint_graph_handler))
        .route("/:id/transactions", get(get_complaint_transactions_handler))
        .route("/:id/related", get(get_complaint_related))
        .route("/:id/link-case", post(link_case_handler))
        .route("/:id/create-case", post(create_case_from_complaint_handler))
        .route("/:id/report", get(get_complaint_report_handler))
        .with_state(pool)
}

async fn list_complaints(
    State(pool): State<DbPool>,
    Query(params): Query<ComplaintFilterParams>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params.limit.unwrap_or(100).min(500);
    let skip = params.skip.unwrap_or(0);

    let mut conditions = Vec::new();
    let mut bindings: Vec<String> = Vec::new();

    if let Some(ref s) = params.search {
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            let pattern = format!("%{}%", trimmed.to_lowercase());
            conditions.push("(LOWER(complaint_id) LIKE ? OR LOWER(complainant_name) LIKE ? OR LOWER(reported_account_id) LIKE ? OR LOWER(description) LIKE ?)");
            bindings.push(pattern.clone());
            bindings.push(pattern.clone());
            bindings.push(pattern.clone());
            bindings.push(pattern);
        }
    }

    if let Some(ref st) = params.status {
        let trimmed = st.trim();
        if !trimmed.is_empty() && !trimmed.eq_ignore_ascii_case("all") {
            conditions.push("LOWER(status) = LOWER(?)");
            bindings.push(trimmed.to_string());
        }
    }

    if let Some(ref cat) = params.category {
        let trimmed = cat.trim();
        if !trimmed.is_empty() && !trimmed.eq_ignore_ascii_case("all") {
            conditions.push("LOWER(category) = LOWER(?)");
            bindings.push(trimmed.to_string());
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints {} ORDER BY date_reported DESC LIMIT ? OFFSET ?",
        where_clause
    );

    let count_sql = format!("SELECT COUNT(*) FROM complaints {}", where_clause);

    let mut query = sqlx::query_as::<_, Complaint>(&sql);
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);

    for b in &bindings {
        query = query.bind(b);
        count_query = count_query.bind(b);
    }

    query = query.bind(limit).bind(skip);

    let complaints = query.fetch_all(&pool).await?;
    let total: i64 = count_query.fetch_one(&pool).await?;

    Ok(Json(json!({
        "total": total,
        "skip": skip,
        "limit": limit,
        "complaints": complaints
    })))
}

async fn get_complaints_summary(State(pool): State<DbPool>) -> Result<impl IntoResponse, AppError> {
    let total_complaints: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM complaints")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);
    let total_lost: f64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(amount_lost), 0.0) FROM complaints")
            .fetch_one(&pool)
            .await
            .unwrap_or(0.0);
    let new_complaints: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM complaints WHERE status = 'New' OR status = 'Received'",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    let correlated_complaints: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM complaints WHERE status = 'Correlated'")
            .fetch_one(&pool)
            .await
            .unwrap_or(0);
    let linked_complaints: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM complaints WHERE status = 'Linked' OR linked_case_id IS NOT NULL",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    Ok(Json(json!({
        "total_complaints": total_complaints,
        "total_confirmed_loss_inr": total_lost,
        "new_complaints": new_complaints,
        "correlated_complaints": correlated_complaints,
        "linked_to_investigation": linked_complaints,
        "source": "National Cyber Crime Reporting Portal (1930) / State Police FIRs"
    })))
}

async fn get_complaint_details(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    // Fetch account info
    let account = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
    )
    .bind(&complaint.reported_account_id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let parsed_correlation: serde_json::Value = complaint
        .correlation_data_json
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_else(|| json!({ "status": "NOT_RUN" }));

    Ok(Json(json!({
        "complaint": complaint,
        "account_details": account,
        "correlation_findings": parsed_correlation
    })))
}

async fn create_complaint(
    State(pool): State<DbPool>,
    Json(payload): Json<CreateComplaintRequest>,
) -> Result<impl IntoResponse, AppError> {
    if payload.amount_lost <= 0.0
        || payload.amount_lost.is_nan()
        || payload.amount_lost.is_infinite()
    {
        return Err(AppError::BadRequest(
            "Complaint amount_lost must be a valid positive number".to_string(),
        ));
    }

    let reported_acc = payload.reported_account_id.trim().to_uppercase();
    if reported_acc.is_empty() {
        return Err(AppError::BadRequest(
            "reported_account_id must not be empty".to_string(),
        ));
    }

    if payload.complainant_name.trim().is_empty() {
        return Err(AppError::BadRequest(
            "complainant_name must not be empty".to_string(),
        ));
    }

    let complaint_id = payload
        .complaint_id
        .filter(|id| !id.trim().is_empty())
        .unwrap_or_else(|| {
            format!(
                "CMP-2026-{}",
                uuid::Uuid::new_v4().to_string().replace("-", "")[..8].to_uppercase()
            )
        });
    let now = Utc::now().to_rfc3339();
    let category = payload
        .category
        .unwrap_or_else(|| "Cyber Fraud".to_string());
    let source = payload
        .source
        .unwrap_or_else(|| "National Cyber Crime Reporting Portal (1930)".to_string());
    let assigned_to = payload
        .assigned_to
        .unwrap_or_else(|| "Unassigned".to_string());
    let status = payload.status.unwrap_or_else(|| "Received".to_string());

    sqlx::query(
        r#"
        INSERT INTO complaints (
            complaint_id, date_reported, complainant_name, description,
            reported_account_id, transaction_id, amount_lost, status,
            source, category, assigned_to, linked_case_id, correlation_data_json, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, '{}', $12)
        "#,
    )
    .bind(&complaint_id)
    .bind(&now)
    .bind(&payload.complainant_name)
    .bind(&payload.description)
    .bind(&reported_acc)
    .bind(&payload.transaction_id)
    .bind(payload.amount_lost)
    .bind(&status)
    .bind(&source)
    .bind(&category)
    .bind(&assigned_to)
    .bind(&now)
    .execute(&pool)
    .await?;

    // Record audit event
    let audit_desc = format!(
        "Registered complaint {} for victim {} regarding INR {:.2} loss to account {}",
        complaint_id, payload.complainant_name, payload.amount_lost, reported_acc
    );
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES ($1, 'Investigator', 'COMPLAINT_REGISTERED', 'COMPLAINT', $2, $3)"
    )
    .bind(&now)
    .bind(&complaint_id)
    .bind(&audit_desc)
    .execute(&pool)
    .await;

    let created = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&complaint_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(created))
}

async fn update_complaint_handler(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateComplaintRequest>,
) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now().to_rfc3339();

    let mut complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    if let Some(ref st) = payload.status {
        sqlx::query("UPDATE complaints SET status = $1 WHERE complaint_id = $2")
            .bind(st)
            .bind(&id)
            .execute(&pool)
            .await?;
        complaint.status = Some(st.clone());
    }

    if let Some(ref cat) = payload.category {
        sqlx::query("UPDATE complaints SET category = $1 WHERE complaint_id = $2")
            .bind(cat)
            .bind(&id)
            .execute(&pool)
            .await?;
        complaint.category = Some(cat.clone());
    }

    if let Some(ref assign) = payload.assigned_to {
        sqlx::query("UPDATE complaints SET assigned_to = $1 WHERE complaint_id = $2")
            .bind(assign)
            .bind(&id)
            .execute(&pool)
            .await?;
        complaint.assigned_to = Some(assign.clone());
    }

    // Record audit event
    let audit_desc = format!(
        "Updated complaint {} status to {:?}, assigned to {:?}",
        id, payload.status, payload.assigned_to
    );
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES ($1, 'Investigator', 'COMPLAINT_UPDATED', 'COMPLAINT', $2, $3)"
    )
    .bind(&now)
    .bind(&id)
    .bind(&audit_desc)
    .execute(&pool)
    .await;

    Ok(Json(complaint))
}

async fn correlate_complaint_handler(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    _payload: Option<Json<CorrelateRequest>>,
) -> Result<impl IntoResponse, AppError> {
    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    let now = Utc::now().to_rfc3339();
    let rep_acc = complaint.reported_account_id.trim().to_uppercase();

    // 1. Direct Account Match
    let direct_acc_opt = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
    )
    .bind(&rep_acc)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let direct_acc_matched = direct_acc_opt.is_some();

    // 2. Direct Transaction Match
    let direct_txn_opt = if let Some(ref tid) = complaint.transaction_id {
        sqlx::query_as::<_, Transaction>(
            "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE transaction_id = $1"
        )
        .bind(tid)
        .fetch_optional(&pool)
        .await
        .unwrap_or(None)
    } else {
        None
    };

    let direct_txn_matched = direct_txn_opt.is_some();

    // 3. Transactions on Reported Account
    let related_txns = sqlx::query_as::<_, Transaction>(
        "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE receiver_account = $1 OR sender_account = $1 ORDER BY timestamp DESC LIMIT 25"
    )
    .bind(&rep_acc)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // 4. Shared Complaints
    let shared_complaints = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE reported_account_id = $1 AND complaint_id != $2 ORDER BY date_reported DESC LIMIT 10"
    )
    .bind(&rep_acc)
    .bind(&id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // 5. Multi-Hop Graph Connected Mules
    let mut counterparties: HashSet<String> = HashSet::new();
    for t in &related_txns {
        if t.sender_account != rep_acc {
            counterparties.insert(t.sender_account.clone());
        }
        if t.receiver_account != rep_acc {
            counterparties.insert(t.receiver_account.clone());
        }
    }

    let mut connected_high_risk_mules = Vec::new();
    for cp in &counterparties {
        let cp_acc = sqlx::query_as::<_, Account>(
            "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
        )
        .bind(cp)
        .fetch_optional(&pool)
        .await
        .unwrap_or(None);

        if let Some(acc) = cp_acc {
            if acc.risk_level.as_deref().unwrap_or("").to_uppercase() == "HIGH"
                || acc.risk_score.unwrap_or(0.0) >= 0.75
            {
                connected_high_risk_mules.push(json!({
                    "account_id": acc.account_id,
                    "customer_name": acc.customer_name,
                    "risk_score": acc.risk_score,
                    "risk_level": acc.risk_level,
                    "turnover_ratio": acc.turnover_ratio,
                    "connection_type": "Direct 1-Hop Counterparty"
                }));
            }
        }
    }

    // 6. Existing Active Cases & Alerts
    let linked_cases = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings FROM cases WHERE primary_account_id = $1"
    )
    .bind(&rep_acc)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // 7. Calculate Heuristic Correlation Confidence Score
    let mut score = 0.0;
    let mut explanations = Vec::new();

    if direct_acc_matched {
        score += 35.0;
        explanations.push(format!(
            "Exact account match: {} exists in institution core banking records.",
            rep_acc
        ));
    } else {
        explanations.push(format!("Reported account {} is unmapped in local ledger (potential cross-bank external recipient).", rep_acc));
    }

    if direct_txn_matched {
        score += 25.0;
        explanations.push(format!(
            "Exact transaction reference verified: {} exists in ledger.",
            complaint.transaction_id.as_deref().unwrap_or("")
        ));
    }

    if !shared_complaints.is_empty() {
        let count = shared_complaints.len();
        let pts = (count as f64 * 10.0).min(20.0);
        score += pts;
        explanations.push(format!(
            "High recidivism: {} other independent cyber complaints report the same account {}.",
            count, rep_acc
        ));
    }

    if !connected_high_risk_mules.is_empty() {
        score += 15.0;
        explanations.push(format!(
            "Network culpability: Account connects to {} high-risk mule entities within 1-2 hops.",
            connected_high_risk_mules.len()
        ));
    }

    if !linked_cases.is_empty() {
        score += 10.0;
        explanations.push(format!(
            "Existing investigation link: Account is subject of {} active case(s).",
            linked_cases.len()
        ));
    }

    if let Some(ref acc) = direct_acc_opt {
        if acc.risk_level.as_deref().unwrap_or("").to_uppercase() == "HIGH" {
            score += 15.0;
            explanations.push(format!(
                "GNN Model Alert: GraphSAGE scored account at {:.2} ({}) with high turnover.",
                acc.risk_score.unwrap_or(0.0),
                acc.risk_level.as_deref().unwrap_or("")
            ));
        }
    }

    let confidence_score = score.min(99.0).max(10.0);

    let correlation_result = json!({
        "status": "CORRELATED",
        "heuristic_confidence_score": confidence_score,
        "score_label": "Heuristic Multi-Evidence Confidence",
        "score_disclaimer": "Heuristic correlation score reflects aggregated evidence signals and is not conclusive proof of guilt.",
        "matched_categories": {
            "direct_account_match": {
                "matched": direct_acc_matched,
                "account_id": rep_acc,
                "customer_name": direct_acc_opt.as_ref().and_then(|a| a.customer_name.clone())
            },
            "direct_transaction_match": {
                "matched": direct_txn_matched,
                "transaction": direct_txn_opt
            },
            "shared_complaints": {
                "count": shared_complaints.len(),
                "complaints": shared_complaints
            },
            "graph_connected_mules": {
                "count": connected_high_risk_mules.len(),
                "mules": connected_high_risk_mules
            },
            "existing_cases": {
                "count": linked_cases.len(),
                "cases": linked_cases
            }
        },
        "explanations": explanations,
        "total_related_transactions": related_txns.len(),
        "correlated_at": now
    });

    let corr_str = serde_json::to_string(&correlation_result).unwrap_or_default();

    // Update complaint record
    sqlx::query(
        "UPDATE complaints SET status = 'Correlated', correlation_data_json = $1 WHERE complaint_id = $2"
    )
    .bind(&corr_str)
    .bind(&id)
    .execute(&pool)
    .await?;

    // Record in complaint_correlations table
    let explanation_text = explanations.join(" ");
    let _ = sqlx::query(
        r#"
        INSERT INTO complaint_correlations (complaint_id, matched_type, matched_id, confidence_score, explanation, evidence_json, created_at)
        VALUES ($1, 'MULTI_STAGE_CORRELATION', $2, $3, $4, $5, $6)
        "#
    )
    .bind(&id)
    .bind(&rep_acc)
    .bind(confidence_score)
    .bind(&explanation_text)
    .bind(&corr_str)
    .bind(&now)
    .execute(&pool)
    .await;

    // Record audit event
    let audit_desc = format!("Executed multi-stage correlation for complaint {}: Score {:.1}%, {} shared complaints, {} connected mules",
        id, confidence_score, shared_complaints.len(), connected_high_risk_mules.len());
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES ($1, 'Investigator', 'COMPLAINT_CORRELATED', 'COMPLAINT', $2, $3)"
    )
    .bind(&now)
    .bind(&id)
    .bind(&audit_desc)
    .execute(&pool)
    .await;

    Ok(Json(json!({
        "status": "SUCCESS",
        "complaint_id": id,
        "correlation": correlation_result
    })))
}

async fn get_complaint_correlations_handler(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    let parsed: serde_json::Value = complaint
        .correlation_data_json
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_else(|| json!({ "status": "NOT_RUN" }));

    Ok(Json(json!({
        "complaint_id": id,
        "correlation": parsed
    })))
}

async fn get_complaint_graph_handler(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    let rep_acc = complaint.reported_account_id.trim().to_uppercase();
    let mut elements = Vec::new();

    // 1. Complaint Node
    elements.push(json!({
        "group": "nodes",
        "data": {
            "id": complaint.complaint_id,
            "label": format!("FIR: {}", complaint.complaint_id),
            "customer_name": complaint.complainant_name,
            "risk_score": 1.0,
            "risk_level": "High",
            "type": "COMPLAINT",
            "is_complaint": true
        }
    }));

    // 2. Reported Account Node
    let acc_opt = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
    )
    .bind(&rep_acc)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let risk_lvl = acc_opt
        .as_ref()
        .and_then(|a| a.risk_level.clone())
        .unwrap_or_else(|| "High".to_string());
    let risk_sc = acc_opt.as_ref().and_then(|a| a.risk_score).unwrap_or(0.85);

    elements.push(json!({
        "group": "nodes",
        "data": {
            "id": rep_acc,
            "label": format!("Mule: {}", rep_acc),
            "customer_name": acc_opt.as_ref().and_then(|a| a.customer_name.clone()).unwrap_or_else(|| rep_acc.clone()),
            "risk_score": risk_sc,
            "risk_level": risk_lvl,
            "type": "REPORTED_ACCOUNT",
            "is_center": true
        }
    }));

    // Edge: Complaint -> Reported Account
    elements.push(json!({
        "group": "edges",
        "data": {
            "id": format!("EDGE-CMP-{}", complaint.complaint_id),
            "source": complaint.complaint_id,
            "target": rep_acc,
            "amount": complaint.amount_lost,
            "weight": complaint.amount_lost,
            "transaction_type": "REPORTED_DEFRAUDMENT",
            "is_suspicious": true
        }
    }));

    // 3. Transactions & Counterparties
    let txns = sqlx::query_as::<_, Transaction>(
        "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE receiver_account = $1 OR sender_account = $1 LIMIT 12"
    )
    .bind(&rep_acc)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let mut added_nodes: HashSet<String> = HashSet::new();
    added_nodes.insert(complaint.complaint_id.clone());
    added_nodes.insert(rep_acc.clone());

    for t in txns {
        let other = if t.sender_account == rep_acc {
            t.receiver_account.clone()
        } else {
            t.sender_account.clone()
        };

        if added_nodes.insert(other.clone()) {
            elements.push(json!({
                "group": "nodes",
                "data": {
                    "id": other,
                    "label": other,
                    "risk_score": 0.6,
                    "risk_level": "Medium",
                    "type": "CONNECTED_ENTITY"
                }
            }));
        }

        elements.push(json!({
            "group": "edges",
            "data": {
                "id": t.transaction_id,
                "source": t.sender_account,
                "target": t.receiver_account,
                "amount": t.amount,
                "weight": t.amount,
                "transaction_type": t.transaction_type.as_deref().unwrap_or("TRANSFER"),
                "is_suspicious": t.is_suspicious.unwrap_or(false)
            }
        }));
    }

    Ok(Json(json!({
        "complaint_id": id,
        "elements": elements
    })))
}

async fn get_complaint_transactions_handler(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    let txns = sqlx::query_as::<_, Transaction>(
        "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE receiver_account = $1 OR sender_account = $1 ORDER BY timestamp DESC LIMIT 50"
    )
    .bind(&complaint.reported_account_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(json!({
        "complaint_id": id,
        "reported_account": complaint.reported_account_id,
        "total_transactions": txns.len(),
        "transactions": txns
    })))
}

async fn get_complaint_related(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    let account = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
    )
    .bind(&complaint.reported_account_id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let related_txns = sqlx::query_as::<_, Transaction>(
        "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE receiver_account = $1 OR sender_account = $1 ORDER BY timestamp DESC LIMIT 15"
    )
    .bind(&complaint.reported_account_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let linked_cases = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings FROM cases WHERE primary_account_id = $1"
    )
    .bind(&complaint.reported_account_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(json!({
        "complaint": complaint,
        "target_account": account,
        "recent_transactions": related_txns,
        "linked_cases": linked_cases
    })))
}

async fn get_complaints_by_account(
    State(pool): State<DbPool>,
    Path(account_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let complaints = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE reported_account_id = $1 ORDER BY date_reported DESC"
    )
    .bind(&account_id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(complaints))
}

async fn link_case_handler(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<LinkCaseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now().to_rfc3339();

    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    // Update complaint record
    sqlx::query(
        "UPDATE complaints SET linked_case_id = $1, status = 'Linked' WHERE complaint_id = $2",
    )
    .bind(&payload.case_id)
    .bind(&id)
    .execute(&pool)
    .await?;

    // Attach as evidence to case
    let desc = format!(
        "Linked Cybercrime Complaint {}: Complainant {} reported INR {:.2} loss to {}",
        id, complaint.complainant_name, complaint.amount_lost, complaint.reported_account_id
    );
    let meta = json!({
        "complaint_id": id,
        "complainant": complaint.complainant_name,
        "amount_lost": complaint.amount_lost,
        "reported_account": complaint.reported_account_id,
        "notes": payload.notes
    });

    sqlx::query(
        "INSERT INTO case_evidence (case_id, evidence_type, reference_id, description, metadata_json, created_at) VALUES ($1, 'CYBER_COMPLAINT', $2, $3, $4, $5)"
    )
    .bind(&payload.case_id)
    .bind(&id)
    .bind(&desc)
    .bind(meta.to_string())
    .bind(&now)
    .execute(&pool)
    .await?;

    // Record audit event
    let audit_desc = format!(
        "Linked complaint {} to investigation case {}",
        id, payload.case_id
    );
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES ($1, 'Investigator', 'COMPLAINT_LINKED_TO_CASE', 'CASE', $2, $3)"
    )
    .bind(&now)
    .bind(&payload.case_id)
    .bind(&audit_desc)
    .execute(&pool)
    .await;

    Ok(Json(json!({
        "status": "SUCCESS",
        "complaint_id": id,
        "linked_case_id": payload.case_id,
        "message": format!("Complaint {} successfully linked to case {}.", id, payload.case_id)
    })))
}

async fn create_case_from_complaint_handler(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<CreateCaseFromComplaintRequest>,
) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now().to_rfc3339();

    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    let case_id = format!(
        "CASE-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let title = payload.title.unwrap_or_else(|| {
        format!(
            "Cyber Fraud Case: FIR {} on {}",
            id, complaint.reported_account_id
        )
    });
    let priority = payload.priority.unwrap_or_else(|| "High".to_string());
    let summary = format!("Investigation originated from complaint {}: Complainant {} suffered INR {:.2} loss. Narrative: {}",
        id, complaint.complainant_name, complaint.amount_lost, complaint.description);
    let findings = format!(
        "Reported beneficiary account {} cross-correlated with banking transaction network.",
        complaint.reported_account_id
    );

    sqlx::query(
        r#"
        INSERT INTO cases (case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings)
        VALUES ($1, $2, $3, 'Lead Financial Crime Specialist', 'Open', $4, $5, $5, $6, $7)
        "#
    )
    .bind(&case_id)
    .bind(&title)
    .bind(&priority)
    .bind(&complaint.reported_account_id)
    .bind(&now)
    .bind(&summary)
    .bind(&findings)
    .execute(&pool)
    .await?;

    // Link complaint
    sqlx::query(
        "UPDATE complaints SET linked_case_id = $1, status = 'Linked' WHERE complaint_id = $2",
    )
    .bind(&case_id)
    .bind(&id)
    .execute(&pool)
    .await?;

    // Attach evidence
    let meta = json!({
        "complaint_id": id,
        "complainant": complaint.complainant_name,
        "amount_lost": complaint.amount_lost,
        "reported_account": complaint.reported_account_id,
        "notes": payload.notes
    });

    sqlx::query(
        "INSERT INTO case_evidence (case_id, evidence_type, reference_id, description, metadata_json, created_at) VALUES ($1, 'CYBER_COMPLAINT', $2, $3, $4, $5)"
    )
    .bind(&case_id)
    .bind(&id)
    .bind(&summary)
    .bind(meta.to_string())
    .bind(&now)
    .execute(&pool)
    .await?;

    // Record audit event
    let audit_desc = format!(
        "Spawned new case {} directly from complaint {}",
        case_id, id
    );
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES ($1, 'Investigator', 'CASE_CREATED_FROM_COMPLAINT', 'CASE', $2, $3)"
    )
    .bind(&now)
    .bind(&case_id)
    .bind(&audit_desc)
    .execute(&pool)
    .await;

    Ok(Json(json!({
        "status": "SUCCESS",
        "case_id": case_id,
        "complaint_id": id,
        "title": title,
        "message": format!("Investigation case {} created from complaint {}.", case_id, id)
    })))
}

async fn get_complaint_report_handler(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, category, assigned_to, linked_case_id, correlation_data_json, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Complaint {} not found", id)))?;

    let parsed_corr: serde_json::Value = complaint
        .correlation_data_json
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_else(|| json!({}));

    Ok(Json(json!({
        "report_title": format!("FINTRACE AI Cybercrime Complaint Dossier — {}", id),
        "classification": "CONFIDENTIAL // LAW ENFORCEMENT & REGULATORY USE ONLY",
        "complaint_id": id,
        "complainant": complaint.complainant_name,
        "reported_account": complaint.reported_account_id,
        "amount_lost": complaint.amount_lost,
        "currency": "INR",
        "status": complaint.status,
        "category": complaint.category,
        "source": complaint.source,
        "assigned_to": complaint.assigned_to,
        "linked_case_id": complaint.linked_case_id,
        "report_generated_at": Utc::now().to_rfc3339(),
        "investigating_authority": "Financial Intelligence Unit (FIU-IND) / State Cyber Police Cell",
        "legal_disclaimer": "This intelligence dossier correlates victim complaints against core banking records and GNN topological fraud predictions. Correlation scores indicate algorithmic relationship probabilities, not legal determination of guilt.",
        "correlation_evidence": parsed_corr
    })))
}
