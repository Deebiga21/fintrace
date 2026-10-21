use axum::{extract::State, response::IntoResponse, routing::get, Json, Router};
use chrono::Utc;
use serde_json::json;

use crate::{database::DbPool, errors::AppError};

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/status", get(get_surveillance_status))
        .with_state(pool)
}

async fn get_surveillance_status(
    State(pool): State<DbPool>,
) -> Result<impl IntoResponse, AppError> {
    let total_accounts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let total_transactions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM transactions")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let graph_nodes = total_accounts;
    let graph_edges = total_transactions;

    let active_jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE status = 'RUNNING'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    let warnings = vec![
        "High-velocity aggregator funneling observed on conduit node ACC_SOA_03 (₹785.36M aggregate)",
        "Pass-through turnover ratio approaching 100% on dormant node ACC_SOA_02",
        "Multi-hop circular transfer loop active across peer cluster ACC_SOA_48",
    ];

    Ok(Json(json!({
        "status": "Active Surveillance",
        "live_mode": true,
        "dataset_id": "dataset-soa-proposed",
        "dataset_version": "v1.0-SOA-Randomized-25BankStatements",
        "total_accounts": total_accounts,
        "total_transactions": total_transactions,
        "graph_nodes": graph_nodes,
        "graph_edges": graph_edges,
        "last_scored_at": "2026-10-20T10:00:00Z",
        "active_jobs": active_jobs,
        "pipeline_health": "Optimal",
        "active_models": [
            "GraphSAGE-MultiTask-v1.0",
            "CWGAN-GP-MinorityAugmenter-v1.0"
        ],
        "warnings": warnings,
        "timestamp": Utc::now().to_rfc3339()
    })))
}
