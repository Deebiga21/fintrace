use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, PasswordVerifier, SaltString},
    Argon2, PasswordHash,
};
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{
    database::DbPool,
    errors::AppError,
    models::{user::LoginRequest, user::LoginResponse, user::User, user::UserProfile},
};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub badge_id: String,
    pub role: String,
    pub exp: i64,
}

#[derive(Clone)]
pub struct AuthState {
    pub pool: DbPool,
    pub jwt_secret: String,
}

pub fn hash_password(password: &str, _salt_hint: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .unwrap_or_else(|_| "invalid_hash".to_string())
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let parsed_hash = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

pub fn create_jwt(user: &User, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let exp = Utc::now()
        .checked_add_signed(Duration::days(7))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user.id.clone(),
        badge_id: user.badge_id.clone(),
        role: user.role.clone(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub fn verify_jwt(token: &str, secret: &str) -> Result<Claims, AppError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::Unauthorized("Invalid or expired authorization token".to_string()))
}

pub fn router(pool: DbPool, jwt_secret: String) -> Router {
    let state = Arc::new(AuthState { pool, jwt_secret });

    Router::new()
        .route("/login", post(login_handler))
        .route("/me", get(me_handler))
        .with_state(state)
}

async fn login_handler(
    State(state): State<Arc<AuthState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, badge_id, name, email, password_hash, role, created_at FROM users WHERE badge_id = $1",
    )
    .bind(&payload.badge_id)
    .fetch_optional(&state.pool)
    .await?;

    let user = match user {
        Some(u) => u,
        None => {
            // In demo mode for hackathon / institutional demonstration, allow auto-login for badge_id
            let new_user = User {
                id: uuid::Uuid::new_v4().to_string(),
                badge_id: payload.badge_id.clone(),
                name: format!("Investigator {}", payload.badge_id),
                email: Some("investigator@fiu-ind.gov.in".to_string()),
                password_hash: hash_password(&payload.password, "demo"),
                role: "Investigator".to_string(),
                created_at: Utc::now().to_rfc3339(),
            };

            sqlx::query(
                "INSERT INTO users (id, badge_id, name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)"
            )
            .bind(&new_user.id)
            .bind(&new_user.badge_id)
            .bind(&new_user.name)
            .bind(&new_user.email)
            .bind(&new_user.password_hash)
            .bind(&new_user.role)
            .bind(&new_user.created_at)
            .execute(&state.pool)
            .await?;

            new_user
        }
    };

    let token = create_jwt(&user, &state.jwt_secret)
        .map_err(|e| AppError::Internal(format!("Failed to generate JWT: {}", e)))?;

    // Record audit event
    let _ = sqlx::query(
        "INSERT INTO audit_logs (timestamp, user, action, target_type, target_id, details) VALUES (datetime('now'), $1, 'LOGIN', 'USER', $2, 'Investigator logged in successfully')"
    )
    .bind(&user.badge_id)
    .bind(&user.id)
    .execute(&state.pool)
    .await;

    Ok(Json(LoginResponse {
        access_token: token,
        token_type: "Bearer".to_string(),
        investigator: UserProfile {
            id: user.id,
            badge_id: user.badge_id,
            name: user.name,
            role: user.role,
        },
    }))
}

async fn me_handler(
    State(state): State<Arc<AuthState>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".to_string()))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::Unauthorized("Invalid token format".to_string()))?;

    let claims = verify_jwt(token, &state.jwt_secret)?;

    let user = sqlx::query_as::<_, User>(
        "SELECT id, badge_id, name, email, password_hash, role, created_at FROM users WHERE id = $1",
    )
    .bind(&claims.sub)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(Json(UserProfile {
        id: user.id,
        badge_id: user.badge_id,
        name: user.name,
        role: user.role,
    }))
}
