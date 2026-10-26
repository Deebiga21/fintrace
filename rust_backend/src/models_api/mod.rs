use axum::{
    extract::State,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use reqwest::Client;
use serde_json::{json, Value};
use std::sync::Arc;

use crate::{database::DbPool, errors::AppError};

#[derive(Clone)]
pub struct ModelsState {
    pub pool: DbPool,
    pub client: Client,
    pub ml_service_url: String,
}

pub fn router(pool: DbPool, ml_service_url: String) -> Router {
    let state = Arc::new(ModelsState {
        pool,
        client: Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .unwrap_or_default(),
        ml_service_url,
    });

    Router::new()
        .route("/registry", get(get_registry))
        .route("/gnn/score", post(score_gnn))
        .route("/gnn/status", get(get_gnn_status))
        .route("/gnn/train", post(train_gnn))
        .route("/gnn/evaluation", get(get_gnn_evaluation))
        .with_state(state)
}

async fn forward_get(state: &ModelsState, path: &str) -> Result<Value, AppError> {
    let url = format!("{}{}", state.ml_service_url, path);
    let response = state.client.get(&url).send().await?;
    let status = response.status();
    let body: Value = response.json().await.map_err(AppError::from)?;
    if !status.is_success() {
        return Err(AppError::Internal(body.to_string()));
    }
    Ok(body)
}

async fn forward_post(
    state: &ModelsState,
    path: &str,
    body: Value,
) -> Result<Value, AppError> {
    let url = format!("{}{}", state.ml_service_url, path);
    let response = state.client.post(&url).json(&body).send().await?;
    let status = response.status();
    let body: Value = response.json().await.map_err(AppError::from)?;
    if !status.is_success() {
        return Err(AppError::Internal(body.to_string()));
    }
    Ok(body)
}

// Report the serving process' actual checkpoint and dataset readiness. No model
// version or evaluation figures are invented by the API layer.
async fn get_registry(State(state): State<Arc<ModelsState>>) -> Result<impl IntoResponse, AppError> {
    let status = forward_get(&state, "/gnn/status").await?;
    let runs = forward_get(&state, "/gnn/runs").await.unwrap_or_else(|_| json!([]));
    Ok(Json(json!({ "service": status, "recorded_runs": runs })))
}

async fn get_gnn_status(State(state): State<Arc<ModelsState>>) -> Result<impl IntoResponse, AppError> {
    let status = forward_get(&state, "/gnn/status").await?;
    Ok(Json(json!({
        "model_name": "GraphSAGE",
        "status": if status["checkpoint_available"] == true { "READY" } else { "UNAVAILABLE" },
        "checkpoint_available": status["checkpoint_available"],
        "indexed_accounts": status["account_count"],
        "transactions_in_model_graph": status["transaction_count"],
        "details": status
    })))
}

async fn train_gnn(
    State(state): State<Arc<ModelsState>>,
    Json(body): Json<Value>,
) -> Result<impl IntoResponse, AppError> {
    // The Python GNN endpoint reads the same SQLite database and persists the
    // run and resulting scores. It reports training failures instead of returning
    // fabricated successful metrics.
    let result = forward_post(&state, "/gnn/train", body).await?;
    Ok(Json(result))
}

async fn score_gnn(State(state): State<Arc<ModelsState>>) -> Result<impl IntoResponse, AppError> {
    let result = forward_post(&state, "/gnn/infer", json!({})).await?;
    Ok(Json(crate::ml_client::validate_inference_payload(result)?))
}

async fn get_gnn_evaluation(
    State(state): State<Arc<ModelsState>>,
) -> Result<impl IntoResponse, AppError> {
    let runs = forward_get(&state, "/gnn/runs").await?;
    Ok(Json(json!({
        "source": "persisted GraphSAGE training runs",
        "evaluation_available": !runs.as_array().map(|items| items.is_empty()).unwrap_or(true),
        "runs": runs
    })))
}
