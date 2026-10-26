use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use tracing::error;

use crate::{database::DbPool, errors::AppError, models::model_run::ModelRun};

#[derive(Clone)]
pub struct MLClientState {
    pub client: Client,
    pub ml_service_url: String,
    pub pool: DbPool,
}

pub fn router(pool: DbPool, ml_service_url: String) -> Router {
    let state = Arc::new(MLClientState {
        client: Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .unwrap_or_default(),
        ml_service_url,
        pool,
    });

    Router::new()
        // ML Intelligence Studio endpoints
        .route("/status", get(get_status))
        .route("/dataset/summary", get(get_dataset_summary))
        .route("/dataset/list", get(list_datasets))
        .route("/dataset/select", post(select_dataset))
        .route("/gan/train", post(train_gan))
        .route("/gan/metrics", get(get_gan_metrics))
        .route("/gan/generate", post(generate_synthetic))
        .route("/gan/quality", get(get_synthetic_quality))
        .route("/classifier/benchmark", post(benchmark_classifier))
        .route("/classifier/metrics", get(get_classifier_metrics))
        .route("/gnn/train", post(train_gnn_ml))
        .route("/gnn/metrics", get(get_gnn_metrics))
        .route("/isolation-forest/train", post(train_isolation_forest))
        .route(
            "/isolation-forest/metrics",
            get(get_isolation_forest_metrics),
        )
        .route("/isolation-forest/scores", get(get_isolation_forest_scores))
        .route("/predict/account", post(predict_account))
        .route("/predict/transaction", post(predict_transaction))
        .route("/accounts/ranked", get(get_ranked_accounts))
        .route("/analysis/money-trail/:id", get(get_analysis_money_trail))
        .route("/analysis/communities", get(get_analysis_communities))
        .route("/analysis/loops", get(get_analysis_loops))
        .route("/analysis/conduits", get(get_analysis_conduits))
        .route("/artifacts/plot/:name", get(get_artifact_plot))
        .with_state(state)
}

pub fn legacy_gnn_router(pool: DbPool, ml_service_url: String) -> Router {
    let state = Arc::new(MLClientState {
        client: Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .unwrap_or_default(),
        ml_service_url,
        pool,
    });

    Router::new()
        .route("/train", post(legacy_train_gnn))
        .route("/infer", post(legacy_infer_gnn))
        .route("/runs", get(list_model_runs))
        .with_state(state)
}

async fn forward_get(state: &MLClientState, path: &str) -> Result<serde_json::Value, AppError> {
    let url = format!("{}{}", state.ml_service_url, path);
    match state.client.get(&url).send().await {
        Ok(res) => {
            if res.status().is_success() {
                res.json().await.map_err(AppError::from)
            } else {
                let err_text = res
                    .text()
                    .await
                    .unwrap_or_else(|_| "Upstream error".to_string());
                Err(AppError::Internal(err_text))
            }
        }
        Err(e) => {
            error!("Error contacting ML service at {}: {}", url, e);
            Err(AppError::ReqwestError(e))
        }
    }
}

async fn forward_post(
    state: &MLClientState,
    path: &str,
    body: serde_json::Value,
) -> Result<serde_json::Value, AppError> {
    let url = format!("{}{}", state.ml_service_url, path);
    match state.client.post(&url).json(&body).send().await {
        Ok(res) => {
            if res.status().is_success() {
                res.json().await.map_err(AppError::from)
            } else {
                let err_text = res
                    .text()
                    .await
                    .unwrap_or_else(|_| "Upstream error".to_string());
                Err(AppError::Internal(err_text))
            }
        }
        Err(e) => {
            error!("Error contacting ML service at {}: {}", url, e);
            Err(AppError::ReqwestError(e))
        }
    }
}

async fn get_status(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let url = format!("{}/ml/status", state.ml_service_url);
    match state.client.get(&url).send().await {
        Ok(res) => {
            if res.status().is_success() {
                let json_val: serde_json::Value = res.json().await.map_err(AppError::from)?;
                Ok(Json(json_val))
            } else {
                let err_text = res
                    .text()
                    .await
                    .unwrap_or_else(|_| "Upstream error".to_string());
                Err(AppError::Internal(err_text))
            }
        }
        Err(e) => {
            error!("Error contacting ML status service at {}: {}", url, e);
            Ok(Json(json!({
                "service": "FinTrace ML Engine",
                "status": "UNAVAILABLE",
                "online": false,
                "detail": format!("Python ML service unreachable: {}", e),
                "device": "cpu"
            })))
        }
    }
}

async fn get_dataset_summary(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_get(&state, "/ml/dataset/summary").await?;
    Ok(Json(val))
}

async fn list_datasets(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_get(&state, "/ml/dataset/list").await?;
    Ok(Json(val))
}

async fn select_dataset(
    State(state): State<Arc<MLClientState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_post(&state, "/ml/dataset/select", body).await?;
    Ok(Json(val))
}

async fn train_gan(
    State(state): State<Arc<MLClientState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_post(&state, "/ml/gan/train", body).await?;
    Ok(Json(val))
}

async fn get_gan_metrics(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_get(&state, "/ml/gan/metrics").await?;
    Ok(Json(val))
}

async fn generate_synthetic(
    State(state): State<Arc<MLClientState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_post(&state, "/ml/gan/generate", body).await?;
    Ok(Json(val))
}

async fn get_synthetic_quality(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_get(&state, "/ml/gan/quality").await?;
    Ok(Json(val))
}

async fn benchmark_classifier(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_post(&state, "/ml/classifier/benchmark", json!({})).await?;
    Ok(Json(val))
}

async fn get_classifier_metrics(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_get(&state, "/ml/classifier/metrics").await?;
    Ok(Json(val))
}

async fn train_gnn_ml(
    State(state): State<Arc<MLClientState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_post(&state, "/ml/gnn/train", body).await?;
    Ok(Json(val))
}

async fn get_gnn_metrics(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_get(&state, "/ml/gnn/metrics").await?;
    Ok(Json(val))
}

async fn train_isolation_forest(
    State(state): State<Arc<MLClientState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_post(&state, "/ml/isolation-forest/train", body).await?;
    Ok(Json(val))
}

async fn get_isolation_forest_metrics(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_get(&state, "/ml/isolation-forest/metrics").await?;
    Ok(Json(val))
}

async fn get_isolation_forest_scores(
    State(state): State<Arc<MLClientState>>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params
        .get("limit")
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(50)
        .clamp(1, 500);
    let val = forward_get(
        &state,
        &format!("/ml/isolation-forest/scores?limit={}", limit),
    )
    .await?;
    Ok(Json(val))
}

async fn predict_account(
    State(state): State<Arc<MLClientState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_post(&state, "/ml/predict/account", body).await?;
    Ok(Json(val))
}

async fn predict_transaction(
    State(state): State<Arc<MLClientState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_post(&state, "/ml/predict/transaction", body).await?;
    Ok(Json(val))
}

async fn get_ranked_accounts(
    State(state): State<Arc<MLClientState>>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params.get("limit").map(|s| s.as_str()).unwrap_or("50");
    let val = forward_get(&state, &format!("/ml/accounts/ranked?limit={}", limit)).await?;
    Ok(Json(val))
}

async fn get_analysis_money_trail(
    State(state): State<Arc<MLClientState>>,
    Path(id): Path<String>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, AppError> {
    let max_hops = params.get("max_hops").map(|s| s.as_str()).unwrap_or("4");
    let val = forward_get(
        &state,
        &format!("/ml/analysis/money-trail/{}?max_hops={}", id, max_hops),
    )
    .await?;
    Ok(Json(val))
}

async fn get_analysis_communities(
    State(state): State<Arc<MLClientState>>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, AppError> {
    let min_size = params.get("min_size").map(|s| s.as_str()).unwrap_or("3");
    let val = forward_get(
        &state,
        &format!("/ml/analysis/communities?min_size={}", min_size),
    )
    .await?;
    Ok(Json(val))
}

async fn get_analysis_loops(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_get(&state, "/ml/analysis/loops").await?;
    Ok(Json(val))
}

async fn get_analysis_conduits(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let val = forward_get(&state, "/ml/analysis/conduits").await?;
    Ok(Json(val))
}

async fn get_artifact_plot(
    State(state): State<Arc<MLClientState>>,
    Path(name): Path<String>,
) -> Result<Response, AppError> {
    let url = format!("{}/ml/artifacts/plot/{}", state.ml_service_url, name);
    match state.client.get(&url).send().await {
        Ok(res) => {
            let status = StatusCode::from_u16(res.status().as_u16()).unwrap_or(StatusCode::OK);
            let content_type = res
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("image/png")
                .to_string();

            let bytes = res.bytes().await.map_err(AppError::from)?;

            let mut headers = HeaderMap::new();
            if let Ok(val) = HeaderValue::from_str(&content_type) {
                headers.insert(axum::http::header::CONTENT_TYPE, val);
            }

            Ok((status, headers, Body::from(bytes)).into_response())
        }
        Err(e) => Err(AppError::ReqwestError(e)),
    }
}

async fn legacy_train_gnn(
    State(state): State<Arc<MLClientState>>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    let url = format!("{}/gnn/train", state.ml_service_url);
    match state.client.post(&url).json(&body).send().await {
        Ok(res) => {
            if res.status().is_success() {
                let json_val: serde_json::Value = res.json().await.unwrap_or_default();
                Ok(Json(json_val))
            } else {
                let err_text = res
                    .text()
                    .await
                    .unwrap_or_else(|_| "GNN training failed upstream".to_string());
                Err(AppError::Internal(err_text))
            }
        }
        Err(e) => {
            tracing::error!("Error connecting to GNN training service at {}: {}", url, e);
            Err(AppError::ReqwestError(e))
        }
    }
}

async fn legacy_infer_gnn(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let url = format!("{}/gnn/infer", state.ml_service_url);
    match state.client.post(&url).send().await {
        Ok(res) => {
            if res.status().is_success() {
                let json_val: serde_json::Value = res.json().await.unwrap_or_default();
                // The Python service returns HTTP 200 even when no checkpoint
                // exists; the body's status/scored count is the source of truth.
                Ok(Json(validate_inference_payload(json_val)?))
            } else {
                let err_text = res
                    .text()
                    .await
                    .unwrap_or_else(|_| "GNN inference failed upstream".to_string());
                Err(AppError::BadGateway(err_text))
            }
        }
        Err(e) => {
            tracing::error!(
                "Error connecting to GNN inference service at {}: {}",
                url,
                e
            );
            Err(AppError::ReqwestError(e))
        }
    }
}

/// Only pass through inference payloads that confirm predictions were produced.
/// Returns a non-2xx error for missing/incompatible checkpoints, empty graphs,
/// or contradictory completion responses instead of reporting a fake success.
pub(crate) fn validate_inference_payload(
    payload: serde_json::Value,
) -> Result<serde_json::Value, AppError> {
    let status = payload
        .get("status")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let scored = payload
        .get("total_accounts_scored")
        .and_then(|value| value.as_u64())
        .unwrap_or(0);
    let trained = payload
        .get("is_trained_model")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let upstream_message = payload
        .get("message")
        .and_then(|value| value.as_str())
        .unwrap_or("");

    match status {
        "completed" if trained && scored > 0 => Ok(payload),
        "model_unavailable" | "checkpoint_incompatible" => Err(AppError::ServiceUnavailable(
            if upstream_message.is_empty() {
                "GraphSAGE model is not available for inference.".to_string()
            } else {
                upstream_message.to_string()
            },
        )),
        "empty_graph" => Err(AppError::Conflict(if upstream_message.is_empty() {
            "No accounts are available to score.".to_string()
        } else {
            upstream_message.to_string()
        })),
        "completed" if scored == 0 => Err(AppError::BadGateway(
            "ML service reported completion without scoring any accounts.".to_string(),
        )),
        "completed" => Err(AppError::BadGateway(
            "ML service reported completion without confirming a trained model.".to_string(),
        )),
        "" => Err(AppError::BadGateway(
            "ML service returned an inference response without a status.".to_string(),
        )),
        other => Err(AppError::BadGateway(format!(
            "Unexpected inference status from ML service: {}",
            other
        ))),
    }
}

async fn list_model_runs(
    State(state): State<Arc<MLClientState>>,
) -> Result<impl IntoResponse, AppError> {
    let runs = sqlx::query_as::<_, ModelRun>(
        "SELECT run_id, timestamp, model_name, architecture, num_nodes, num_edges, epochs, train_loss, val_loss, accuracy, precision, recall, f1_score, confusion_matrix_json, is_trained_on_ground_truth, hyperparameters_json, notes FROM model_runs ORDER BY run_id DESC LIMIT 20"
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(runs))
}
