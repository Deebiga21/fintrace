use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use std::collections::{HashSet, VecDeque};

use crate::{
    database::DbPool,
    errors::AppError,
    models::transaction::Transaction,
};

#[derive(Debug, Deserialize)]
pub struct MoneyTrailParams {
    pub max_hops: Option<usize>,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/:id", get(get_money_trail))
        .with_state(pool)
}

async fn get_money_trail(
    State(pool): State<DbPool>,
    Path(account_id): Path<String>,
    Query(params): Query<MoneyTrailParams>,
) -> Result<impl IntoResponse, AppError> {
    let max_hops = params.max_hops.unwrap_or(4).min(6);

    // 1. Backward Inbound Trace (Source identification)
    let mut inbound_hops = Vec::new();
    let mut in_visited = HashSet::new();
    in_visited.insert(account_id.clone());

    let mut in_queue = VecDeque::new();
    in_queue.push_back((account_id.clone(), 1));

    let mut total_inbound_volume = 0.0;

    while let Some((curr, hop)) = in_queue.pop_front() {
        if hop > max_hops {
            continue;
        }

        let upstream = sqlx::query_as::<_, Transaction>(
            "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE receiver_account = $1 ORDER BY timestamp DESC LIMIT 20"
        )
        .bind(&curr)
        .fetch_all(&pool)
        .await?;

        for t in upstream {
            total_inbound_volume += t.amount;
            inbound_hops.push(json!({
                "hop_level": hop,
                "direction": "INBOUND",
                "source_account": t.sender_account,
                "destination_account": t.receiver_account,
                "amount": t.amount,
                "timestamp": t.timestamp.as_deref().unwrap_or(""),
                "transaction_type": t.transaction_type.as_deref().unwrap_or("UPI"),
                "is_suspicious": t.is_suspicious.unwrap_or(false)
            }));

            if in_visited.insert(t.sender_account.clone()) {
                in_queue.push_back((t.sender_account, hop + 1));
            }
        }
    }

    // 2. Forward Outbound Trace (Layering & Cash-out identification)
    let mut outbound_hops = Vec::new();
    let mut out_visited = HashSet::new();
    out_visited.insert(account_id.clone());

    let mut out_queue = VecDeque::new();
    out_queue.push_back((account_id.clone(), 1));

    let mut total_outbound_volume = 0.0;

    while let Some((curr, hop)) = out_queue.pop_front() {
        if hop > max_hops {
            continue;
        }

        let downstream = sqlx::query_as::<_, Transaction>(
            "SELECT transaction_id, sender_account, receiver_account, amount, timestamp, status, transaction_type, description, is_suspicious, flag_reason FROM transactions WHERE sender_account = $1 ORDER BY timestamp ASC LIMIT 20"
        )
        .bind(&curr)
        .fetch_all(&pool)
        .await?;

        for t in downstream {
            total_outbound_volume += t.amount;
            outbound_hops.push(json!({
                "hop_level": hop,
                "direction": "OUTBOUND",
                "source_account": t.sender_account,
                "destination_account": t.receiver_account,
                "amount": t.amount,
                "timestamp": t.timestamp.as_deref().unwrap_or(""),
                "transaction_type": t.transaction_type.as_deref().unwrap_or("IMPS"),
                "is_suspicious": t.is_suspicious.unwrap_or(false)
            }));

            if out_visited.insert(t.receiver_account.clone()) {
                out_queue.push_back((t.receiver_account, hop + 1));
            }
        }
    }

    let layering_depth = inbound_hops.iter().map(|h| h["hop_level"].as_u64().unwrap_or(0)).max().unwrap_or(0)
        + outbound_hops.iter().map(|h| h["hop_level"].as_u64().unwrap_or(0)).max().unwrap_or(0);

    Ok(Json(json!({
        "account_id": account_id,
        "max_hops_configured": max_hops,
        "total_inbound_volume": total_inbound_volume,
        "total_outbound_volume": total_outbound_volume,
        "layering_depth": layering_depth,
        "inbound_hops": inbound_hops,
        "outbound_hops": outbound_hops,
        "summary": format!("Traced {} inbound transactions (₹{:.2}) and {} outbound flows (₹{:.2}) across {} hops.",
            inbound_hops.len(), total_inbound_volume, outbound_hops.len(), total_outbound_volume, layering_depth)
    })))
}
