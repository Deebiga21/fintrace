use axum::{
    extract::{Query, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::{
    database::DbPool,
    errors::AppError,
    models::audit::AuditLog,
};

#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    pub limit: Option<i64>,
    pub action: Option<String>,
    pub user: Option<String>,
}

pub fn router(pool: DbPool) -> Router {
    Router::new()
        .route("/", get(list_audit_logs))
        .with_state(pool)
}

async fn list_audit_logs(
    State(pool): State<DbPool>,
    Query(params): Query<AuditLogQuery>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params.limit.unwrap_or(50).min(500);
    let mut query = String::from("SELECT id, timestamp, user, action, target_type, target_id, details FROM audit_logs WHERE 1=1");

    if let Some(ref a) = params.action {
        query.push_str(&format!(" AND action = '{}'", a));
    }
    if let Some(ref u) = params.user {
        query.push_str(&format!(" AND user = '{}'", u));
    }

    query.push_str(&format!(" ORDER BY id DESC LIMIT {}", limit));

    let logs = sqlx::query_as::<_, AuditLog>(&query)
        .fetch_all(&pool)
        .await?;

    Ok(Json(json!({
        "total": logs.len(),
        "audit_logs": logs
    })))
}
