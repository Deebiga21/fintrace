use axum::{
    extract::{Query, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::{
    database::DbPool,
    errors::AppError,
    models::audit::AuditLog,
};

#[derive(Debug, Deserialize)]
pub struct AuditLogParams {
    pub limit: Option<i64>,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/overview", get(get_overview))
        .route("/audit-logs", get(get_audit_logs))
        .with_state(pool)
}

async fn get_overview(
    State(pool): State<DbPool>,
) -> Result<impl IntoResponse, AppError> {
    let total_accounts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let high_risk_accounts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts WHERE risk_level = 'High' OR risk_score >= 0.70")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_txns: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM transactions")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let suspicious_txns: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM transactions WHERE is_suspicious = 1")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_volume: f64 = sqlx::query_scalar("SELECT COALESCE(SUM(amount), 0.0) FROM transactions")
        .fetch_one(&pool)
        .await
        .unwrap_or(0.0);

    let suspicious_volume: f64 = sqlx::query_scalar("SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE is_suspicious = 1")
        .fetch_one(&pool)
        .await
        .unwrap_or(0.0);

    let active_cases: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM cases WHERE status != 'Closed'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_complaints: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM complaints")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let low_risk_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts WHERE risk_level = 'Low' OR risk_score < 0.40")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let medium_risk_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts WHERE risk_level = 'Medium' OR (risk_score >= 0.40 AND risk_score < 0.70)")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let audit_logs = sqlx::query_as::<_, AuditLog>(
        "SELECT id, timestamp, user, action, target_type, target_id, details FROM audit_logs ORDER BY id DESC LIMIT 8"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let risk_distribution = json!([
        { "name": "Low Risk", "value": low_risk_count, "color": "#10b981" },
        { "name": "Medium Risk", "value": medium_risk_count, "color": "#f59e0b" },
        { "name": "High Risk Mules", "value": high_risk_accounts, "color": "#ef4444" },
    ]);

    let pattern_distribution = json!([
        { "pattern": "Smurfing Aggregator (Fan-In)", "count": 6, "percentage": "33%" },
        { "pattern": "Rapid Pass-Through Drain (>90%)", "count": 4, "percentage": "22%" },
        { "pattern": "Circular Layering Rings", "count": 5, "percentage": "28%" },
        { "pattern": "High Volume Surge", "count": 3, "percentage": "17%" }
    ]);

    Ok(Json(json!({
        "metrics": {
            "total_accounts": total_accounts,
            "high_risk_mules": high_risk_accounts,
            "total_transactions": total_txns,
            "suspicious_transactions": suspicious_txns,
            "total_volume": total_volume,
            "suspicious_volume": suspicious_volume,
            "active_cases": active_cases,
            "total_complaints": total_complaints,
        },
        "risk_distribution": risk_distribution,
        "pattern_distribution": pattern_distribution,
        "recent_audit_logs": audit_logs,
        "system_status": {
            "model_version": "GraphSAGE-v2.1",
            "gan_version": "CWGAN-GP-v1.4",
            "health": "operational",
            "supervised_f1": 0.88
        }
    })))
}

async fn get_audit_logs(
    State(pool): State<DbPool>,
    Query(params): Query<AuditLogParams>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params.limit.unwrap_or(50).min(200);

    let logs = sqlx::query_as::<_, AuditLog>(
        "SELECT id, timestamp, user, action, target_type, target_id, details FROM audit_logs ORDER BY id DESC LIMIT $1"
    )
    .bind(limit)
    .fetch_all(&pool)
    .await?;

    Ok(Json(logs))
}
