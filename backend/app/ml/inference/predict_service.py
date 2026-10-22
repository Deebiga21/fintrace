"""
FinTrace ML System - Phase 13 & 14: Inference & Investigator Evidence Service
Serves calibrated predictions, topological explanations, and evidence references.
"""

import os
import json
import logging
import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

from ..models.graphsage_multitask import MultiTaskGNN
from ..models.fraud_classifier import TabularFraudClassifier
from ..data.preprocess import TransactionPreprocessor
from ..data.build_graph import TransactionGraphBuilder
from ..analysis.money_trail import MoneyFlowAnalyzer
from ..analysis.community_detection import SyndicateCommunityDetector
from ..data.inspect_dataset import DatasetInspector

logger = logging.getLogger("FinTrace.ML.PredictService")

class MLInferenceService:
    def __init__(self, artifacts_dir: str = None, data_csv: str = None):
        if artifacts_dir is None:
            self.artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
        else:
            self.artifacts_dir = artifacts_dir

        if data_csv is None:
            proposed_csv = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "proposed_cleaned_transactions.csv"))
            if os.path.exists(proposed_csv):
                self.data_csv = proposed_csv
            else:
                self.data_csv = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "benchmark_transactions.csv"))
                if not os.path.exists(self.data_csv):
                    self.data_csv = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "sample_transactions.csv"))
        else:
            self.data_csv = data_csv

        self.device = torch.device("cpu")
        self.preprocessor = None
        self.gnn_model = None
        self.classifier_model = None
        self.graph_data = None
        self.node_to_idx = {}
        self.idx_to_node = {}
        self.df_txns = None
        self.money_flow = None
        self.community_detector = None
        
        self.reload_models()

    def reload_models(self):
        """
        Reloads latest weights, schemas, and graph data into memory.
        """
        logger.info("Reloading ML Inference models & artifacts...")
        if os.path.exists(self.data_csv):
            self.df_txns = pd.read_csv(self.data_csv)
            self.money_flow = MoneyFlowAnalyzer(self.df_txns)
        else:
            self.df_txns = pd.DataFrame()

        # 1. Load Preprocessor
        try:
            self.preprocessor = TransactionPreprocessor(self.artifacts_dir)
            self.preprocessor.load_params()
        except Exception as e:
            logger.warning(f"Preprocessor could not be loaded: {e}")

        # 2. Load Node Mapping & Graph
        mapping_path = os.path.join(self.artifacts_dir, "node_mapping.json")
        if os.path.exists(mapping_path):
            with open(mapping_path, "r") as f:
                mapping = json.load(f)
                self.node_to_idx = mapping.get("node_to_idx", {})
                self.idx_to_node = {int(k): v for k, v in mapping.get("idx_to_node", {}).items()}

        if self.df_txns is not None and not self.df_txns.empty:
            builder = TransactionGraphBuilder(self.artifacts_dir)
            self.graph_data, _ = builder.build_from_dataframe(self.df_txns)
            self.node_to_idx = builder.node_to_idx
            self.idx_to_node = builder.idx_to_node

        # 3. Load GNN
        gnn_weights = os.path.join(self.artifacts_dir, "graphsage_multitask.pt")
        if os.path.exists(gnn_weights) and self.graph_data is not None:
            try:
                self.gnn_model = MultiTaskGNN(
                    node_features_dim=self.graph_data.x.size(1),
                    edge_features_dim=self.graph_data.edge_attr.size(1),
                    hidden_dim=32,
                    embedding_dim=16
                )
                self.gnn_model.load_state_dict(torch.load(gnn_weights, map_location=self.device, weights_only=True))
                self.gnn_model.eval()
                logger.info("Loaded Multi-Task GraphSAGE GNN weights.")
            except Exception as e:
                logger.warning(f"Could not load GNN model: {e}")

        # 4. Load Tabular Classifier
        clf_weights = os.path.join(self.artifacts_dir, "classifier_augmented.pt")
        if not os.path.exists(clf_weights):
            clf_weights = os.path.join(self.artifacts_dir, "classifier_baseline.pt")
        if os.path.exists(clf_weights) and self.preprocessor is not None:
            try:
                state_dict = torch.load(clf_weights, map_location=self.device, weights_only=True)
                ckpt_dim = state_dict["net.0.weight"].shape[1]
                self.classifier_model = TabularFraudClassifier(in_features=ckpt_dim)
                self.classifier_model.load_state_dict(state_dict)
                self.classifier_model.eval()
                logger.info(f"Loaded Tabular Fraud Classifier weights from {os.path.basename(clf_weights)} (in_features={ckpt_dim}).")
            except Exception as e:
                logger.warning(f"Could not load Classifier model: {e}")

        # 5. Initialize Community Detector
        if self.df_txns is not None and not self.df_txns.empty:
            self.community_detector = SyndicateCommunityDetector(self.df_txns)

    def predict_account(self, account_id: str) -> Dict[str, Any]:
        """
        Computes GNN mule risk probability, anomaly score, and topological evidence references.
        """
        if account_id not in self.node_to_idx or self.gnn_model is None or self.graph_data is None:
            # Fallback if account not yet in graph
            return {
                "account_id": account_id,
                "model_status": "UNINDEXED_OR_COLD_ACCOUNT",
                "mule_probability": 0.05,
                "risk_tier": "LOW",
                "anomaly_score": 0.0,
                "explanation_summary": "Account does not have sufficient relational transaction history in the graph.",
                "evidence": {}
            }

        idx = self.node_to_idx[account_id]
        with torch.no_grad():
            out = self.gnn_model(self.graph_data.x, self.graph_data.edge_index, self.graph_data.edge_attr)
            account_probs = F.softmax(out["account_logits"], dim=-1)[idx].cpu().numpy()
            mule_prob = float(round(account_probs[1], 4))
            anomaly_score = float(round(out["anomaly_scores"][idx].item(), 4))
            embedding = [float(round(v, 4)) for v in out["embeddings"][idx].cpu().numpy()]

        risk_tier = "CRITICAL" if mule_prob >= 0.75 else ("HIGH" if mule_prob >= 0.50 else ("MODERATE" if mule_prob >= 0.25 else "LOW"))

        # Extract topological evidence from transaction records
        incoming = self.df_txns[self.df_txns['receiver_account'] == account_id]
        outgoing = self.df_txns[self.df_txns['sender_account'] == account_id]

        inflow_vol = float(round(incoming['amount'].sum(), 2))
        outflow_vol = float(round(outgoing['amount'].sum(), 2))
        counterparties = list(set(incoming['sender_account'].unique()).union(set(outgoing['receiver_account'].unique())))

        drain_ratio = round((outflow_vol / max(1.0, inflow_vol)) * 100, 1) if inflow_vol > 0 else 0.0

        evidence_signals = []
        if drain_ratio >= 85.0 and len(outgoing) > 0 and len(incoming) > 0:
            evidence_signals.append(f"High-Velocity Drain: {drain_ratio}% of total inflow disbursed rapidly.")
        if len(incoming) >= 4 and len(outgoing) <= 2:
            evidence_signals.append(f"Smurfing Convergence: {len(incoming)} distinct source accounts aggregating into this node.")
        if anomaly_score >= 0.18:
            evidence_signals.append(f"Topological Anomaly: Neighborhood structure diverges from legitimate banking baseline (Recon MSE: {anomaly_score}).")

        explanation = (
            "Flagged by Multi-Task GraphSAGE: Relational structural embeddings indicate active conduit/aggregator role. " +
            " | ".join(evidence_signals) if evidence_signals else "Consistent with legitimate peer/retail counterparty distribution."
        )

        return {
            "account_id": account_id,
            "mule_probability": mule_prob,
            "risk_score_100": int(mule_prob * 100),
            "risk_tier": risk_tier,
            "anomaly_score": anomaly_score,
            "is_flagged_for_review": bool(mule_prob >= 0.50),
            "explanation_summary": explanation,
            "evidence": {
                "inflow_volume": inflow_vol,
                "outflow_volume": outflow_vol,
                "inflow_transaction_count": len(incoming),
                "outflow_transaction_count": len(outgoing),
                "drain_ratio_pct": drain_ratio,
                "unique_counterparties_count": len(counterparties),
                "sample_counterparties": counterparties[:8],
                "observable_signals": evidence_signals
            },
            "embedding_16d": embedding,
            "model_version": "GraphSAGE_v1.0_MultiTask",
            "statutory_disclaimer": "This score represents an algorithmic risk assessment for prioritization, not legal proof of fraud. Human investigator audit required."
        }

    def predict_transaction(self, record: dict) -> Dict[str, Any]:
        """
        Evaluates transaction risk using tabular classifier + GNN edge interaction features.
        """
        df_single = pd.DataFrame([record])
        if self.preprocessor is None or self.classifier_model is None:
            return {
                "transaction_id": record.get("transaction_id", "UNKNOWN"),
                "fraud_probability": 0.05,
                "risk_tier": "LOW",
                "explanation": "Classifier not loaded."
            }

        X = self.preprocessor.transform_inference(df_single)
        with torch.no_grad():
            prob = float(self.classifier_model.predict_proba(torch.tensor(X, dtype=torch.float32)).item())

        prob = round(prob, 4)
        risk_tier = "CRITICAL" if prob >= 0.75 else ("HIGH" if prob >= 0.50 else ("MODERATE" if prob >= 0.25 else "LOW"))

        return {
            "transaction_id": record.get("transaction_id", "TXN_SIMULATED"),
            "sender_account": record.get("sender_account", "UNKNOWN"),
            "receiver_account": record.get("receiver_account", "UNKNOWN"),
            "amount": float(record.get("amount", 0.0)),
            "fraud_probability": prob,
            "risk_score_100": int(prob * 100),
            "risk_tier": risk_tier,
            "is_suspicious": bool(prob >= 0.50),
            "model_provenance": "CWGAN-Augmented Deep Tabular Classifier v1.0",
            "statutory_disclaimer": "Heuristic alert for transaction monitoring. Judicial verification required under PMLA / STR guidelines."
        }

    def get_ranked_accounts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Ranks all indexed accounts by GNN mule risk probability descending.
        """
        if self.gnn_model is None or self.graph_data is None:
            return []

        with torch.no_grad():
            out = self.gnn_model(self.graph_data.x, self.graph_data.edge_index, self.graph_data.edge_attr)
            probs = F.softmax(out["account_logits"], dim=-1)[:, 1].cpu().numpy()
            ano = out["anomaly_scores"].cpu().numpy()

        results = []
        for i, (p, a) in enumerate(zip(probs, ano)):
            acc_id = self.idx_to_node.get(i, f"ACC_{i}")
            p_val = float(round(p, 4))
            results.append({
                "account_id": acc_id,
                "mule_probability": p_val,
                "risk_score_100": int(p_val * 100),
                "risk_tier": "CRITICAL" if p_val >= 0.75 else ("HIGH" if p_val >= 0.50 else ("MODERATE" if p_val >= 0.25 else "LOW")),
                "anomaly_score": float(round(a, 4)),
                "is_mule_flagged": bool(p_val >= 0.50)
            })

        results.sort(key=lambda x: x["mule_probability"], reverse=True)
        return results[:limit]

    def set_active_dataset(self, dataset_key: str):
        """
        Switches between the checked-in synthetic benchmark and PaySim data.
        """
        data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
        if dataset_key.lower() == "paysim":
            target_csv = os.path.join(data_dir, "paysim_transactions.csv")
        elif dataset_key.lower() == "benchmark":
            target_csv = os.path.join(data_dir, "benchmark_transactions.csv")
            if not os.path.exists(target_csv):
                target_csv = os.path.join(data_dir, "sample_transactions.csv")
        else:
            raise ValueError("dataset_key must be 'benchmark' or 'paysim'")

        if not os.path.exists(target_csv):
            raise FileNotFoundError(f"Dataset file {target_csv} does not exist.")

        self.data_csv = target_csv
        inspector = DatasetInspector(self.data_csv, self.artifacts_dir)
        inspector.run_inspection()
        self.reload_models()
        return self.get_system_status()

    def get_system_status(self) -> Dict[str, Any]:
        """
        Returns full health and readiness status of GAN & GNN components.
        """
        def file_info(fname):
            p = os.path.join(self.artifacts_dir, fname)
            if os.path.exists(p):
                return {"available": True, "size_bytes": os.path.getsize(p), "last_modified": os.path.getmtime(p)}
            return {"available": False}

        # Check active dataset info
        active_name = os.path.basename(self.data_csv)
        if "paysim" in active_name.lower():
            active_key = "paysim"
        else:
            active_key = "benchmark"

        # Load metrics if available
        gnn_metrics_path = os.path.join(self.artifacts_dir, "gnn_evaluation_metrics.json")
        gnn_metrics = {}
        if os.path.exists(gnn_metrics_path):
            with open(gnn_metrics_path, "r") as f:
                gnn_metrics = json.load(f)

        gan_metrics_path = os.path.join(self.artifacts_dir, "gan_metrics.json")
        gan_metrics = {}
        if os.path.exists(gan_metrics_path):
            with open(gan_metrics_path, "r") as f:
                gan_metrics = json.load(f)

        quality_path = os.path.join(self.artifacts_dir, "synthetic_quality_report.json")
        quality_metrics = {}
        if os.path.exists(quality_path):
            with open(quality_path, "r") as f:
                quality_metrics = json.load(f)

        clf_metrics_path = os.path.join(self.artifacts_dir, "classifier_benchmark_report.json")
        clf_metrics = {}
        if os.path.exists(clf_metrics_path):
            with open(clf_metrics_path, "r") as f:
                clf_metrics = json.load(f)

        return {
            "status": "OPERATIONAL",
            "active_dataset": active_key,
            "active_dataset_filename": active_name,
            "available_datasets": [
                {
                    "key": "paysim",
                    "name": "Kaggle PaySim1 (ealaxi/paysim1)",
                    "provenance": "Kaggle ealaxi/paysim1 (Lopez-Rojas et al.)",
                    "transactions": 10262,
                    "accounts": 17755,
                    "fraud_count": 187,
                    "domain": "Mobile Money (TRANSFER / CASH_OUT)",
                    "description": "Authentic mobile money simulation dataset with real fraud labels and agent accounts."
                },
                {
                    "key": "benchmark",
                    "name": "FinTrace Multi-Typology Synthetic Benchmark",
                    "provenance": "FinTrace Research & Benchmark Generator",
                    "transactions": 1810,
                    "accounts": 217,
                    "fraud_count": 55,
                    "domain": "Indian Banking / UPI Laundering",
                    "description": "Structured multi-hop bank transfer network with smurfing rings, circular loops, and rapid pass-through conduits."
                }
            ],
            "indexed_accounts_in_graph": len(self.node_to_idx),
            "total_transactions_in_memory": len(self.df_txns) if self.df_txns is not None else 0,
            "models_ready": {
                "gnn_graphsage_encoder": bool(self.gnn_model is not None),
                "tabular_gan_generator": os.path.exists(os.path.join(self.artifacts_dir, "generator.pt")),
                "tabular_fraud_classifier": bool(self.classifier_model is not None),
                "preprocessor_scalers": bool(self.preprocessor is not None and self.preprocessor.is_fitted)
            },
            "artifacts_manifest": {
                "graphsage_weights": file_info("graphsage_multitask.pt"),
                "generator_weights": file_info("generator.pt"),
                "critic_weights": file_info("critic.pt"),
                "classifier_augmented": file_info("classifier_augmented.pt"),
                "synthetic_transactions": file_info("synthetic_transactions.csv"),
                "dataset_summary": file_info("dataset_summary.json"),
                "class_distribution_plot": file_info("class_distribution.png"),
                "gan_loss_curves": file_info("gan_loss_curves.png"),
                "gnn_training_curves": file_info("gnn_training_curves.png"),
                "pr_roc_curves": file_info("pr_roc_curves.png")
            },
            "latest_metrics": {
                "gnn": gnn_metrics,
                "gan": gan_metrics,
                "synthetic_quality": quality_metrics,
                "classifier_benchmark": clf_metrics
            }
        }
