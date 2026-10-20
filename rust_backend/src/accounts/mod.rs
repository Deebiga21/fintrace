use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::{
    database::DbPool,
    errors::AppError,
    models::{
        account::{Account, AccountExplanation},
        alert::Alert,
        case::InvestigationCase,
        complaint::Complaint,
        transaction::Transaction,
    },
};

#[derive(Debug, Deserialize)]
pub struct AccountFilterParams {
    pub skip: Option<i64>,
    pub limit: Option<i64>,
    pub risk_level: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SearchQueryParams {
    pub q: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RiskLevelQueryParams {
    pub level: Option<String>,
    pub limit: Option<i64>,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/", get(list_accounts))
        .route("/search", get(search_accounts))
        .route("/highest-risk", get(get_highest_risk_accounts))
        .route("/risk", get(get_accounts_by_risk))
        .route("/:id", get(get_account))
        .route("/:id/overview", get(get_account_overview))
        .route("/:id/risk", get(get_account_risk))
        .route("/:id/explanation", get(get_account_explanation))
        .with_state(pool)
}

async fn list_accounts(
    State(pool): State<DbPool>,
    Query(params): Query<AccountFilterParams>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params.limit.unwrap_or(100).min(500);
    let skip = params.skip.unwrap_or(0);

    let mut query = String::from("SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE 1=1");

    if let Some(ref rl) = params.risk_level {
        query.push_str(&format!(" AND (risk_level = '{0}' OR LOWER(risk_level) = LOWER('{0}'))", rl));
    }

    query.push_str(&format!(" ORDER BY risk_score DESC, total_incoming DESC LIMIT {} OFFSET {}", limit, skip));

    let accounts = sqlx::query_as::<_, Account>(&query)
        .fetch_all(&pool)
        .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts")
        .fetch_one(&pool)
        .await?;

    Ok(Json(json!({
        "total": total,
        "skip": skip,
        "limit": limit,
        "accounts": accounts
    })))
}

async fn search_accounts(
    State(pool): State<DbPool>,
    Query(params): Query<SearchQueryParams>,
) -> Result<impl IntoResponse, AppError> {
    let q = params.q.unwrap_or_default().trim().to_uppercase();
    if q.is_empty() {
        return Ok(Json(json!({
            "query": "",
            "matches": []
        })));
    }

    let search_pattern = format!("%{}%", q);
    let accounts = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE UPPER(account_id) LIKE $1 OR UPPER(customer_name) LIKE $1 ORDER BY risk_score DESC LIMIT 20"
    )
    .bind(&search_pattern)
    .fetch_all(&pool)
    .await?;

    let matches: Vec<serde_json::Value> = accounts.into_iter().map(|a| {
        json!({
            "account_id": a.account_id,
            "customer_name": a.customer_name,
            "risk_level": a.risk_level,
            "risk_score": a.risk_score,
            "status": a.status,
            "current_balance": a.current_balance,
            "total_incoming": a.total_incoming,
            "total_outgoing": a.total_outgoing
        })
    }).collect();

    Ok(Json(json!({
        "query": q,
        "count": matches.len(),
        "matches": matches
    })))
}

async fn get_highest_risk_accounts(
    State(pool): State<DbPool>,
    Query(params): Query<AccountFilterParams>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params.limit.unwrap_or(20).min(100);

    let accounts = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE risk_score >= 0.70 OR risk_level = 'High' OR risk_level = 'CRITICAL' ORDER BY risk_score DESC, total_incoming DESC LIMIT $1"
    )
    .bind(limit)
    .fetch_all(&pool)
    .await?;

    let ranked: Vec<serde_json::Value> = accounts.into_iter().map(|acc| {
        let flags: Vec<String> = acc.flags_json
            .as_ref()
            .and_then(|f| serde_json::from_str(f).ok())
            .unwrap_or_default();

        json!({
            "account_id": acc.account_id,
            "customer_name": acc.customer_name,
            "risk_score": acc.risk_score.unwrap_or(0.0),
            "risk_level": acc.risk_level.unwrap_or_else(|| "High".to_string()),
            "status": acc.status,
            "inflow": acc.total_incoming.unwrap_or(0.0),
            "outflow": acc.total_outgoing.unwrap_or(0.0),
            "turnover_ratio": acc.turnover_ratio.unwrap_or(1.0),
            "flags": flags,
            "in_degree": acc.in_degree.unwrap_or(0),
            "out_degree": acc.out_degree.unwrap_or(0),
            "model_version": "GraphSAGE-v2.1 (PyG)"
        })
    }).collect();

    Ok(Json(json!({
        "total": ranked.len(),
        "model_version": "GraphSAGE-v2.1",
        "accounts": ranked
    })))
}

async fn get_accounts_by_risk(
    State(pool): State<DbPool>,
    Query(params): Query<RiskLevelQueryParams>,
) -> Result<impl IntoResponse, AppError> {
    let level = params.level.unwrap_or_else(|| "high".to_string()).to_lowercase();
    let limit = params.limit.unwrap_or(50).min(200);

    let (clause, threshold) = match level.as_str() {
        "high" | "critical" => ("risk_level = 'High' OR risk_level = 'CRITICAL' OR risk_score >= 0.70", 0.70),
        "medium" => ("(risk_level = 'Medium' OR (risk_score >= 0.40 AND risk_score < 0.70)) AND risk_level != 'High' AND risk_level != 'CRITICAL'", 0.40),
        _ => ("risk_level = 'Low' OR risk_score < 0.40", 0.0)
    };

    let query_str = format!(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE {} ORDER BY risk_score DESC LIMIT {}",
        clause, limit
    );

    let accounts = sqlx::query_as::<_, Account>(&query_str)
        .fetch_all(&pool)
        .await?;

    Ok(Json(json!({
        "level": level,
        "threshold": threshold,
        "count": accounts.len(),
        "accounts": accounts
    })))
}

async fn get_account(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let acc = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Account {} not found", id)))?;

    Ok(Json(acc))
}

async fn get_account_overview(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let acc = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Account {} not found", id)))?;

    // Recent 20 transactions
    let recent_txns = sqlx::query_as::<_, Transaction>(
        "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE sender_account = $1 OR receiver_account = $1 ORDER BY timestamp DESC LIMIT 20"
    )
    .bind(&id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Linked alerts
    let linked_alerts = sqlx::query_as::<_, Alert>(
        "SELECT alert_id, target_type, target_id, severity, reason_code, status, assigned_to, notes, created_at, updated_at FROM alerts WHERE target_id = $1 ORDER BY created_at DESC"
    )
    .bind(&id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Linked complaints
    let linked_complaints = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, created_at FROM complaints WHERE reported_account_id = $1 ORDER BY date_reported DESC"
    )
    .bind(&id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Linked cases
    let linked_cases = sqlx::query_as::<_, InvestigationCase>(
        "SELECT case_id, title, priority, assigned_investigator, status, primary_account_id, created_at, updated_at, summary, findings FROM cases WHERE primary_account_id = $1 ORDER BY created_at DESC"
    )
    .bind(&id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(json!({
        "account": acc,
        "recent_transactions": recent_txns,
        "alerts": linked_alerts,
        "complaints": linked_complaints,
        "cases": linked_cases,
        "summary": {
            "total_txns_shown": recent_txns.len(),
            "alert_count": linked_alerts.len(),
            "complaint_count": linked_complaints.len(),
            "case_count": linked_cases.len()
        }
    })))
}

async fn get_account_risk(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let acc = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Account {} not found", id)))?;

    let flags: Vec<String> = acc.flags_json
        .as_ref()
        .and_then(|f| serde_json::from_str(f).ok())
        .unwrap_or_default();

    let mut key_contributing_evidence = Vec::new();
    if acc.turnover_ratio.unwrap_or(0.0) >= 0.90 {
        key_contributing_evidence.push(format!("Extreme turnover drain ratio: {:.1}%", acc.turnover_ratio.unwrap_or(0.0) * 100.0));
    }
    if acc.in_degree.unwrap_or(0) >= 5 {
        key_contributing_evidence.push(format!("Multi-hop convergence with {} distinct incoming counterparties", acc.in_degree.unwrap_or(0)));
    }
    if let Some(ref st) = acc.status {
        if st.to_lowercase().contains("freeze") || st.to_lowercase().contains("dormant") {
            key_contributing_evidence.push(format!("Core banking status: {}", st));
        }
    }
    for flag in &flags {
        key_contributing_evidence.push(format!("Heuristic anomaly flagged: {}", flag));
    }

    Ok(Json(json!({
        "account_id": acc.account_id,
        "customer_name": acc.customer_name,
        "risk_score": acc.risk_score.unwrap_or(0.0),
        "risk_level": acc.risk_level.unwrap_or_else(|| "Low".to_string()),
        "confidence": acc.prediction_confidence.unwrap_or(0.88),
        "model_version": "GraphSAGE-v2.1",
        "turnover_ratio": acc.turnover_ratio.unwrap_or(0.0),
        "total_incoming": acc.total_incoming.unwrap_or(0.0),
        "total_outgoing": acc.total_outgoing.unwrap_or(0.0),
        "flags": flags,
        "key_contributing_evidence": key_contributing_evidence,
        "last_scored_at": acc.created_at.unwrap_or_else(|| chrono::Utc::now().to_rfc3339())
    })))
}

async fn get_account_explanation(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let acc = sqlx::query_as::<_, Account>(
        "SELECT account_id, customer_name, account_type, created_at, initial_balance, current_balance, status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule, total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties, avg_txn_interval_hours, turnover_ratio, flags_json, embedding_json, notes FROM accounts WHERE account_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Account {} not found", id)))?;

    let flags: Vec<String> = acc.flags_json
        .as_ref()
        .and_then(|f| serde_json::from_str(f).ok())
        .unwrap_or_default();

    let in_deg = acc.in_degree.unwrap_or(0);
    let out_deg = acc.out_degree.unwrap_or(0);
    let turnover = acc.turnover_ratio.unwrap_or(0.0);
    let score = acc.risk_score.unwrap_or(0.0);

    let signals = json!({
        "in_degree": in_deg,
        "out_degree": out_deg,
        "turnover_ratio": turnover,
        "is_smurfing_aggregator": in_deg >= 4 && out_deg <= 2,
        "is_rapid_pass_through": turnover >= 0.85 && out_deg >= 1,
        "total_incoming_volume": acc.total_incoming.unwrap_or(0.0),
        "total_outgoing_volume": acc.total_outgoing.unwrap_or(0.0),
        "unique_counterparties": acc.unique_counterparties.unwrap_or(0),
        "gnn_prediction_confidence": acc.prediction_confidence.unwrap_or(0.0)
    });

    // Connected high-risk neighbor accounts
    let high_risk_peers: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT DISTINCT a.account_id
        FROM accounts a
        WHERE a.risk_level = 'High'
          AND a.account_id != $1
          AND (
            a.account_id IN (SELECT receiver_account FROM transactions WHERE sender_account = $1)
            OR a.account_id IN (SELECT sender_account FROM transactions WHERE receiver_account = $1)
          )
        LIMIT 15
        "#
    )
    .bind(&id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let tx_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM transactions WHERE sender_account = $1 OR receiver_account = $1"
    )
    .bind(&id)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let structural_features = json!({
        "in_degree": in_deg,
        "out_degree": out_deg,
        "turnover_ratio": turnover,
        "unique_counterparties": acc.unique_counterparties.unwrap_or(0),
        "total_incoming": acc.total_incoming.unwrap_or(0.0),
        "total_outgoing": acc.total_outgoing.unwrap_or(0.0)
    });

    let graph_context = json!({
        "total_counterparties": acc.unique_counterparties.unwrap_or(0),
        "high_risk_neighbors_count": high_risk_peers.len(),
        "inflow_volume": acc.total_incoming.unwrap_or(0.0),
        "outflow_volume": acc.total_outgoing.unwrap_or(0.0)
    });

    let explanation = AccountExplanation {
        account_id: acc.account_id,
        customer_name: acc.customer_name,
        risk_score: score,
        risk_level: acc.risk_level.unwrap_or_else(|| "Low".to_string()),
        confidence: acc.prediction_confidence.unwrap_or(0.85),
        prediction_confidence: acc.prediction_confidence.unwrap_or(0.85),
        is_simulated: false,
        turnover_ratio: turnover,
        in_degree: in_deg,
        out_degree: out_deg,
        total_incoming: acc.total_incoming.unwrap_or(0.0),
        total_outgoing: acc.total_outgoing.unwrap_or(0.0),
        unique_counterparties: acc.unique_counterparties.unwrap_or(0),
        detected_patterns: flags.clone(),
        connected_high_risk_accounts: high_risk_peers,
        supporting_transactions_count: tx_count,
        structural_features,
        graph_context,
        flags,
        embedding_summary: acc.embedding_json,
        structural_signals: signals,
    };

    Ok(Json(explanation))
}
