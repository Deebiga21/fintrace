import os
import sys
import warnings

os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["TRITON_DISABLE_LINE_INFO"] = "1"
warnings.filterwarnings("ignore")

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import engine, Base, SessionLocal
from .models import Account, Transaction, Complaint, InvestigationCase, CaseEvidence, AuditLog, ModelRun
from .services.ingestion_service import IngestionService
from .services.gnn_service import GNNService
from .api import (
    transactions_router,
    accounts_router,
    gnn_router,
    graph_router,
    money_trail_router,
    complaints_router,
    cases_router,
    analytics_router,
    auth_router
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FinTrace")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    logger.info("Initializing FinTrace database tables...")
    Base.metadata.create_all(bind=engine)

    # Check if DB has accounts; if not, seed sample data automatically
    db = SessionLocal()
    try:
        acc_count = db.query(Account).count()
        if acc_count == 0:
            logger.info("Database is empty. Automatically loading sample synthetic financial transaction network...")
            res = IngestionService.load_bundled_sample_data(db)
            logger.info(f"Sample data loaded: {res['valid_records']} transactions.")
            
            # Initial train of GNN on baseline dataset
            try:
                train_res = GNNService.train_model(db, epochs=60, lr=0.01)
                logger.info(f"Initial GraphSAGE model trained: F1={train_res['f1_score']}, Accuracy={train_res['accuracy']}")
            except Exception as e:
                logger.warning(f"Could not auto-train initial GNN: {e}")
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
app.include_router(auth_router, prefix=prefix)
app.include_router(transactions_router, prefix=prefix)
app.include_router(accounts_router, prefix=prefix)
app.include_router(gnn_router, prefix=prefix)
app.include_router(graph_router, prefix=prefix)
app.include_router(money_trail_router, prefix=prefix)
app.include_router(complaints_router, prefix=prefix)
app.include_router(cases_router, prefix=prefix)
app.include_router(analytics_router, prefix=prefix)

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
