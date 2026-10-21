use axum::{extract::State, response::IntoResponse, routing::post, Json, Router};
use chrono::Utc;
use serde_json::json;

use crate::{database::DbPool, errors::AppError};

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/reset", post(reset_demo_data))
        .with_state(pool)
}

async fn reset_demo_data(State(pool): State<DbPool>) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now().to_rfc3339();

    // Run within a transaction for safety
    let mut tx = pool.begin().await?;

    // Reset ACC_SOA_03
    sqlx::query(
        r#"
        UPDATE accounts SET
            risk_score = 0.98,
            risk_level = 'High',
            prediction_confidence = 0.96,
            customer_name = 'Rohan Kumar Sah',
            status = 'Core Banking Dormant & Total Freeze',
            notes = 'High-velocity aggregate conduit identified from 25 Bank Statements. Total volume ₹785.36 Cr.'
        WHERE account_id = 'ACC_SOA_03'
        "#
    )
    .execute(&mut *tx)
    .await?;

    // Reset ACC_SOA_02
    sqlx::query(
        r#"
        UPDATE accounts SET
            risk_score = 0.94,
            risk_level = 'High',
            prediction_confidence = 0.92,
            customer_name = 'Mahendra Kumar',
            status = 'Dormant - Core Banking Freeze'
        WHERE account_id = 'ACC_SOA_02'
        "#,
    )
    .execute(&mut *tx)
    .await?;

    // Clear completed/failed test jobs
    sqlx::query("DELETE FROM jobs WHERE status IN ('COMPLETED', 'FAILED')")
        .execute(&mut *tx)
        .await?;

    // Record audit log
    let details = "Demo dataset re-synchronized to baseline 25 Bank Statement of Accounts (SOA)";
    sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(&now)
    .bind("Admin_Demo")
    .bind("DEMO_DATA_RESET")
    .bind("DATASET")
    .bind("dataset-soa-proposed")
    .bind(details)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(json!({
        "status": "success",
        "message": "Demo data safely reinitialized to primary statement baseline.",
        "dataset_id": "dataset-soa-proposed",
        "dataset_version": "v1.0-SOA-Randomized",
        "timestamp": now
    })))
}
