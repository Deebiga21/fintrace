use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{delete, get, patch, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::info;

use crate::{
    database::DbPool,
    errors::AppError,
    models::{
        account::Account,
        case::{
            AddEvidenceRequest, CaseAuditLog, CaseDossier, CaseEvidence, CreateCaseRequest,
            InvestigationCase, LinkAccountRequest, LinkComplaintRequest, LinkTransactionRequest,
            UpdateCaseAssigneeRequest, UpdateCaseFindingsRequest, UpdateCasePriorityRequest,
            UpdateCaseRequest, UpdateCaseStatusRequest,
        },
        user::User,
    },
};

#[derive(Clone)]
pub struct CasesState {
    pub pool: DbPool,
    pub ws_tx: broadcast::Sender<String>,
}

#[derive(Debug, Deserialize)]
pub struct CaseFilterParams {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub search: Option<String>,
    pub investigator: Option<String>,
    pub source_type: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

fn compute_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

fn broadcast_case_event(
    ws_tx: &broadcast::Sender<String>,
    event_type: &str,
    case_id: &str,
    action: &str,
    details: serde_json::Value,
) {
    let payload = json!({
        "event": event_type,
        "case_id": case_id,
        "action": action,
        "timestamp": Utc::now().to_rfc3339(),
        "data": details
    });
    let _ = ws_tx.send(payload.to_string());
}

async fn record_case_audit(pool: &DbPool, user: &str, action: &str, case_id: &str, details: &str) {
    let now = Utc::now().to_rfc3339();
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES ($1, $2, $3, 'CASE', $4, $5)"
    )
    .bind(&now)
    .bind(user)
    .bind(action)
    .bind(case_id)
    .bind(details)
    .execute(pool)
    .await;
}

async fn generate_unique_case_number(pool: &DbPool) -> String {
    let year = Utc::now().format("%Y").to_string();
    for _ in 0..10 {
        let rand_chars: String = (0..5)
            .map(|_| {
                let chars = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                chars[rand::random::<usize>() % chars.len()] as char
            })
            .collect();
        let candidate = format!("CASE-{}-{}", year, rand_chars);
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM cases WHERE case_number = $1 OR case_id = $1")
                .bind(&candidate)
                .fetch_one(pool)
                .await
                .unwrap_or(0);
        if count == 0 {
            return candidate;
        }
    }
    format!(
        "CASE-{}-{}",
        year,
        &uuid::Uuid::new_v4().to_string().replace("-", "")[..6].to_uppercase()
    )
}

pub fn router(pool: DbPool) -> Router {
    let (tx, _) = broadcast::channel(100);
    router_with_ws(pool, tx)
}

pub fn router_with_ws(pool: DbPool, ws_tx: broadcast::Sender<String>) -> Router {
    let state = Arc::new(CasesState { pool, ws_tx });

    Router::new()
        .route("/", get(list_cases))
        .route("/", post(create_case))
        .route("/summary", get(get_cases_summary))
        .route("/investigators", get(get_investigators))
        .route("/:id", get(get_case))
        .route("/:id", put(update_case))
        .route("/:id", patch(update_case))
        .route("/:id/status", post(update_case_status))
        .route("/:id/priority", post(update_case_priority))
        .route("/:id/assignee", post(update_case_assignee))
        .route("/:id/findings", post(update_case_findings))
        .route("/:id/link-account", post(link_account))
        .route("/:id/unlink-account", post(unlink_account))
        .route("/:id/link-transaction", post(link_transaction))
        .route("/:id/unlink-transaction", post(unlink_transaction))
        .route("/:id/link-complaint", post(link_complaint))
        .route("/:id/evidence", get(list_case_evidence))
        .route("/:id/evidence", post(add_evidence))
        .route("/:id/evidence/:evidence_id", delete(remove_evidence))
        .route("/:id/audit", get(get_case_audit))
        .route("/:id/dossier", get(get_dossier))
        .route("/evidence/:evidence_id", get(get_evidence_by_id))
        .with_state(state)
}

pub fn evidence_router(pool: DbPool) -> Router {
    let (tx, _) = broadcast::channel(100);
    evidence_router_with_ws(pool, tx)
}

pub fn evidence_router_with_ws(pool: DbPool, ws_tx: broadcast::Sender<String>) -> Router {
    let state = Arc::new(CasesState { pool, ws_tx });

    Router::new()
        .route("/:evidence_id", get(get_evidence_by_id))
        .with_state(state)
}

async fn list_cases(
    State(state): State<Arc<CasesState>>,
    Query(params): Query<CaseFilterParams>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let mut query = String::from(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE 1=1",
    );
    // Values are always passed as bound parameters; only fixed SQL fragments are formatted in.
    let mut bindings: Vec<String> = Vec::new();

    if let Some(ref st) = params.status {
        let trimmed = st.trim();
        if !trimmed.is_empty() && trimmed.to_uppercase() != "ALL" {
            if trimmed == "Under_Investigation" || trimmed == "Under Investigation" {
                query.push_str(" AND (status = 'Under_Investigation' OR status = 'Under Investigation' OR status = 'Active Investigation')");
            } else {
                query.push_str(" AND status = ?");
                bindings.push(trimmed.to_string());
            }
        }
    }

    if let Some(ref pr) = params.priority {
        let trimmed = pr.trim();
        if !trimmed.is_empty() && trimmed.to_uppercase() != "ALL" {
            query.push_str(" AND priority = ?");
            bindings.push(trimmed.to_string());
        }
    }

    if let Some(ref inv) = params.investigator {
        let trimmed = inv.trim();
        if !trimmed.is_empty() && trimmed.to_uppercase() != "ALL" {
            query.push_str(" AND assigned_investigator = ?");
            bindings.push(trimmed.to_string());
        }
    }

    if let Some(ref src) = params.source_type {
        let trimmed = src.trim();
        if !trimmed.is_empty() && trimmed.to_uppercase() != "ALL" {
            query.push_str(" AND source_type = ?");
            bindings.push(trimmed.to_string());
        }
    }

    if let Some(ref s) = params.search {
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            let pattern = format!("%{}%", trimmed);
            query.push_str(
                " AND (case_id LIKE ? OR case_number LIKE ? OR title LIKE ? OR summary LIKE ? OR primary_account_id LIKE ? OR assigned_investigator LIKE ?)",
            );
            for _ in 0..6 {
                bindings.push(pattern.clone());
            }
        }
    }

    let sort_col = match params.sort_by.as_deref() {
        Some("priority") => "priority",
        Some("title") => "title",
        Some("status") => "status",
        Some("updated_at") => "updated_at",
        _ => "created_at",
    };
    let sort_dir = match params.sort_dir.as_deref() {
        Some("asc") | Some("ASC") => "ASC",
        _ => "DESC",
    };
    query.push_str(&format!(" ORDER BY {} {}", sort_col, sort_dir));

    let limit = params.limit.unwrap_or(100).min(300);
    let offset = params.offset.unwrap_or(0).max(0);
    query.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

    let cases = {
        let mut q = sqlx::query_as::<_, InvestigationCase>(&query);
        for value in &bindings {
            q = q.bind(value);
        }
        q.fetch_all(pool).await?
    };

    let total_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM cases")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    // Enrich each case with counts of active evidence and linked accounts
    let mut enriched_cases = Vec::with_capacity(cases.len());
    for c in cases {
        let ev_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM case_evidence WHERE case_id = $1 AND (status != 'Removed' OR status IS NULL)"
        )
        .bind(&c.case_id)
        .fetch_one(pool)
        .await
        .unwrap_or(0);

        let acc_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM case_accounts WHERE case_id = $1")
                .bind(&c.case_id)
                .fetch_one(pool)
                .await
                .unwrap_or(0);

        let txn_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM case_transactions WHERE case_id = $1")
                .bind(&c.case_id)
                .fetch_one(pool)
                .await
                .unwrap_or(0);

        enriched_cases.push(json!({
            "case_id": c.case_id,
            "case_number": c.case_number.as_deref().unwrap_or(&c.case_id),
            "title": c.title,
            "priority": c.priority.as_deref().unwrap_or("Medium"),
            "assigned_investigator": c.assigned_investigator.as_deref().unwrap_or("Lead Financial Crime Specialist"),
            "status": c.status.as_deref().unwrap_or("New"),
            "primary_account_id": c.primary_account_id,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "created_by": c.created_by.as_deref().unwrap_or("Investigator"),
            "source_type": c.source_type.as_deref().unwrap_or("Manual"),
            "source_reference_id": c.source_reference_id,
            "summary": c.summary,
            "findings": c.findings,
            "closure_reason": c.closure_reason,
            "version": c.version.unwrap_or(1),
            "evidence_count": ev_count,
            "evidence_items": vec![0; ev_count as usize], // for backward compatibility with length check
            "accounts_count": acc_count,
            "transactions_count": txn_count
        }));
    }

    Ok(Json(json!({
        "total": total_count,
        "count": enriched_cases.len(),
        "limit": limit,
        "offset": offset,
        "cases": enriched_cases
    })))
}

async fn get_case(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let trimmed = id.trim();
    if trimmed.is_empty() || trimmed == "undefined" || trimmed == "null" {
        return Err(AppError::BadRequest(
            "Invalid case ID: case ID cannot be empty or 'undefined'.".to_string(),
        ));
    }

    let kase = sqlx::query_as::<_, InvestigationCase>(
        r#"
        SELECT case_id, case_number, title, priority, assigned_investigator, status,
               primary_account_id, created_at, updated_at, created_by, source_type,
               source_reference_id, summary, findings, closure_reason, version
        FROM cases
        WHERE case_id = $1 OR case_number = $1
        "#,
    )
    .bind(trimmed)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", trimmed)))?;

    // Active evidence items
    let evidence = sqlx::query_as::<_, CaseEvidence>(
        r#"
        SELECT id, case_id, evidence_type, reference_id, description, metadata_json,
               status, attached_by, integrity_hash, file_path, file_name, file_size, created_at
        FROM case_evidence
        WHERE case_id = $1 AND (status != 'Removed' OR status IS NULL)
        ORDER BY id DESC
        "#,
    )
    .bind(&kase.case_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    // Linked Accounts with details
    let linked_accounts = sqlx::query_as::<
        _,
        (
            i64,
            String,
            Option<String>,
            Option<String>,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<f64>,
            Option<f64>,
        ),
    >(
        r#"
        SELECT ca.id, ca.account_id, ca.role, ca.notes, ca.linked_at, ca.linked_by,
               a.customer_name, a.risk_level, a.risk_score, a.current_balance
        FROM case_accounts ca
        LEFT JOIN accounts a ON ca.account_id = a.account_id
        WHERE ca.case_id = $1
        ORDER BY ca.id ASC
        "#,
    )
    .bind(&kase.case_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let accounts_json: Vec<serde_json::Value> = linked_accounts
        .into_iter()
        .map(
            |(id, acc_id, role, notes, linked_at, linked_by, cust_name, risk_lvl, risk_sc, bal)| {
                json!({
                    "id": id,
                    "account_id": acc_id,
                    "role": role.unwrap_or_else(|| "Suspect Account".to_string()),
                    "notes": notes,
                    "linked_at": linked_at,
                    "linked_by": linked_by.unwrap_or_else(|| "Investigator".to_string()),
                    "customer_name": cust_name,
                    "risk_level": risk_lvl.unwrap_or_else(|| "Suspect".to_string()),
                    "risk_score": risk_sc.unwrap_or(0.0),
                    "current_balance": bal.unwrap_or(0.0)
                })
            },
        )
        .collect();

    // Linked Transactions with details
    let linked_txns = sqlx::query_as::<
        _,
        (
            i64,
            String,
            Option<String>,
            Option<String>,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<f64>,
            Option<String>,
        ),
    >(
        r#"
        SELECT ct.id, ct.transaction_id, ct.relevance, ct.notes, ct.linked_at, ct.linked_by,
               t.sender_account, t.receiver_account, t.amount, t.timestamp
        FROM case_transactions ct
        LEFT JOIN transactions t ON ct.transaction_id = t.transaction_id
        WHERE ct.case_id = $1
        ORDER BY ct.id ASC
        "#,
    )
    .bind(&kase.case_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let txns_json: Vec<serde_json::Value> = linked_txns
        .into_iter()
        .map(
            |(id, txn_id, relevance, notes, linked_at, linked_by, sender, receiver, amount, ts)| {
                json!({
                    "id": id,
                    "transaction_id": txn_id,
                    "relevance": relevance.unwrap_or_else(|| "Flagged Transfer".to_string()),
                    "notes": notes,
                    "linked_at": linked_at,
                    "linked_by": linked_by.unwrap_or_else(|| "Investigator".to_string()),
                    "sender_account": sender,
                    "receiver_account": receiver,
                    "amount": amount.unwrap_or(0.0),
                    "timestamp": ts
                })
            },
        )
        .collect();

    // Correlated Complaints
    let complaints = sqlx::query_as::<
        _,
        (
            String,
            Option<String>,
            String,
            Option<String>,
            f64,
            Option<String>,
        ),
    >(
        r#"
        SELECT complaint_id, date_reported, complainant_name, description, amount_lost, status
        FROM complaints
        WHERE linked_case_id = $1
        ORDER BY date_reported DESC
        "#,
    )
    .bind(&kase.case_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let complaints_json: Vec<serde_json::Value> = complaints
        .into_iter()
        .map(|(cid, dt, name, desc, loss, st)| {
            json!({
                "complaint_id": cid,
                "date_reported": dt,
                "complainant_name": name,
                "description": desc,
                "amount_lost": loss,
                "status": st.unwrap_or_else(|| "Linked".to_string())
            })
        })
        .collect();

    // Audit logs for this case
    let audits = sqlx::query_as::<_, CaseAuditLog>(
        r#"
        SELECT id, timestamp, user, action, target_type, target_id, details
        FROM audit_logs
        WHERE (target_type = 'CASE' AND target_id = $1)
           OR target_id = $2
           OR details LIKE '%' || $1 || '%'
        ORDER BY id DESC
        LIMIT 50
        "#,
    )
    .bind(&kase.case_id)
    .bind(kase.case_number.as_deref().unwrap_or(&kase.case_id))
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    // Primary account details
    let primary_acc = if let Some(ref acc_id) = kase.primary_account_id {
        sqlx::query_as::<_, Account>(
            "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
        )
        .bind(acc_id)
        .fetch_optional(pool)
        .await?
    } else {
        None
    };

    Ok(Json(json!({
        "case_id": kase.case_id,
        "case_number": kase.case_number.as_deref().unwrap_or(&kase.case_id),
        "title": kase.title,
        "priority": kase.priority.as_deref().unwrap_or("High"),
        "assigned_investigator": kase.assigned_investigator.as_deref().unwrap_or("Lead Financial Crime Specialist"),
        "status": kase.status.as_deref().unwrap_or("New"),
        "primary_account_id": kase.primary_account_id,
        "created_at": kase.created_at,
        "updated_at": kase.updated_at,
        "created_by": kase.created_by.as_deref().unwrap_or("Investigator"),
        "source_type": kase.source_type.as_deref().unwrap_or("Manual"),
        "source_reference_id": kase.source_reference_id,
        "summary": kase.summary,
        "findings": kase.findings,
        "closure_reason": kase.closure_reason,
        "version": kase.version.unwrap_or(1),
        "evidence_items": evidence,
        "evidence": evidence,
        "linked_accounts": accounts_json,
        "linked_transactions": txns_json,
        "correlated_complaints": complaints_json,
        "audit_logs": audits,
        "primary_account": primary_acc,
        "case": kase
    })))
}

async fn create_case(
    State(state): State<Arc<CasesState>>,
    Json(payload): Json<CreateCaseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Investigation case title cannot be empty.".to_string(),
        ));
    }

    // Validate primary subject account if supplied
    if let Some(ref acc_id) = payload.primary_account_id {
        let trimmed = acc_id.trim();
        if !trimmed.is_empty() {
            let exists: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM accounts WHERE account_id = $1")
                    .bind(trimmed)
                    .fetch_one(pool)
                    .await
                    .unwrap_or(0);
            if exists == 0 {
                return Err(AppError::BadRequest(format!(
                    "Primary subject account '{}' not found in core ledger. Please specify a valid bank account.",
                    trimmed
                )));
            }
        }
    }

    // Reject initial evidence that cannot be resolved to a stored source record;
    // otherwise a newly created dossier could contain a fabricated reference.
    if let Some(items) = payload.initial_evidence.as_ref() {
        for item in items {
            let reference = item.reference_id.trim();
            let evidence_type = item.evidence_type.trim().to_uppercase();
            let table = match evidence_type.as_str() {
                "ACCOUNT" => "accounts",
                "TRANSACTION" => "transactions",
                "COMPLAINT" => "complaints",
                _ => return Err(AppError::BadRequest(format!(
                    "Unsupported initial evidence type '{}'. Use ACCOUNT, TRANSACTION, or COMPLAINT.",
                    item.evidence_type
                ))),
            };
            let key = match evidence_type.as_str() {
                "ACCOUNT" => "account_id",
                "TRANSACTION" => "transaction_id",
                _ => "complaint_id",
            };
            let query = format!("SELECT COUNT(*) FROM {} WHERE {} = $1", table, key);
            let exists: i64 = sqlx::query_scalar(&query)
                .bind(reference)
                .fetch_one(pool)
                .await?;
            if reference.is_empty() || exists == 0 {
                return Err(AppError::BadRequest(format!(
                    "{} evidence reference '{}' was not found in the database.",
                    evidence_type, reference
                )));
            }
        }
    }

    let case_number = generate_unique_case_number(pool).await;
    let case_id = case_number.clone();
    let now = Utc::now().to_rfc3339();

    let priority = payload.priority.as_deref().unwrap_or("High");
    let assigned = payload
        .assigned_investigator
        .as_deref()
        .unwrap_or("Lead Financial Crime Specialist");
    let source_type = payload.source_type.as_deref().unwrap_or("Manual");
    let created_by = payload.created_by.as_deref().unwrap_or(assigned);

    sqlx::query(
        r#"
        INSERT INTO cases (case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, version)
        VALUES ($1, $1, $2, $3, $4, 'New', $5, $6, $6, $7, $8, $9, $10, $11, 1)
        "#,
    )
    .bind(&case_id)
    .bind(payload.title.trim())
    .bind(priority)
    .bind(assigned)
    .bind(&payload.primary_account_id)
    .bind(&now)
    .bind(created_by)
    .bind(source_type)
    .bind(&payload.source_reference_id)
    .bind(payload.summary.as_deref().unwrap_or(""))
    .bind(payload.findings.as_deref().unwrap_or(""))
    .execute(pool)
    .await?;

    // Link primary account into case_accounts if present
    if let Some(ref acc_id) = payload.primary_account_id {
        let _ = sqlx::query(
            "INSERT OR IGNORE INTO case_accounts (case_id, account_id, role, notes, linked_at, linked_by) VALUES ($1, $2, 'Primary Subject', 'Primary investigative subject account', $3, $4)"
        )
        .bind(&case_id)
        .bind(acc_id)
        .bind(&now)
        .bind(created_by)
        .execute(pool)
        .await;
    }

    // Attach initial evidence items if supplied
    if let Some(ev_list) = payload.initial_evidence {
        for ev in ev_list {
            let hash_input = format!("{}:{}:{}", ev.reference_id, ev.description, now);
            let integrity_hash = ev
                .integrity_hash
                .unwrap_or_else(|| compute_sha256(hash_input.as_bytes()));
            let meta_str = ev
                .metadata
                .map(|m| m.to_string())
                .unwrap_or_else(|| "{}".to_string());

            let _ = sqlx::query(
                r#"
                INSERT INTO case_evidence (case_id, evidence_type, reference_id, description, metadata_json, status, attached_by, integrity_hash, created_at)
                VALUES ($1, $2, $3, $4, $5, 'Active', $6, $7, $8)
                "#
            )
            .bind(&case_id)
            .bind(&ev.evidence_type)
            .bind(&ev.reference_id)
            .bind(&ev.description)
            .bind(&meta_str)
            .bind(created_by)
            .bind(&integrity_hash)
            .bind(&now)
            .execute(pool)
            .await;

            if ev.evidence_type.to_uppercase() == "ACCOUNT" {
                let _ = sqlx::query(
                    "INSERT OR IGNORE INTO case_accounts (case_id, account_id, role, notes, linked_at, linked_by) VALUES ($1, $2, 'Investigative Evidence', $3, $4, $5)"
                )
                .bind(&case_id)
                .bind(&ev.reference_id)
                .bind(&ev.description)
                .bind(&now)
                .bind(created_by)
                .execute(pool)
                .await;
            } else if ev.evidence_type.to_uppercase() == "TRANSACTION" {
                let _ = sqlx::query(
                    "INSERT OR IGNORE INTO case_transactions (case_id, transaction_id, relevance, notes, linked_at, linked_by) VALUES ($1, $2, 'Evidentiary Transaction', $3, $4, $5)"
                )
                .bind(&case_id)
                .bind(&ev.reference_id)
                .bind(&ev.description)
                .bind(&now)
                .bind(created_by)
                .execute(pool)
                .await;
            }
        }
    }

    // Link initial accounts if supplied
    if let Some(accs) = payload.initial_accounts {
        for acc in accs {
            let _ = sqlx::query(
                "INSERT OR IGNORE INTO case_accounts (case_id, account_id, role, notes, linked_at, linked_by) VALUES ($1, $2, 'Associated Syndicate Account', 'Linked during case intake', $3, $4)"
            )
            .bind(&case_id)
            .bind(&acc)
            .bind(&now)
            .bind(created_by)
            .execute(pool)
            .await;
        }
    }

    // Link initial transactions if supplied
    if let Some(txns) = payload.initial_transactions {
        for txn in txns {
            let _ = sqlx::query(
                "INSERT OR IGNORE INTO case_transactions (case_id, transaction_id, relevance, notes, linked_at, linked_by) VALUES ($1, $2, 'Suspected Money Mule Trail', 'Linked during case intake', $3, $4)"
            )
            .bind(&case_id)
            .bind(&txn)
            .bind(&now)
            .bind(created_by)
            .execute(pool)
            .await;
        }
    }

    // If case was spawned from a complaint, link complaint
    if let Some(ref ref_id) = payload.source_reference_id {
        if source_type.to_uppercase() == "COMPLAINT" || ref_id.starts_with("CMP-") {
            let _ =
                sqlx::query("UPDATE complaints SET linked_case_id = $1 WHERE complaint_id = $2")
                    .bind(&case_id)
                    .bind(ref_id)
                    .execute(pool)
                    .await;
        }
    }

    // Record audit event
    record_case_audit(
        pool,
        created_by,
        "CASE_CREATED",
        &case_id,
        &format!(
            "Initiated investigation case {}: {}",
            case_id, payload.title
        ),
    )
    .await;

    // Broadcast real-time event
    broadcast_case_event(
        &state.ws_tx,
        "case.created",
        &case_id,
        "CASE_CREATED",
        json!({
            "case_id": case_id,
            "case_number": case_id,
            "title": payload.title,
            "priority": priority,
            "assigned_investigator": assigned,
            "status": "New",
            "primary_account_id": payload.primary_account_id,
            "created_at": now
        }),
    );

    let kase = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1"
    )
    .bind(&case_id)
    .fetch_one(pool)
    .await?;

    info!("Investigation case {} created successfully", case_id);
    Ok(Json(kase))
}

async fn update_case(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCaseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let trimmed = id.trim();
    if trimmed.is_empty() || trimmed == "undefined" || trimmed == "null" {
        return Err(AppError::BadRequest(
            "Invalid case ID: case ID cannot be empty or 'undefined'.".to_string(),
        ));
    }

    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(trimmed)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", trimmed)))?;

    // Optimistic concurrency check
    if let Some(exp_v) = payload.version {
        let current_v = existing.version.unwrap_or(1);
        if exp_v != current_v {
            return Err(AppError::BadRequest(format!(
                "Concurrency Conflict: Case has been modified by another investigator (expected v{}, currently at v{}). Please reload before saving.",
                exp_v, current_v
            )));
        }
    }

    // Validate primary subject account if changed
    if let Some(ref new_acc) = payload.primary_account_id {
        let acc_trimmed = new_acc.trim();
        if !acc_trimmed.is_empty() && Some(acc_trimmed.to_string()) != existing.primary_account_id {
            let exists: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM accounts WHERE account_id = $1")
                    .bind(acc_trimmed)
                    .fetch_one(pool)
                    .await
                    .unwrap_or(0);
            if exists == 0 {
                return Err(AppError::BadRequest(format!(
                    "Subject account '{}' not found in core ledger.",
                    acc_trimmed
                )));
            }
        }
    }

    let title = payload.title.unwrap_or(existing.title);
    let priority = payload
        .priority
        .unwrap_or(existing.priority.unwrap_or_else(|| "High".to_string()));
    let assigned = payload.assigned_investigator.unwrap_or(
        existing
            .assigned_investigator
            .unwrap_or_else(|| "Lead Financial Crime Specialist".to_string()),
    );
    let status = payload
        .status
        .unwrap_or(existing.status.unwrap_or_else(|| "New".to_string()));
    let summary = payload.summary.or(existing.summary);
    let findings = payload.findings.or(existing.findings);
    let closure_reason = payload.closure_reason.or(existing.closure_reason);
    let primary_acc = payload.primary_account_id.or(existing.primary_account_id);
    let new_version = existing.version.unwrap_or(1) + 1;
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        UPDATE cases SET
            title = $1,
            priority = $2,
            assigned_investigator = $3,
            status = $4,
            primary_account_id = $5,
            summary = $6,
            findings = $7,
            closure_reason = $8,
            version = $9,
            updated_at = $10
        WHERE case_id = $11
        "#,
    )
    .bind(&title)
    .bind(&priority)
    .bind(&assigned)
    .bind(&status)
    .bind(&primary_acc)
    .bind(&summary)
    .bind(&findings)
    .bind(&closure_reason)
    .bind(new_version)
    .bind(&now)
    .bind(&existing.case_id)
    .execute(pool)
    .await?;

    // Record audit event
    let change_details = format!(
        "Updated case {}: Status='{}', Priority='{}', Assignee='{}', Version={}",
        existing.case_id, status, priority, assigned, new_version
    );
    record_case_audit(
        pool,
        &assigned,
        "CASE_UPDATED",
        &existing.case_id,
        &change_details,
    )
    .await;

    // Broadcast real-time event
    broadcast_case_event(
        &state.ws_tx,
        "case.updated",
        &existing.case_id,
        "CASE_UPDATED",
        json!({
            "case_id": existing.case_id,
            "title": title,
            "status": status,
            "priority": priority,
            "assigned_investigator": assigned,
            "version": new_version,
            "updated_at": now
        }),
    );

    let updated = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1"
    )
    .bind(&existing.case_id)
    .fetch_one(pool)
    .await?;

    let evidence = sqlx::query_as::<_, CaseEvidence>(
        "SELECT id, case_id, evidence_type, reference_id, description, metadata_json, status, attached_by, integrity_hash, file_path, file_name, file_size, created_at FROM case_evidence WHERE case_id = $1 AND (status != 'Removed' OR status IS NULL) ORDER BY id DESC"
    )
    .bind(&existing.case_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    Ok(Json(json!({
        "case_id": updated.case_id,
        "case_number": updated.case_number.as_deref().unwrap_or(&updated.case_id),
        "title": updated.title,
        "priority": updated.priority,
        "assigned_investigator": updated.assigned_investigator,
        "status": updated.status,
        "primary_account_id": updated.primary_account_id,
        "created_at": updated.created_at,
        "updated_at": updated.updated_at,
        "summary": updated.summary,
        "findings": updated.findings,
        "closure_reason": updated.closure_reason,
        "version": updated.version.unwrap_or(new_version),
        "evidence_items": evidence,
        "evidence": evidence,
        "case": updated
    })))
}

async fn update_case_status(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCaseStatusRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let old_status = existing.status.unwrap_or_else(|| "New".to_string());
    let new_status = payload.status.trim();
    let new_version = existing.version.unwrap_or(1) + 1;
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE cases SET status = $1, closure_reason = $2, version = $3, updated_at = $4 WHERE case_id = $5"
    )
    .bind(new_status)
    .bind(&payload.closure_reason)
    .bind(new_version)
    .bind(&now)
    .bind(&existing.case_id)
    .execute(pool)
    .await?;

    let actor = existing
        .assigned_investigator
        .unwrap_or_else(|| "Investigator".to_string());
    record_case_audit(
        pool,
        &actor,
        "STATUS_CHANGED",
        &existing.case_id,
        &format!("Status transition: {} -> {}", old_status, new_status),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.status_changed",
        &existing.case_id,
        "STATUS_CHANGED",
        json!({
            "case_id": existing.case_id,
            "old_status": old_status,
            "new_status": new_status,
            "version": new_version,
            "updated_at": now
        }),
    );

    Ok(Json(json!({
        "case_id": existing.case_id,
        "status": new_status,
        "version": new_version,
        "updated_at": now
    })))
}

async fn update_case_priority(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCasePriorityRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let old_prio = existing.priority.unwrap_or_else(|| "Medium".to_string());
    let new_prio = payload.priority.trim();
    let new_version = existing.version.unwrap_or(1) + 1;
    let now = Utc::now().to_rfc3339();

    sqlx::query("UPDATE cases SET priority = $1, version = $2, updated_at = $3 WHERE case_id = $4")
        .bind(new_prio)
        .bind(new_version)
        .bind(&now)
        .bind(&existing.case_id)
        .execute(pool)
        .await?;

    let actor = existing
        .assigned_investigator
        .unwrap_or_else(|| "Investigator".to_string());
    record_case_audit(
        pool,
        &actor,
        "PRIORITY_CHANGED",
        &existing.case_id,
        &format!("Priority escalated/adjusted: {} -> {}", old_prio, new_prio),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.priority_changed",
        &existing.case_id,
        "PRIORITY_CHANGED",
        json!({
            "case_id": existing.case_id,
            "old_priority": old_prio,
            "new_priority": new_prio,
            "version": new_version,
            "updated_at": now
        }),
    );

    Ok(Json(json!({
        "case_id": existing.case_id,
        "priority": new_prio,
        "version": new_version,
        "updated_at": now
    })))
}

async fn update_case_assignee(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCaseAssigneeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let old_inv = existing
        .assigned_investigator
        .unwrap_or_else(|| "Unassigned".to_string());
    let new_inv = payload.assigned_investigator.trim();
    let new_version = existing.version.unwrap_or(1) + 1;
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE cases SET assigned_investigator = $1, version = $2, updated_at = $3 WHERE case_id = $4",
    )
    .bind(new_inv)
    .bind(new_version)
    .bind(&now)
    .bind(&existing.case_id)
    .execute(pool)
    .await?;

    record_case_audit(
        pool,
        "Supervisor",
        "ASSIGNEE_CHANGED",
        &existing.case_id,
        &format!("Reassigned case docket: {} -> {}", old_inv, new_inv),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.assignee_changed",
        &existing.case_id,
        "ASSIGNEE_CHANGED",
        json!({
            "case_id": existing.case_id,
            "old_assignee": old_inv,
            "new_assignee": new_inv,
            "version": new_version,
            "updated_at": now
        }),
    );

    Ok(Json(json!({
        "case_id": existing.case_id,
        "assigned_investigator": new_inv,
        "version": new_version,
        "updated_at": now
    })))
}

async fn update_case_findings(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCaseFindingsRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let summary = payload.summary.or(existing.summary);
    let findings = payload.findings.or(existing.findings);
    let new_version = existing.version.unwrap_or(1) + 1;
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE cases SET summary = $1, findings = $2, version = $3, updated_at = $4 WHERE case_id = $5",
    )
    .bind(&summary)
    .bind(&findings)
    .bind(new_version)
    .bind(&now)
    .bind(&existing.case_id)
    .execute(pool)
    .await?;

    let actor = existing
        .assigned_investigator
        .unwrap_or_else(|| "Investigator".to_string());
    record_case_audit(
        pool,
        &actor,
        "FINDINGS_UPDATED",
        &existing.case_id,
        "Saved investigative summary and mule network forensic findings",
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.findings_updated",
        &existing.case_id,
        "FINDINGS_UPDATED",
        json!({
            "case_id": existing.case_id,
            "summary": summary,
            "findings": findings,
            "version": new_version,
            "updated_at": now
        }),
    );

    Ok(Json(json!({
        "case_id": existing.case_id,
        "summary": summary,
        "findings": findings,
        "version": new_version,
        "updated_at": now
    })))
}

async fn link_account(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<LinkAccountRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let acc_trimmed = payload.account_id.trim();
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts WHERE account_id = $1")
        .bind(acc_trimmed)
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    if exists == 0 {
        return Err(AppError::BadRequest(format!(
            "Cannot link account '{}': Account not found in core ledger.",
            acc_trimmed
        )));
    }

    let now = Utc::now().to_rfc3339();
    let role = payload.role.as_deref().unwrap_or("Suspect Account");
    let actor = existing
        .assigned_investigator
        .as_deref()
        .unwrap_or("Investigator");

    sqlx::query(
        r#"
        INSERT INTO case_accounts (case_id, account_id, role, notes, linked_at, linked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT(case_id, account_id) DO UPDATE SET role = $3, notes = $4
        "#,
    )
    .bind(&existing.case_id)
    .bind(acc_trimmed)
    .bind(role)
    .bind(&payload.notes)
    .bind(&now)
    .bind(actor)
    .execute(pool)
    .await?;

    record_case_audit(
        pool,
        actor,
        "ACCOUNT_LINKED",
        &existing.case_id,
        &format!("Linked subject/mule account: {} ({})", acc_trimmed, role),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.linked_record_added",
        &existing.case_id,
        "ACCOUNT_LINKED",
        json!({
            "case_id": existing.case_id,
            "type": "ACCOUNT",
            "account_id": acc_trimmed,
            "role": role,
            "linked_at": now
        }),
    );

    Ok(Json(json!({
        "case_id": existing.case_id,
        "account_id": acc_trimmed,
        "role": role,
        "linked_at": now
    })))
}

async fn unlink_account(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<LinkAccountRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let acc_trimmed = payload.account_id.trim();
    sqlx::query("DELETE FROM case_accounts WHERE case_id = $1 AND account_id = $2")
        .bind(&existing.case_id)
        .bind(acc_trimmed)
        .execute(pool)
        .await?;

    let actor = existing
        .assigned_investigator
        .as_deref()
        .unwrap_or("Investigator");
    record_case_audit(
        pool,
        actor,
        "ACCOUNT_UNLINKED",
        &existing.case_id,
        &format!("Unlinked subject account: {}", acc_trimmed),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.linked_record_removed",
        &existing.case_id,
        "ACCOUNT_UNLINKED",
        json!({
            "case_id": existing.case_id,
            "type": "ACCOUNT",
            "account_id": acc_trimmed
        }),
    );

    Ok(Json(
        json!({ "case_id": existing.case_id, "account_id": acc_trimmed, "status": "unlinked" }),
    ))
}

async fn link_transaction(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<LinkTransactionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let txn_trimmed = payload.transaction_id.trim();
    let exists: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM transactions WHERE transaction_id = $1")
            .bind(txn_trimmed)
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    if exists == 0 {
        return Err(AppError::BadRequest(format!(
            "Cannot link transaction '{}': Transaction not found in transaction database.",
            txn_trimmed
        )));
    }

    let now = Utc::now().to_rfc3339();
    let relevance = payload
        .relevance
        .as_deref()
        .unwrap_or("Flagged Layering Transfer");
    let actor = existing
        .assigned_investigator
        .as_deref()
        .unwrap_or("Investigator");

    sqlx::query(
        r#"
        INSERT INTO case_transactions (case_id, transaction_id, relevance, notes, linked_at, linked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT(case_id, transaction_id) DO UPDATE SET relevance = $3, notes = $4
        "#,
    )
    .bind(&existing.case_id)
    .bind(txn_trimmed)
    .bind(relevance)
    .bind(&payload.notes)
    .bind(&now)
    .bind(actor)
    .execute(pool)
    .await?;

    record_case_audit(
        pool,
        actor,
        "TRANSACTION_LINKED",
        &existing.case_id,
        &format!("Linked transaction evidence: {}", txn_trimmed),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.linked_record_added",
        &existing.case_id,
        "TRANSACTION_LINKED",
        json!({
            "case_id": existing.case_id,
            "type": "TRANSACTION",
            "transaction_id": txn_trimmed,
            "relevance": relevance,
            "linked_at": now
        }),
    );

    Ok(Json(json!({
        "case_id": existing.case_id,
        "transaction_id": txn_trimmed,
        "relevance": relevance,
        "linked_at": now
    })))
}

async fn unlink_transaction(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<LinkTransactionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let txn_trimmed = payload.transaction_id.trim();
    sqlx::query("DELETE FROM case_transactions WHERE case_id = $1 AND transaction_id = $2")
        .bind(&existing.case_id)
        .bind(txn_trimmed)
        .execute(pool)
        .await?;

    let actor = existing
        .assigned_investigator
        .as_deref()
        .unwrap_or("Investigator");
    record_case_audit(
        pool,
        actor,
        "TRANSACTION_UNLINKED",
        &existing.case_id,
        &format!("Unlinked transaction: {}", txn_trimmed),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.linked_record_removed",
        &existing.case_id,
        "TRANSACTION_UNLINKED",
        json!({
            "case_id": existing.case_id,
            "type": "TRANSACTION",
            "transaction_id": txn_trimmed
        }),
    );

    Ok(Json(json!({
        "case_id": existing.case_id,
        "transaction_id": txn_trimmed,
        "status": "unlinked"
    })))
}

async fn link_complaint(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<LinkComplaintRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let cid = payload.complaint_id.trim();
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM complaints WHERE complaint_id = $1")
        .bind(cid)
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    if exists == 0 {
        return Err(AppError::BadRequest(format!(
            "Complaint '{}' not found in database.",
            cid
        )));
    }

    sqlx::query("UPDATE complaints SET linked_case_id = $1 WHERE complaint_id = $2")
        .bind(&existing.case_id)
        .bind(cid)
        .execute(pool)
        .await?;

    let actor = existing
        .assigned_investigator
        .as_deref()
        .unwrap_or("Investigator");
    record_case_audit(
        pool,
        actor,
        "COMPLAINT_LINKED",
        &existing.case_id,
        &format!("Cross-correlated cyber complaint FIR: {}", cid),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.linked_record_added",
        &existing.case_id,
        "COMPLAINT_LINKED",
        json!({
            "case_id": existing.case_id,
            "type": "COMPLAINT",
            "complaint_id": cid
        }),
    );

    Ok(Json(json!({
        "case_id": existing.case_id,
        "complaint_id": cid,
        "status": "linked"
    })))
}

async fn add_evidence(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
    Json(payload): Json<AddEvidenceRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let trimmed = id.trim();
    if trimmed.is_empty() || trimmed == "undefined" || trimmed == "null" {
        return Err(AppError::BadRequest(
            "Invalid case ID: case ID cannot be empty or 'undefined'.".to_string(),
        ));
    }

    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(trimmed)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Investigation case '{}' not found in docket.", trimmed)))?;

    let ref_id = payload.reference_id.trim();
    if ref_id.is_empty() {
        return Err(AppError::BadRequest(
            "Evidence reference ID cannot be empty.".to_string(),
        ));
    }

    // Reference validation for ACCOUNTS and TRANSACTIONS
    let ev_type_up = payload.evidence_type.trim().to_uppercase();
    if ev_type_up == "ACCOUNT" {
        let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts WHERE account_id = $1")
            .bind(ref_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);
        if exists == 0 {
            return Err(AppError::BadRequest(format!(
                "Account '{}' not found in accounts database. Cannot attach non-existent account as evidence.",
                ref_id
            )));
        }
    } else if ev_type_up == "TRANSACTION" {
        let exists: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM transactions WHERE transaction_id = $1")
                .bind(ref_id)
                .fetch_one(pool)
                .await
                .unwrap_or(0);
        if exists == 0 {
            return Err(AppError::BadRequest(format!(
                "Transaction '{}' not found in transactions database. Cannot attach non-existent transaction as evidence.",
                ref_id
            )));
        }
    }

    let now = Utc::now().to_rfc3339();
    let hash_input = format!("{}:{}:{}", ref_id, payload.description, now);
    let integrity_hash = payload
        .integrity_hash
        .unwrap_or_else(|| compute_sha256(hash_input.as_bytes()));
    let meta_str = payload
        .metadata
        .map(|m| m.to_string())
        .unwrap_or_else(|| "{}".to_string());
    let actor = payload
        .attached_by
        .or(existing.assigned_investigator)
        .unwrap_or_else(|| "Investigator".to_string());

    sqlx::query(
        r#"
        INSERT INTO case_evidence (case_id, evidence_type, reference_id, description, metadata_json, status, attached_by, integrity_hash, created_at)
        VALUES ($1, $2, $3, $4, $5, 'Active', $6, $7, $8)
        "#,
    )
    .bind(&existing.case_id)
    .bind(&payload.evidence_type)
    .bind(ref_id)
    .bind(&payload.description)
    .bind(&meta_str)
    .bind(&actor)
    .bind(&integrity_hash)
    .bind(&now)
    .execute(pool)
    .await?;

    // Auto-link into account / transaction junction if applicable
    if ev_type_up == "ACCOUNT" {
        let _ = sqlx::query(
            "INSERT OR IGNORE INTO case_accounts (case_id, account_id, role, notes, linked_at, linked_by) VALUES ($1, $2, 'Investigative Evidence', $3, $4, $5)"
        )
        .bind(&existing.case_id)
        .bind(ref_id)
        .bind(&payload.description)
        .bind(&now)
        .bind(&actor)
        .execute(pool)
        .await;
    } else if ev_type_up == "TRANSACTION" {
        let _ = sqlx::query(
            "INSERT OR IGNORE INTO case_transactions (case_id, transaction_id, relevance, notes, linked_at, linked_by) VALUES ($1, $2, 'Evidentiary Transaction', $3, $4, $5)"
        )
        .bind(&existing.case_id)
        .bind(ref_id)
        .bind(&payload.description)
        .bind(&now)
        .bind(&actor)
        .execute(pool)
        .await;
    }

    record_case_audit(
        pool,
        &actor,
        "EVIDENCE_ATTACHED",
        &existing.case_id,
        &format!(
            "Attached [{}] evidence: {} (SHA-256: {})",
            payload.evidence_type,
            ref_id,
            &integrity_hash[..12]
        ),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.evidence_added",
        &existing.case_id,
        "EVIDENCE_ATTACHED",
        json!({
            "case_id": existing.case_id,
            "evidence_type": payload.evidence_type,
            "reference_id": ref_id,
            "description": payload.description,
            "integrity_hash": integrity_hash,
            "attached_by": actor,
            "created_at": now
        }),
    );

    let evidence = sqlx::query_as::<_, CaseEvidence>(
        "SELECT id, case_id, evidence_type, reference_id, description, metadata_json, status, attached_by, integrity_hash, file_path, file_name, file_size, created_at FROM case_evidence WHERE case_id = $1 ORDER BY id DESC LIMIT 1"
    )
    .bind(&existing.case_id)
    .fetch_one(pool)
    .await?;

    Ok(Json(evidence))
}

async fn remove_evidence(
    State(state): State<Arc<CasesState>>,
    Path((id, evidence_id)): Path<(String, i64)>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let ev = sqlx::query_as::<_, CaseEvidence>(
        "SELECT id, case_id, evidence_type, reference_id, description, metadata_json, status, attached_by, integrity_hash, file_path, file_name, file_size, created_at FROM case_evidence WHERE id = $1 AND case_id = $2"
    )
    .bind(evidence_id)
    .bind(&existing.case_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Evidence item {} not found in case {}", evidence_id, existing.case_id)))?;

    // Soft delete preserving audit history
    sqlx::query("UPDATE case_evidence SET status = 'Removed' WHERE id = $1")
        .bind(evidence_id)
        .execute(pool)
        .await?;

    let actor = existing
        .assigned_investigator
        .as_deref()
        .unwrap_or("Investigator");
    record_case_audit(
        pool,
        actor,
        "EVIDENCE_REMOVED",
        &existing.case_id,
        &format!(
            "Removed [{}] evidence reference: {} (Item ID: {})",
            ev.evidence_type, ev.reference_id, evidence_id
        ),
    )
    .await;

    broadcast_case_event(
        &state.ws_tx,
        "case.evidence_removed",
        &existing.case_id,
        "EVIDENCE_REMOVED",
        json!({
            "case_id": existing.case_id,
            "evidence_id": evidence_id,
            "reference_id": ev.reference_id,
            "evidence_type": ev.evidence_type
        }),
    );

    Ok(Json(json!({
        "case_id": existing.case_id,
        "evidence_id": evidence_id,
        "status": "Removed"
    })))
}

async fn list_case_evidence(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let evidence = sqlx::query_as::<_, CaseEvidence>(
        "SELECT id, case_id, evidence_type, reference_id, description, metadata_json, status, attached_by, integrity_hash, file_path, file_name, file_size, created_at FROM case_evidence WHERE case_id = $1 AND (status != 'Removed' OR status IS NULL) ORDER BY id DESC"
    )
    .bind(&existing.case_id)
    .fetch_all(pool)
    .await?;

    Ok(Json(json!({
        "case_id": existing.case_id,
        "count": evidence.len(),
        "evidence": evidence
    })))
}

async fn get_evidence_by_id(
    State(state): State<Arc<CasesState>>,
    Path(evidence_id): Path<i64>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let ev = sqlx::query_as::<_, CaseEvidence>(
        "SELECT id, case_id, evidence_type, reference_id, description, metadata_json, status, attached_by, integrity_hash, file_path, file_name, file_size, created_at FROM case_evidence WHERE id = $1"
    )
    .bind(evidence_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Evidence record {} not found", evidence_id)))?;

    Ok(Json(ev))
}

async fn get_case_audit(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let existing = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let audits = sqlx::query_as::<_, CaseAuditLog>(
        r#"
        SELECT id, timestamp, user, action, target_type, target_id, details
        FROM audit_logs
        WHERE (target_type = 'CASE' AND target_id = $1)
           OR target_id = $2
           OR details LIKE '%' || $1 || '%'
        ORDER BY id DESC
        LIMIT 100
        "#,
    )
    .bind(&existing.case_id)
    .bind(existing.case_number.as_deref().unwrap_or(&existing.case_id))
    .fetch_all(pool)
    .await?;

    Ok(Json(json!({
        "case_id": existing.case_id,
        "count": audits.len(),
        "audit_logs": audits
    })))
}

async fn get_dossier(
    State(state): State<Arc<CasesState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let kase = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, case_number, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, created_by, source_type, source_reference_id, summary, findings, closure_reason, version FROM cases WHERE case_id = $1 OR case_number = $1"
    )
    .bind(id.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Case {} not found in docket", id)))?;

    let evidence = sqlx::query_as::<_, CaseEvidence>(
        "SELECT id, case_id, evidence_type, reference_id, description, metadata_json, status, attached_by, integrity_hash, file_path, file_name, file_size, created_at FROM case_evidence WHERE case_id = $1 AND (status != 'Removed' OR status IS NULL) ORDER BY id ASC"
    )
    .bind(&kase.case_id)
    .fetch_all(pool)
    .await?;

    // Linked accounts
    let linked_accounts: Vec<serde_json::Value> = sqlx::query_as::<_, (String, Option<String>, Option<String>, Option<f64>)>(
        "SELECT ca.account_id, ca.role, a.risk_level, a.risk_score FROM case_accounts ca LEFT JOIN accounts a ON ca.account_id = a.account_id WHERE ca.case_id = $1"
    )
    .bind(&kase.case_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(acc_id, role, lvl, score)| {
        json!({
            "account_id": acc_id,
            "role": role.unwrap_or_else(|| "Suspect".to_string()),
            "risk_level": lvl.unwrap_or_else(|| "Unknown".to_string()),
            "risk_score": score.unwrap_or(0.0)
        })
    })
    .collect();

    // Linked transactions
    let linked_txns: Vec<serde_json::Value> = sqlx::query_as::<_, (String, Option<String>, Option<String>, Option<f64>, Option<String>)>(
        "SELECT ct.transaction_id, ct.relevance, t.sender_account, t.amount, t.timestamp FROM case_transactions ct LEFT JOIN transactions t ON ct.transaction_id = t.transaction_id WHERE ct.case_id = $1"
    )
    .bind(&kase.case_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(tid, rel, sender, amt, ts)| {
        json!({
            "transaction_id": tid,
            "relevance": rel.unwrap_or_else(|| "Flagged Transfer".to_string()),
            "sender_account": sender,
            "amount": amt.unwrap_or(0.0),
            "timestamp": ts
        })
    })
    .collect();

    // Correlated complaints
    let correlated_complaints: Vec<serde_json::Value> = sqlx::query_as::<_, (String, Option<String>, String, f64)>(
        "SELECT complaint_id, date_reported, complainant_name, amount_lost FROM complaints WHERE linked_case_id = $1"
    )
    .bind(&kase.case_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(cid, dt, name, loss)| {
        json!({
            "complaint_id": cid,
            "date_reported": dt,
            "complainant_name": name,
            "amount_lost": loss
        })
    })
    .collect();

    // Audit logs
    let audit_history = sqlx::query_as::<_, CaseAuditLog>(
        "SELECT id, timestamp, user, action, target_type, target_id, details FROM audit_logs WHERE (target_type = 'CASE' AND target_id = $1) OR details LIKE '%' || $1 || '%' ORDER BY id ASC"
    )
    .bind(&kase.case_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let primary_acc = if let Some(ref acc_id) = kase.primary_account_id {
        sqlx::query_as::<_, Account>(
            "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
        )
        .bind(acc_id)
        .fetch_optional(pool)
        .await?
    } else {
        None
    };

    let seal_material = format!(
        "{}:{}:{}:{}",
        kase.case_id,
        kase.title,
        evidence.len(),
        Utc::now().to_rfc3339()
    );
    let seal_hash = compute_sha256(seal_material.as_bytes());

    record_case_audit(
        pool,
        kase.assigned_investigator
            .as_deref()
            .unwrap_or("Investigator"),
        "DOSSIER_EXPORTED",
        &kase.case_id,
        &format!(
            "Generated formal legal case dossier (Seal: {})",
            &seal_hash[..12]
        ),
    )
    .await;

    let dossier = CaseDossier {
        case_id: kase.case_id.clone(),
        case_number: kase.case_number.unwrap_or_else(|| kase.case_id.clone()),
        title: kase.title,
        priority: kase.priority.unwrap_or_else(|| "High".to_string()),
        status: kase.status.unwrap_or_else(|| "New".to_string()),
        assigned_investigator: kase
            .assigned_investigator
            .unwrap_or_else(|| "Special Investigator".to_string()),
        created_at: kase.created_at.unwrap_or_default(),
        updated_at: kase.updated_at.unwrap_or_default(),
        created_by: kase.created_by.unwrap_or_else(|| "Investigator".to_string()),
        source_type: kase.source_type.unwrap_or_else(|| "Manual".to_string()),
        source_reference_id: kase.source_reference_id,
        summary: kase.summary,
        findings: kase.findings,
        closure_reason: kase.closure_reason,
        version: kase.version.unwrap_or(1),
        primary_account: primary_acc,
        evidence,
        linked_accounts,
        linked_transactions: linked_txns,
        correlated_complaints,
        audit_history,
        legal_attestation: "OFFICIAL LAW ENFORCEMENT & FIU DOSSIER - GENERATED UNDER PRECAUTIONARY FINANCIAL CRIME INVESTIGATION PROTOCOL".to_string(),
        integrity_seal: format!("SHA256:{}", seal_hash),
    };

    Ok(Json(dossier))
}

async fn get_investigators(
    State(state): State<Arc<CasesState>>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let users = sqlx::query_as::<_, User>(
        "SELECT id, badge_id, name, email, role, created_at FROM users ORDER BY name ASC",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let investigators: Vec<serde_json::Value> = users
        .into_iter()
        .map(|u| {
            json!({
                "id": u.id,
                "badge_id": u.badge_id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "display": format!("{} ({})", u.name, u.badge_id)
            })
        })
        .collect();

    Ok(Json(json!({
        "count": investigators.len(),
        "investigators": investigators
    })))
}

async fn get_cases_summary(
    State(state): State<Arc<CasesState>>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;
    let total_cases: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM cases")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    let active_cases: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM cases WHERE status != 'Closed' AND status != 'Resolved'",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    let critical_cases: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM cases WHERE priority = 'Critical' OR priority = 'CRITICAL'",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    let high_cases: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM cases WHERE priority = 'High' OR priority = 'HIGH'",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    let closed_cases: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM cases WHERE status = 'Closed' OR status = 'Resolved'",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    Ok(Json(json!({
        "total_cases": total_cases,
        "active_cases": active_cases,
        "critical_priority": critical_cases,
        "high_priority": high_cases,
        "closed_cases": closed_cases
    })))
}
