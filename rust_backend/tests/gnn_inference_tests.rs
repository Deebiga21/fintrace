//! Regression tests for `/gnn/infer` outcome reporting.
//!
//! The Python GNN service returns HTTP 200 even when no checkpoint exists.
//! The Rust proxy must inspect the payload and expose unavailable models as a
//! non-2xx response instead of letting the UI claim accounts were scored.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use tokio::net::TcpListener;
use tower::ServiceExt;

async fn spawn_mock_ml(payload: Value) -> String {
    let app = Router::new().route(
        "/gnn/infer",
        post(move || {
            let body = payload.clone();
            async move { Json(body) }
        }),
    );

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind mock ML server");
    let addr = listener.local_addr().expect("mock ML address");

    tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .expect("mock ML server should run");
    });

    format!("http://{}", addr)
}

async fn infer(base_url: String) -> (StatusCode, Value) {
    let pool = fintrace_backend::database::init_db("sqlite::memory:")
        .await
        .expect("database initialization must succeed");
    let app = fintrace_backend::ml_client::legacy_gnn_router(pool, base_url);

    let request = Request::builder()
        .method("POST")
        .uri("/infer")
        .body(Body::empty())
        .expect("build request");

    let response = app.oneshot(request).await.expect("router response");
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read response body");
    let body = serde_json::from_slice(&bytes).unwrap_or(Value::Null);

    (status, body)
}

#[tokio::test]
async fn model_unavailable_is_reported_as_service_unavailable() {
    let base_url = spawn_mock_ml(json!({
        "total_accounts_scored": 0,
        "high_risk_count": 0,
        "medium_risk_count": 0,
        "low_risk_count": 0,
        "execution_time_ms": 1.2,
        "is_trained_model": false,
        "status": "model_unavailable",
        "message": "Train or load a compatible GraphSAGE checkpoint before scoring accounts."
    }))
    .await;

    let (status, body) = infer(base_url).await;

    assert_eq!(
        status,
        StatusCode::SERVICE_UNAVAILABLE,
        "model_unavailable must not be returned as HTTP 200"
    );
    assert_eq!(body["status"], json!(503));
    assert!(
        body["detail"]
            .as_str()
            .unwrap_or_default()
            .contains("compatible GraphSAGE checkpoint"),
        "upstream explanation should be surfaced: {}",
        body
    );
    assert_eq!(body["total_accounts_scored"], Value::Null);
}

#[tokio::test]
async fn incompatible_checkpoint_is_reported_as_service_unavailable() {
    let base_url = spawn_mock_ml(json!({
        "total_accounts_scored": 0,
        "high_risk_count": 0,
        "medium_risk_count": 0,
        "low_risk_count": 0,
        "execution_time_ms": 2.0,
        "is_trained_model": false,
        "status": "checkpoint_incompatible",
        "message": "GraphSAGE checkpoint could not be loaded: shape mismatch"
    }))
    .await;

    let (status, body) = infer(base_url).await;

    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert!(
        body["detail"]
            .as_str()
            .unwrap_or_default()
            .contains("shape mismatch"),
        "checkpoint error should be surfaced: {}",
        body
    );
}

#[tokio::test]
async fn empty_graph_is_reported_as_conflict() {
    let base_url = spawn_mock_ml(json!({
        "total_accounts_scored": 0,
        "high_risk_count": 0,
        "medium_risk_count": 0,
        "low_risk_count": 0,
        "execution_time_ms": 0.0,
        "is_trained_model": false,
        "status": "empty_graph"
    }))
    .await;

    let (status, body) = infer(base_url).await;

    assert_eq!(status, StatusCode::CONFLICT);
    assert_eq!(body["status"], json!(409));
}

#[tokio::test]
async fn genuine_success_is_passed_through_with_real_counts() {
    let base_url = spawn_mock_ml(json!({
        "total_accounts_scored": 4,
        "high_risk_count": 1,
        "medium_risk_count": 1,
        "low_risk_count": 2,
        "execution_time_ms": 12.5,
        "is_trained_model": true,
        "status": "completed"
    }))
    .await;

    let (status, body) = infer(base_url).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], json!("completed"));
    assert_eq!(body["is_trained_model"], json!(true));
    assert_eq!(body["total_accounts_scored"], json!(4));
    assert_eq!(body["high_risk_count"], json!(1));
    assert_eq!(body["medium_risk_count"], json!(1));
    assert_eq!(body["low_risk_count"], json!(2));
}

#[tokio::test]
async fn contradictory_completed_response_is_not_reported_as_success() {
    let base_url = spawn_mock_ml(json!({
        "total_accounts_scored": 0,
        "high_risk_count": 0,
        "medium_risk_count": 0,
        "low_risk_count": 0,
        "execution_time_ms": 1.0,
        "is_trained_model": true,
        "status": "completed"
    }))
    .await;

    let (status, body) = infer(base_url).await;

    assert_eq!(status, StatusCode::BAD_GATEWAY);
    assert!(
        body["detail"]
            .as_str()
            .unwrap_or_default()
            .contains("without scoring any accounts"),
        "zero-score completion should be treated as an upstream error: {}",
        body
    );
}
