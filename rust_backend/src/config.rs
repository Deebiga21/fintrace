use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub ml_service_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8000);

        // Default to local sqlite database in the project root/backend for instant zero-dependency execution
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite://../backend/fintrace.db".to_string());

        let jwt_secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| "fintrace-super-secure-investigator-secret-key-2026".to_string());

        let ml_service_url = env::var("ML_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8001/api/v1".to_string());

        Self {
            host,
            port,
            database_url,
            jwt_secret,
            ml_service_url,
        }
    }
}
