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
    models::account::{Account, AccountExplanation},
};

#[derive(Debug, Deserialize)]
pub struct AccountFilterParams {
    pub skip: Option<i64>,
    pub limit: Option<i64>,
    pub risk_level: Option<String>,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/", get(list_accounts))
        .route("/:id", get(get_account))
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
        query.push_str(&format!(" AND risk_level = '{}'", rl));
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

    let explanation = AccountExplanation {
        account_id: acc.account_id,
        customer_name: acc.customer_name,
        risk_score: score,
        risk_level: acc.risk_level.unwrap_or_else(|| "Low".to_string()),
        confidence: acc.prediction_confidence.unwrap_or(0.85),
        turnover_ratio: turnover,
        in_degree: in_deg,
        out_degree: out_deg,
        total_incoming: acc.total_incoming.unwrap_or(0.0),
        total_outgoing: acc.total_outgoing.unwrap_or(0.0),
        unique_counterparties: acc.unique_counterparties.unwrap_or(0),
        flags,
        embedding_summary: acc.embedding_json,
        structural_signals: signals,
    };

    Ok(Json(explanation))
}
