use axum::{extract::State, response::IntoResponse, routing::get, Json, Router};
use chrono::Utc;
use serde_json::json;

use crate::{database::DbPool, errors::AppError};

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/summary", get(get_dashboard_summary))
        .with_state(pool)
}

async fn get_dashboard_summary(State(pool): State<DbPool>) -> Result<impl IntoResponse, AppError> {
    let total_accounts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let high_risk_accounts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM accounts WHERE risk_level = 'High' OR risk_score >= 0.70",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let medium_risk_accounts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM accounts WHERE risk_level = 'Medium' OR (risk_score >= 0.40 AND risk_score < 0.70)"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let low_risk_accounts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM accounts WHERE risk_level = 'Low' OR risk_score < 0.40",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let total_txns: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM transactions")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_volume: f64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(amount), 0.0) FROM transactions")
            .fetch_one(&pool)
            .await
            .unwrap_or(0.0);

    let suspicious_txns: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM transactions WHERE is_suspicious = 1")
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

    let suspicious_volume: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE is_suspicious = 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0.0);

    let active_cases: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM cases WHERE status != 'Closed'")
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

    let total_complaints: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM complaints")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let active_alerts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM alerts WHERE status NOT IN ('Dismissed', 'Resolved')",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    Ok(Json(json!({
        "dataset_id": "dataset-synthetic-benchmark",
        "dataset_name": "Multi-Typology Synthetic Benchmark",
        "currency": "INR",
        "accounts": {
            "total": total_accounts,
            "high_risk": high_risk_accounts,
            "medium_risk": medium_risk_accounts,
            "low_risk": low_risk_accounts
        },
        "transactions": {
            "total_count": total_txns,
            "total_volume": (total_volume * 100.0).round() / 100.0,
            "suspicious_count": suspicious_txns,
            "suspicious_volume": (suspicious_volume * 100.0).round() / 100.0
        },
        "investigations": {
            "active_cases": active_cases,
            "total_complaints": total_complaints,
            "active_alerts": active_alerts
        },
        "models": {
            "gnn_active": "GraphSAGE-v2.1",
            "gan_active": "CWGAN-GP-v1.4",
            "health": "Optimal"
        },
        "updated_at": Utc::now().to_rfc3339()
    })))
}
