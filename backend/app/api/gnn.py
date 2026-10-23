import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..database import get_db
from ..schemas.gnn import GNNTrainRequest, GNNTrainResponse, GNNInferenceResponse
from ..services.gnn_service import GNNService
from ..models.model_run import ModelRun
from ..models.account import Account
from ..models.transaction import Transaction

router = APIRouter(prefix="/gnn", tags=["Graph Neural Network"])

@router.post("/train", response_model=GNNTrainResponse)
def train_gnn_model(req: GNNTrainRequest, db: Session = Depends(get_db)):
    try:
        res = GNNService.train_model(
            db,
            epochs=req.epochs or 100,
            lr=req.learning_rate or 0.01
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Training failed: {str(e)}")

@router.post("/infer", response_model=GNNInferenceResponse)
def run_gnn_inference(db: Session = Depends(get_db)):
    try:
        res = GNNService.run_inference(db)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

@router.get("/runs")
def list_model_runs(db: Session = Depends(get_db)):
    runs = db.query(ModelRun).order_by(ModelRun.timestamp.desc()).all()
    results = []
    for r in runs:
        cm = []
        if r.confusion_matrix_json:
            try:
                cm = json.loads(r.confusion_matrix_json)
            except Exception:
                cm = []
        results.append({
            "run_id": r.run_id,
            "timestamp": r.timestamp.isoformat(),
            "model_name": r.model_name,
            "architecture": r.architecture,
            "num_nodes": r.num_nodes,
            "num_edges": r.num_edges,
            "epochs": r.epochs,
            "train_loss": r.train_loss,
            "accuracy": r.accuracy,
            "precision": r.precision,
            "recall": r.recall,
            "f1_score": r.f1_score,
            "confusion_matrix": cm,
            "is_trained_on_ground_truth": r.is_trained_on_ground_truth,
            "notes": r.notes
        })
    return results

@router.get("/status")
def get_gnn_status(db: Session = Depends(get_db)):
    latest = db.query(ModelRun).order_by(ModelRun.timestamp.desc()).first()
    return {
        "model_name": "GraphSAGE (account transaction graph)",
        "checkpoint_available": os.path.isfile(GNNService.WEIGHTS_PATH),
        "checkpoint_path": os.path.basename(GNNService.WEIGHTS_PATH),
        "account_count": db.query(Account).count(),
        "transaction_count": db.query(Transaction).count(),
        "latest_run": None if latest is None else {
            "run_id": latest.run_id,
            "timestamp": latest.timestamp.isoformat() if latest.timestamp else None,
            "architecture": latest.architecture,
            "epochs": latest.epochs,
            "f1_score": latest.f1_score,
            "is_trained_on_ground_truth": latest.is_trained_on_ground_truth,
        },
    }
