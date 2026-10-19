use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;

use crate::{
    database::DbPool,
    errors::AppError,
    models::alert::{Alert, CreateAlertRequest, UpdateAlertRequest},
};

#[derive(Debug, Deserialize)]
pub struct AlertFilterParams {
    pub status: Option<String>,
    pub severity: Option<String>,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/", get(list_alerts))
        .route("/", post(create_alert))
        .route("/:id", put(update_alert))
        .with_state(pool)
}

async fn list_alerts(
    State(pool): State<DbPool>,
    Query(params): Query<AlertFilterParams>,
) -> Result<impl IntoResponse, AppError> {
    let mut query = String::from("SELECT alert_id, target_type, target_id, severity, reason_code, status, assigned_to, notes, created_at, updated_at FROM alerts WHERE 1=1");

    if let Some(ref st) = params.status {
        query.push_str(&format!(" AND status = '{}'", st));
    }

    if let Some(ref sv) = params.severity {
        query.push_str(&format!(" AND severity = '{}'", sv));
    }

    query.push_str(" ORDER BY created_at DESC");

    let alerts = sqlx::query_as::<_, Alert>(&query)
        .fetch_all(&pool)
        .await?;

    Ok(Json(json!({
        "total": alerts.len(),
        "alerts": alerts
    })))
}

async fn create_alert(
    State(pool): State<DbPool>,
    Json(payload): Json<CreateAlertRequest>,
) -> Result<impl IntoResponse, AppError> {
    let alert_id = format!("ALT-{}", uuid::Uuid::new_v4().to_string().replace("-", "")[..8].to_uppercase());
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO alerts (alert_id, target_type, target_id, severity, reason_code, status, assigned_to, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'New', NULL, $6, $7, $7)
        "#
    )
    .bind(&alert_id)
    .bind(&payload.target_type)
    .bind(&payload.target_id)
    .bind(&payload.severity)
    .bind(&payload.reason_code)
    .bind(&payload.notes)
    .bind(&now)
    .execute(&pool)
    .await?;

    let alert = sqlx::query_as::<_, Alert>(
        "SELECT alert_id, target_type, target_id, severity, reason_code, status, assigned_to, notes, created_at, updated_at FROM alerts WHERE alert_id = $1"
    )
    .bind(&alert_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(alert))
}

async fn update_alert(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateAlertRequest>,
) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now().to_rfc3339();

    let existing = sqlx::query_as::<_, Alert>(
        "SELECT alert_id, target_type, target_id, severity, reason_code, status, assigned_to, notes, created_at, updated_at FROM alerts WHERE alert_id = $1"
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Alert {} not found", id)))?;

    let status = payload.status.unwrap_or(existing.status);
    let assigned = payload.assigned_to.or(existing.assigned_to);
    let notes = payload.notes.or(existing.notes);

    sqlx::query(
        r#"
        UPDATE alerts SET
            status = $1,
            assigned_to = $2,
            notes = $3,
            updated_at = $4
        WHERE alert_id = $5
        "#
    )
    .bind(&status)
    .bind(&assigned)
    .bind(&notes)
    .bind(&now)
    .bind(&id)
    .execute(&pool)
    .await?;

    let updated = sqlx::query_as::<_, Alert>(
        "SELECT alert_id, target_type, target_id, severity, reason_code, status, assigned_to, notes, created_at, updated_at FROM alerts WHERE alert_id = $1"
    )
    .bind(&id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(updated))
}
