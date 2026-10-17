"""
FinTrace ML System - Phase 14: FastAPI Router for Multi-Task GNN & Tabular GAN
Exposes endpoints for dataset inspection, GAN training/generation, classifier benchmarking,
GNN multi-task training, calibrated inference, and graph analysis.
"""

import os
import json
import logging
import threading
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..ml.inference.predict_service import MLInferenceService
from ..ml.training.train_gan import GANTrainer
from ..ml.training.generate_synthetic import SyntheticTransactionGenerator
from ..ml.evaluation.validate_synthetic import SyntheticQualityValidator
from ..ml.training.train_classifier import FraudClassifierBenchmark
from ..ml.training.train_multitask import MultiTaskGNNTrainer
from ..ml.data.inspect_dataset import DatasetInspector

logger = logging.getLogger("FinTrace.API.ML")
router = APIRouter(prefix="/ml", tags=["Machine Learning (GNN & GAN)"])

# Global inference service instance and training locks
ml_service = MLInferenceService()
training_state = {
    "is_training_gan": False,
    "is_training_gnn": False,
    "is_benchmarking_classifier": False,
    "last_gan_status": "IDLE",
    "last_gnn_status": "IDLE",
    "last_error": None
}

class AccountPredictionRequest(BaseModel):
    account_id: str

class TransactionPredictionRequest(BaseModel):
    transaction_id: Optional[str] = "TXN_PROBE"
    sender_account: str
    receiver_account: str
    amount: float
    transaction_type: Optional[str] = "UPI"
    status: Optional[str] = "COMPLETED"

class TrainGANRequest(BaseModel):
    epochs: Optional[int] = 40
    batch_size: Optional[int] = 64
    learning_rate: Optional[float] = 0.0002

class GenerateSyntheticRequest(BaseModel):
    num_samples: Optional[int] = 400
    fraud_ratio: Optional[float] = 0.35

class TrainGNNRequest(BaseModel):
    epochs: Optional[int] = 50
    learning_rate: Optional[float] = 0.008

# ==========================================
# 1. System Health, Status & Datasets
# ==========================================
@router.get("/status")
def get_ml_status():
    status = ml_service.get_system_status()
    status["training_job_state"] = training_state
    return status

@router.get("/dataset/summary")
def get_dataset_summary():
    art_dir = ml_service.artifacts_dir
    summary_file = os.path.join(art_dir, "dataset_summary.json")
    quality_file = os.path.join(art_dir, "data_quality_report.json")
    
    if not os.path.exists(summary_file):
        # Run inspection on current data
        inspector = DatasetInspector(ml_service.data_csv, art_dir)
        inspector.run_inspection()

    summary_data = {}
    if os.path.exists(summary_file):
        with open(summary_file, "r") as f:
            summary_data = json.load(f)

    quality_data = {}
    if os.path.exists(quality_file):
        with open(quality_file, "r") as f:
            quality_data = json.load(f)

    return {
        "dataset_summary": summary_data,
        "data_quality_report": quality_data
    }

# ==========================================
# 2. Tabular GAN Endpoints
# ==========================================
def _run_gan_training(epochs: int, batch_size: int, lr: float):
    global training_state
    training_state["is_training_gan"] = True
    training_state["last_gan_status"] = "TRAINING"
    try:
        trainer = GANTrainer(ml_service.artifacts_dir, lr=lr)
        trainer.train(ml_service.data_csv, epochs=epochs, batch_size=batch_size)
        training_state["last_gan_status"] = "COMPLETED"
        ml_service.reload_models()
    except Exception as e:
        training_state["last_gan_status"] = "FAILED"
        training_state["last_error"] = str(e)
        logger.error(f"GAN Training failed: {e}")
    finally:
        training_state["is_training_gan"] = False

@router.post("/gan/train")
def train_gan(req: TrainGANRequest, bg: BackgroundTasks):
    if training_state["is_training_gan"]:
        return {"status": "ALREADY_RUNNING", "message": "GAN training job is already active."}
    
    bg.add_task(_run_gan_training, req.epochs or 40, req.batch_size or 64, req.learning_rate or 0.0002)
    return {
        "status": "QUEUED",
        "message": f"CWGAN-GP training initiated for {req.epochs or 40} epochs in background."
    }

@router.get("/gan/metrics")
def get_gan_metrics():
    metrics_file = os.path.join(ml_service.artifacts_dir, "gan_metrics.json")
    history_file = os.path.join(ml_service.artifacts_dir, "gan_training_history.json")
    if not os.path.exists(metrics_file):
        raise HTTPException(status_code=404, detail="GAN training metrics not found. Train the GAN first.")
    
    with open(metrics_file, "r") as f:
        metrics = json.load(f)
    history = {}
    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            history = json.load(f)
            
    return {"summary": metrics, "history": history}

@router.post("/gan/generate")
def generate_synthetic_transactions(req: GenerateSyntheticRequest):
    try:
        gen = SyntheticTransactionGenerator(ml_service.artifacts_dir)
        df_synth = gen.generate(num_samples=req.num_samples or 400, fraud_ratio=req.fraud_ratio or 0.35)
        # Validate quality automatically
        val = SyntheticQualityValidator(ml_service.artifacts_dir)
        val.evaluate(ml_service.data_csv, os.path.join(ml_service.artifacts_dir, "synthetic_transactions.csv"))
        ml_service.reload_models()
        return {
            "status": "SUCCESS",
            "total_generated": len(df_synth),
            "fraud_samples_generated": int(df_synth['is_ground_truth_mule'].sum()),
            "normal_samples_generated": int((~df_synth['is_ground_truth_mule']).sum()),
            "preview": df_synth.head(8).to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.get("/gan/quality")
def get_synthetic_quality():
    q_file = os.path.join(ml_service.artifacts_dir, "synthetic_quality_report.json")
    if not os.path.exists(q_file):
        raise HTTPException(status_code=404, detail="Synthetic quality report not found. Generate synthetic data first.")
    with open(q_file, "r") as f:
        return json.load(f)

# ==========================================
# 3. Supervised Classifier Benchmark Endpoints
# ==========================================
@router.post("/classifier/benchmark")
def run_classifier_benchmark():
    try:
        bench = FraudClassifierBenchmark(ml_service.artifacts_dir)
        report = bench.run_benchmark(ml_service.data_csv, epochs=35)
        ml_service.reload_models()
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classifier benchmark failed: {str(e)}")

@router.get("/classifier/metrics")
def get_classifier_metrics():
    c_file = os.path.join(ml_service.artifacts_dir, "classifier_benchmark_report.json")
    if not os.path.exists(c_file):
        raise HTTPException(status_code=404, detail="Classifier benchmark report not found.")
    with open(c_file, "r") as f:
        return json.load(f)

# ==========================================
# 4. Multi-Task GraphSAGE GNN Endpoints
# ==========================================
def _run_gnn_training(epochs: int, lr: float):
    global training_state
    training_state["is_training_gnn"] = True
    training_state["last_gnn_status"] = "TRAINING"
    try:
        trainer = MultiTaskGNNTrainer(ml_service.artifacts_dir)
        trainer.train(ml_service.data_csv, epochs=epochs, lr=lr)
        training_state["last_gnn_status"] = "COMPLETED"
        ml_service.reload_models()
    except Exception as e:
        training_state["last_gnn_status"] = "FAILED"
        training_state["last_error"] = str(e)
        logger.error(f"GNN Training failed: {e}")
    finally:
        training_state["is_training_gnn"] = False

@router.post("/gnn/train")
def train_gnn(req: TrainGNNRequest, bg: BackgroundTasks):
    if training_state["is_training_gnn"]:
        return {"status": "ALREADY_RUNNING", "message": "GNN training job is already active."}
    
    bg.add_task(_run_gnn_training, req.epochs or 50, req.learning_rate or 0.008)
    return {
        "status": "QUEUED",
        "message": f"Multi-Task GraphSAGE GNN training initiated for {req.epochs or 50} epochs."
    }

@router.get("/gnn/metrics")
def get_gnn_metrics():
    g_file = os.path.join(ml_service.artifacts_dir, "gnn_evaluation_metrics.json")
    h_file = os.path.join(ml_service.artifacts_dir, "gnn_training_history.json")
    if not os.path.exists(g_file):
        raise HTTPException(status_code=404, detail="GNN metrics not found. Train the GNN model first.")
    with open(g_file, "r") as f:
        metrics = json.load(f)
    history = {}
    if os.path.exists(h_file):
        with open(h_file, "r") as f:
            history = json.load(f)
    return {"metrics": metrics, "history": history}

# ==========================================
# 5. Prediction & Inference Endpoints
# ==========================================
@router.post("/predict/account")
def predict_account(req: AccountPredictionRequest):
    return ml_service.predict_account(req.account_id)

@router.post("/predict/transaction")
def predict_transaction(req: TransactionPredictionRequest):
    return ml_service.predict_transaction(req.model_dump())

@router.get("/accounts/ranked")
def get_ranked_accounts(limit: int = Query(50, ge=1, le=500)):
    return ml_service.get_ranked_accounts(limit=limit)

# ==========================================
# 6. Graph Analysis & Topologies
# ==========================================
@router.get("/analysis/money-trail/{account_id}")
def get_money_trail(account_id: str, max_hops: int = Query(4, ge=1, le=8)):
    if ml_service.money_flow is None:
        raise HTTPException(status_code=503, detail="Money flow analyzer not initialized.")
    paths = ml_service.money_flow.trace_forward(account_id, max_hops=max_hops)
    # Add risk context
    account_risk = ml_service.predict_account(account_id)
    return {
        "source_account": account_id,
        "source_risk": account_risk,
        "total_paths_discovered": len(paths),
        "paths": paths[:15]
    }

@router.get("/analysis/communities")
def get_communities(min_size: int = Query(3, ge=2, le=20)):
    if ml_service.community_detector is None:
        raise HTTPException(status_code=503, detail="Community detector not initialized.")
    return ml_service.community_detector.detect_communities(min_size=min_size)

@router.get("/analysis/loops")
def get_circular_loops():
    if ml_service.money_flow is None:
        raise HTTPException(status_code=503, detail="Money flow analyzer not initialized.")
    return ml_service.money_flow.detect_circular_loops()

@router.get("/analysis/conduits")
def get_rapid_conduits():
    if ml_service.money_flow is None:
        raise HTTPException(status_code=503, detail="Money flow analyzer not initialized.")
    return ml_service.money_flow.detect_rapid_conduits()

# ==========================================
# 7. Model Artifact Plots
# ==========================================
@router.get("/artifacts/plot/{plot_name}")
def get_artifact_plot(plot_name: str):
    allowed_plots = {
        "class_distribution.png",
        "gan_loss_curves.png",
        "real_vs_synthetic_distributions.png",
        "pr_roc_curves.png",
        "gnn_training_curves.png"
    }
    if plot_name not in allowed_plots:
        raise HTTPException(status_code=400, detail="Invalid plot requested.")
    
    file_path = os.path.join(ml_service.artifacts_dir, plot_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Plot artifact not found on disk.")
    
    return FileResponse(file_path, media_type="image/png")
