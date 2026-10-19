use axum::{
    http::Method,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use fintrace_backend::{
    accounts, alerts, analytics, auth, cases, complaints, config, database, graph, ml_client,
    money_trail, transactions, ws,
};
use serde_json::json;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber).ok();

    let cfg = config::Config::from_env();
    info!("Starting FINTRACE AI Rust High-Performance Engine");
    info!("Binding address: {}:{}", cfg.host, cfg.port);

    // Initialize database pool
    let pool = database::init_db(&cfg.database_url).await?;

    // WebSocket router and broadcaster
    let (ws_router, _ws_tx) = ws::router();

    // CORS configuration matching frontend Vite dev server
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers(Any);

    // Mount all modular routers under /api/v1
    let api_v1 = Router::new()
        .nest("/auth", auth::router(pool.clone(), cfg.jwt_secret.clone()))
        .nest("/transactions", transactions::router(pool.clone()))
        .nest("/accounts", accounts::router(pool.clone()))
        .nest("/graph", graph::router(pool.clone()))
        .nest("/money-trail", money_trail::router(pool.clone()))
        .nest("/complaints", complaints::router(pool.clone()))
        .nest("/cases", cases::router(pool.clone()))
        .nest("/alerts", alerts::router(pool.clone()))
        .nest("/analytics", analytics::router(pool.clone()))
        .nest("/ml", ml_client::router(pool.clone(), cfg.ml_service_url.clone()))
        .nest("/gnn", ml_client::legacy_gnn_router(pool.clone(), cfg.ml_service_url.clone()));

    let app = Router::new()
        .route("/", get(root_handler))
        .route("/health", get(health_handler))
        .merge(ws_router)
        .nest("/api/v1", api_v1)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let addr: SocketAddr = format!("{}:{}", cfg.host, cfg.port).parse()?;
    info!("FinTrace Rust Backend listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn root_handler() -> impl IntoResponse {
    Json(json!({
        "platform": "FinTrace AI High-Performance Engine",
        "engine": "Rust (Axum + Tokio + SQLx)",
        "status": "operational",
        "version": "1.0.0",
        "documentation": "/api/v1/docs",
        "ml_service": "Python PyTorch Microservice"
    }))
}

async fn health_handler() -> impl IntoResponse {
    Json(json!({
        "status": "healthy",
        "service": "fintrace-rust-backend",
        "version": "1.0.0"
    }))
}
