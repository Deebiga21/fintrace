import asyncio
import json
import logging
from typing import Set, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("FinTrace.WS")

class WebSocketConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[FinTrace WS] Client connected. Total active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"[FinTrace WS] Client disconnected. Total active clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        payload = json.dumps(message)
        dead = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"[FinTrace WS] Failed to send message to client: {e}")
                dead.append(connection)
        for d in dead:
            self.active_connections.discard(d)

    def emit_event(self, event: str, case_id: str, data: Dict[str, Any] = None):
        """
        Thread-safe broadcast helper that can be called from synchronous service logic.
        """
        msg = {
            "event": event,
            "case_id": case_id,
            "data": data or {}
        }
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(msg))
        except RuntimeError:
            # If no running loop in current thread, attempt to schedule or fire asynchronously
            try:
                loop = asyncio.new_event_loop()
                loop.run_until_complete(self.broadcast(msg))
                loop.close()
            except Exception as ex:
                logger.debug(f"[FinTrace WS] Could not broadcast event {event}: {ex}")

ws_manager = WebSocketConnectionManager()
