//! Regression test for the ingestion column-mapping persistence bug.
//!
//! The original defect: `/ingestion/validate` used the submitted mapping to
//! score the dataset but never wrote it back to `ingestion_jobs`, so
//! `/ingestion/{job_id}/commit` reloaded the stale (auto-suggested) mapping and
//! silently ignored the columns the user confirmed.

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

async fn post_json(app: axum::Router, uri: &str, payload: Value) -> (StatusCode, Value) {
    let request = Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::from(payload.to_string()))
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
async fn custom_column_mapping_survives_validate_and_commit() {
    let pool = init_db("sqlite::memory:")
        .await
        .expect("database initialization must succeed");

    // Renamed source columns; none match the auto-detection vocabulary.
    let csv_path = write_temp_csv(
        "mapping_commit",
        "tx_ref,from_acct,to_acct,value,ts,kind,label\n\
         TX-CUSTOM-1,ACC_SRC,ACC_DST,1234.5,2026-10-26T10:00:00Z,UPI,0\n",
    );

    let job_id = "JOB-MAPPING-REGRESSION";
    let now = "2026-10-26T10:00:00Z";

    // Simulate a job left at the upload stage with the auto-suggested mapping.
    // The suggested mapping intentionally does not resolve the custom columns.
    sqlx::query(
        r#"
        INSERT INTO ingestion_jobs (
            job_id, filename, file_path, file_size, stage,
            detected_columns_json, column_mapping_json, total_rows, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'MAPPING', $5, $6, 1, $7, $7)
        "#,
    )
    .bind(job_id)
    .bind("renamed_columns.csv")
    .bind(csv_path.to_string_lossy().to_string())
    .bind(128_i64)
    .bind(
        json!([
            "tx_ref",
            "from_acct",
            "to_acct",
            "value",
            "ts",
            "kind",
            "label"
        ])
        .to_string(),
    )
    .bind(json!({}).to_string())
    .bind(now)
    .execute(&pool)
    .await
    .expect("insert ingestion job");

    let confirmed_mapping = json!({
        "transaction_id": "tx_ref",
        "source_account": "from_acct",
        "destination_account": "to_acct",
        "amount": "value",
        "timestamp": "ts",
        "transaction_type": "kind",
        "fraud_label": "label"
    });

    // Step 1: validate with the user-confirmed mapping.
    let app = fintrace_backend::ingestion::router(pool.clone());
    let (status, body) = post_json(
        app.clone(),
        "/validate",
        json!({ "job_id": job_id, "column_mapping": confirmed_mapping }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "validate failed: {}", body);

    // The mapping must now be persisted, not just echoed in the response.
    let stored_mapping_json: String =
        sqlx::query_scalar("SELECT column_mapping_json FROM ingestion_jobs WHERE job_id = $1")
            .bind(job_id)
            .fetch_one(&pool)
            .await
            .expect("read stored mapping");
    let stored_mapping: Value =
        serde_json::from_str(&stored_mapping_json).expect("stored mapping JSON");
    assert_eq!(
        stored_mapping, confirmed_mapping,
        "validate must persist the confirmed column mapping"
    );

    // Step 2: commit. It reloads the mapping from the database.
    let (status, body) = post_json(
        app,
        &format!("/{}/commit", job_id),
        json!({ "clean_null_timestamps": true, "quarantine_invalid_rows": true }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "commit failed: {}", body);
    assert_eq!(body["inserted_transactions"], 1);

    // Step 3: prove the renamed columns were actually written.
    let row_ok: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM transactions WHERE transaction_id = 'TX-CUSTOM-1' \
         AND sender_account = 'ACC_SRC' AND receiver_account = 'ACC_DST' AND amount = 1234.5",
    )
    .fetch_one(&pool)
    .await
    .expect("query committed transaction");

    assert_eq!(
        row_ok, 1,
        "commit must use the confirmed mapping, not the stale suggested one"
    );

    let _ = std::fs::remove_file(csv_path);
}
