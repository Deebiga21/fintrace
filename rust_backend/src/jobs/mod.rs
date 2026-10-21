use axum::{
    extract::{Path, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{database::DbPool, errors::AppError};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Job {
    pub job_id: String,
    pub job_type: String,
    pub status: String,
    pub progress: f64,
    pub result_json: Option<String>,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/:job_id", get(get_job))
        .with_state(pool)
}

async fn get_job(
    State(pool): State<DbPool>,
    Path(job_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let job = sqlx::query_as::<_, Job>(
        r#"
        SELECT
            job_id, job_type, status, progress, result_json,
            error_message, created_at, updated_at
        FROM jobs
        WHERE job_id = $1
        "#,
    )
    .bind(&job_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Job {} not found", job_id)))?;

    let result_val: Option<serde_json::Value> = job
        .result_json
        .as_ref()
        .and_then(|r| serde_json::from_str(r).ok());

    Ok(Json(serde_json::json!({
        "job_id": job.job_id,
        "job_type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "result": result_val,
        "error_message": job.error_message,
        "created_at": job.created_at,
        "updated_at": job.updated_at
    })))
}
