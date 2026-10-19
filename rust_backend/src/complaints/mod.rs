use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;

use crate::{
    database::DbPool,
    errors::AppError,
    models::complaint::{Complaint, CreateComplaintRequest},
};

#[derive(Debug, Deserialize)]
pub struct ComplaintFilterParams {
    pub limit: Option<i64>,
    pub skip: Option<i64>,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/", get(list_complaints))
        .route("/", post(create_complaint))
        .route("/by-account/:id", get(get_complaints_by_account))
        .with_state(pool)
}

async fn list_complaints(
    State(pool): State<DbPool>,
    Query(params): Query<ComplaintFilterParams>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params.limit.unwrap_or(100).min(500);
    let skip = params.skip.unwrap_or(0);

    let complaints = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, created_at FROM complaints ORDER BY date_reported DESC LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(skip)
    .fetch_all(&pool)
    .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM complaints")
        .fetch_one(&pool)
        .await?;

    Ok(Json(json!({
        "total": total,
        "skip": skip,
        "limit": limit,
        "complaints": complaints
    })))
}

async fn create_complaint(
    State(pool): State<DbPool>,
    Json(payload): Json<CreateComplaintRequest>,
) -> Result<impl IntoResponse, AppError> {
    let complaint_id = format!("CMP_{}", uuid::Uuid::new_v4().to_string().replace("-", "")[..10].to_uppercase());
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO complaints (complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'New', $8, $9)
        "#
    )
    .bind(&complaint_id)
    .bind(&now)
    .bind(&payload.complainant_name)
    .bind(&payload.description)
    .bind(&payload.reported_account_id)
    .bind(&payload.transaction_id)
    .bind(payload.amount_lost)
    .bind(payload.source.as_deref().unwrap_or("National Cyber Crime Portal"))
    .bind(&now)
    .execute(&pool)
    .await?;

    // Record audit event
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES (datetime('now'), 'Investigator', 'COMPLAINT_REGISTERED', 'COMPLAINT', $1, $2)"
    )
    .bind(&complaint_id)
    .bind(format!("Registered complaint for victim {} against account {}", payload.complainant_name, payload.reported_account_id))
    .execute(&pool)
    .await;

    let complaint = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, created_at FROM complaints WHERE complaint_id = $1"
    )
    .bind(&complaint_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(complaint))
}

async fn get_complaints_by_account(
    State(pool): State<DbPool>,
    Path(account_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let complaints = sqlx::query_as::<_, Complaint>(
        "SELECT complaint_id, date_reported, complainant_name, description, reported_account_id, transaction_id, amount_lost, status, source, created_at FROM complaints WHERE reported_account_id = $1 ORDER BY date_reported DESC"
    )
    .bind(&account_id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(complaints))
}
