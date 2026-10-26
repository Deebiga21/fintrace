//! Regression tests for the dataset quality-score contract.
//!
//! The score is defined on a 0–10 scale. These tests pin the public JSON
//! fields (score, maximum, and commit threshold) so a future change cannot
//! silently return a 0–100 value or evaluate the threshold on a different
//! value than the one displayed by the UI.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use fintrace_backend::database::init_db;
use serde_json::{json, Value};
use std::io::Write;
use tower::ServiceExt;

fn write_temp_csv(tag: &str, contents: &str) -> std::path::PathBuf {
    let mut path = std::env::temp_dir();
    path.push(format!("fintrace_{}_{}.csv", tag, std::process::id()));
    let mut file = std::fs::File::create(&path).expect("create temp CSV");
    file.write_all(contents.as_bytes()).expect("write temp CSV");
    path
}

async fn insert_job(
    pool: &fintrace_backend::database::DbPool,
    job_id: &str,
    csv_path: &std::path::Path,
) {
    sqlx::query(
        r#"
        INSERT INTO ingestion_jobs (
            job_id, filename, file_path, file_size, stage,
            detected_columns_json, column_mapping_json, total_rows, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'MAPPING', '[]', '{}', 0, $5, $5)
        "#,
    )
    .bind(job_id)
    .bind("quality.csv")
    .bind(csv_path.to_string_lossy().to_string())
    .bind(128_i64)
    .bind("2026-10-26T10:00:00Z")
    .execute(pool)
    .await
    .expect("insert ingestion job");
}

async fn validate(app: axum::Router, job_id: &str, mapping: Value) -> (StatusCode, Value) {
    let request = Request::builder()
        .method("POST")
        .uri("/validate")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({ "job_id": job_id, "column_mapping": mapping }).to_string(),
        ))
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
async fn quality_score_is_returned_on_zero_to_ten_scale() {
    let pool = init_db("sqlite::memory:")
        .await
        .expect("database initialization must succeed");

    let csv_path = write_temp_csv(
        "quality_high",
        "txn_id,from_acc,to_acc,amount,ts,kind,label\n\
         T1,ACC_A,ACC_B,100.0,2026-10-26T10:00:00Z,UPI,0\n\
         T2,ACC_B,ACC_C,200.0,2026-10-26T10:01:00Z,UPI,1\n",
    );
    let job_id = "JOB-QUALITY-HIGH";
    insert_job(&pool, job_id, &csv_path).await;

    let mapping = json!({
        "transaction_id": "txn_id",
        "source_account": "from_acc",
        "destination_account": "to_acc",
        "amount": "amount",
        "timestamp": "ts",
        "transaction_type": "kind",
        "fraud_label": "label"
    });

    let (status, body) = validate(
        fintrace_backend::ingestion::router(pool.clone()),
        job_id,
        mapping,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "validate failed: {}", body);

    let score = body["dataset_quality_score"]
        .as_f64()
        .expect("dataset_quality_score must be numeric");
    assert!(
        (0.0..=10.0).contains(&score),
        "dataset_quality_score must be on a 0–10 scale, got {score}"
    );
    assert_eq!(score, 9.8, "clean labelled dataset should score 9.8/10");

    assert_eq!(body["can_proceed"], json!(true));
    assert_eq!(body["quality_report"]["max_score"], json!(10.0));
    assert_eq!(body["quality_report"]["readiness_score"], json!(score));
    assert_eq!(body["quality_report"]["meets_threshold"], json!(true));
    assert!(body["message"].as_str().unwrap().contains("9.8/10.0"));

    let _ = std::fs::remove_file(csv_path);
}

#[tokio::test]
async fn quality_score_below_threshold_blocks_commit() {
    let pool = init_db("sqlite::memory:")
        .await
        .expect("database initialization must succeed");

    // Missing sender, receiver, and amount on every row: graph suitability is
    // present but validity/cleanliness drag the dataset below 7.0.
    let csv_path = write_temp_csv(
        "quality_low",
        "txn_id,from_acc,to_acc,amount\n\
         T1,,,\n\
         T2,,,\n",
    );
    let job_id = "JOB-QUALITY-LOW";
    insert_job(&pool, job_id, &csv_path).await;

    let mapping = json!({
        "transaction_id": "txn_id",
        "source_account": "from_acc",
        "destination_account": "to_acc",
        "amount": "amount"
    });

    let (status, body) = validate(
        fintrace_backend::ingestion::router(pool.clone()),
        job_id,
        mapping,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "validate failed: {}", body);

    let score = body["dataset_quality_score"]
        .as_f64()
        .expect("dataset_quality_score must be numeric");
    assert!(
        (0.0..7.0).contains(&score),
        "poor dataset must score below 7.0 on the same 0–10 scale, got {score}"
    );
    assert_eq!(score, 6.5);

    assert_eq!(body["can_proceed"], json!(false));
    assert_eq!(body["quality_report"]["max_score"], json!(10.0));
    assert_eq!(body["quality_report"]["readiness_score"], json!(score));
    assert_eq!(body["quality_report"]["meets_threshold"], json!(false));

    let _ = std::fs::remove_file(csv_path);
}
