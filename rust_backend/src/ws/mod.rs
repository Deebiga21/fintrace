use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::info;

#[derive(Clone)]
pub struct WsState {
    pub tx: broadcast::Sender<String>,
}

pub fn router() -> (Router, broadcast::Sender<String>) {
    let (tx, _) = broadcast::channel(100);
    let state = Arc::new(WsState { tx: tx.clone() });

    let r = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(state);

    (r, tx)
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<WsState>>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<WsState>) {
    let mut rx = state.tx.subscribe();

    info!("New WebSocket client subscribed for live AML updates");

    let welcome = json!({
        "event": "CONNECTED",
        "message": "Connected to FinTrace Real-Time AML Event Stream",
        "timestamp": chrono::Utc::now().to_rfc3339()
    });
    if socket
        .send(Message::Text(welcome.to_string()))
        .await
        .is_err()
    {
        return;
    }

    loop {
        tokio::select! {
            res = socket.recv() => {
                match res {
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Err(_)) => break,
                    _ => {}
                }
            }
            msg = rx.recv() => {
                if let Ok(text) = msg {
                    if socket.send(Message::Text(text)).await.is_err() {
                        break;
                    }
                }
            }
        }
    }

    info!("WebSocket client disconnected");
}
