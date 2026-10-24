import os
import sys
import json
import warnings
from datetime import datetime

os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["TRITON_DISABLE_LINE_INFO"] = "1"
warnings.filterwarnings("ignore")

import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from sqlalchemy import text

from .config import settings
from .database import engine, Base, SessionLocal
from .models import (
    Account,
    Transaction,
    Complaint,
    InvestigationCase,
    CaseEvidence,
    CaseAccount,
    CaseTransaction,
    CaseComplaint,
    AuditLog,
    ModelRun
)
from .websocket_manager import ws_manager
from .services.ingestion_service import IngestionService
from .services.case_service import CaseService
from .api import (
    transactions_router,
    accounts_router,
    gnn_router,
    graph_router,
    money_trail_router,
    complaints_router,
    cases_router,
    analytics_router,
    ml_router,
    pipeline_router
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FinTrace")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    logger.info("Initializing FinTrace database tables...")
    Base.metadata.create_all(bind=engine)

    # SQLite column migration check for cases
    with engine.connect() as conn:
        try:
            cur_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(cases)")).fetchall()]
            needed = [
                ("case_number", "VARCHAR(64)"),
                ("created_by", "VARCHAR(128) DEFAULT 'Investigator'"),
                ("source_type", "VARCHAR(64) DEFAULT 'GNN Alert'"),
                ("source_reference_id", "VARCHAR(128)"),
                ("closure_reason", "TEXT"),
                ("version", "INTEGER DEFAULT 1")
            ]
            for col, ctype in needed:
                if col not in cur_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE cases ADD COLUMN {col} {ctype}"))
                        conn.commit()
                        logger.info(f"Added column {col} to cases table.")
                    except Exception as ex:
                        logger.warning(f"Could not add column {col}: {ex}")
        except Exception as e:
            logger.warning(f"Schema check error: {e}")

    # Initialize sample data if needed
    db = SessionLocal()
    try:
        acc_count = db.query(Account).count()
        if acc_count == 0:
            logger.info("Database is empty. Automatically loading sample synthetic financial transaction network...")
            res = IngestionService.load_bundled_sample_data(db)
            logger.info(f"Sample data loaded: {res['valid_records']} transactions.")
        
        # Seed realistic benchmark investigation cases if empty
        CaseService.seed_sample_cases_if_empty(db)
        logger.info("FinTrace investigation cases verified/seeded.")
    finally:
        db.close()

    yield
    logger.info("FinTrace platform shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Intelligent Mule Account Detection and Financial Fraud Investigation Platform using Graph Neural Networks (GraphSAGE)",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
prefix = settings.API_V1_STR
app.include_router(transactions_router, prefix=prefix)
app.include_router(accounts_router, prefix=prefix)
app.include_router(gnn_router, prefix=prefix)
app.include_router(graph_router, prefix=prefix)
app.include_router(money_trail_router, prefix=prefix)
app.include_router(complaints_router, prefix=prefix)
app.include_router(cases_router, prefix=prefix)
app.include_router(analytics_router, prefix=prefix)
app.include_router(ml_router, prefix=prefix)
app.include_router(pipeline_router, prefix=prefix)

# WebSocket endpoint for real-time AML case sync & alerts
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    }))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket client disconnected or error: {e}")
        ws_manager.disconnect(websocket)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "operational",
        "documentation": "/docs",
        "gnn_architecture": "GraphSAGE (PyG SAGEConv with 2-hop neighborhood aggregation)",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "fintrace-backend"}

# Mount built frontend distribution if present so port 8000 also serves the SPA seamlessly
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail=f"API endpoint '/{full_path}' not found")
        file_path = os.path.join(dist_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"platform": settings.PROJECT_NAME, "status": "operational"}
