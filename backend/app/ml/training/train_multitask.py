"""
FinTrace ML System - Phase 11 & 12: Multi-Task GNN Training & Evaluation
Jointly trains the shared GraphSAGE encoder across Account Mule Classification,
Transaction Classification, and Unsupervised Anomaly Detection with early stopping.
"""

import os
import json
import logging
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import numpy as np
import pandas as pd
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix
)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from ..models.graphsage_multitask import MultiTaskGNN
from ..data.build_graph import TransactionGraphBuilder

logger = logging.getLogger("FinTrace.ML.TrainMultiTask")

class MultiTaskGNNTrainer:
    def __init__(
        self,
        artifacts_dir: str = None,
        device: str = "cpu",
        weight_account: float = 1.0,
        weight_transaction: float = 0.8,
        weight_anomaly: float = 0.2
    ):
        if artifacts_dir is None:
            self.artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
        else:
            self.artifacts_dir = artifacts_dir
        os.makedirs(self.artifacts_dir, exist_ok=True)

        self.device = torch.device(device)
        self.w_acc = weight_account
        self.w_txn = weight_transaction
        self.w_ano = weight_anomaly

    def train(
        self,
        csv_path: str,
        epochs: int = 70,
        lr: float = 0.008,
        seed: int = 42
    ) -> dict:
        torch.manual_seed(seed)
        np.random.seed(seed)

        # 1. Build Graph
        builder = TransactionGraphBuilder(self.artifacts_dir)
        df = pd.read_csv(csv_path)
        data, meta = builder.build_from_dataframe(df)

        num_nodes = data.num_nodes
        num_edges = data.edge_index.size(1)

        # 2. Node train/val/test masks (70/15/15)
        indices = np.arange(num_nodes)
        np.random.shuffle(indices)
        n_train = int(num_nodes * 0.70)
        n_val = int(num_nodes * 0.15)

        train_mask = torch.zeros(num_nodes, dtype=torch.bool)
        val_mask = torch.zeros(num_nodes, dtype=torch.bool)
        test_mask = torch.zeros(num_nodes, dtype=torch.bool)

        train_mask[indices[:n_train]] = True
        val_mask[indices[n_train:n_train + n_val]] = True
        test_mask[indices[n_train + n_val:]] = True

        # 3. Model setup
        model = MultiTaskGNN(
            node_features_dim=data.x.size(1),
            edge_features_dim=data.edge_attr.size(1),
            hidden_dim=32,
            embedding_dim=16
        ).to(self.device)

        # Account class weighting (mule accounts are minority)
        pos_accounts = float((data.y == 1).sum())
        neg_accounts = float((data.y == 0).sum())
        acc_weights = torch.tensor([1.0, max(1.0, neg_accounts / max(1.0, pos_accounts))], device=self.device)
        criterion_account = nn.CrossEntropyLoss(weight=acc_weights)

        # Transaction class weighting
        pos_txns = float((data.edge_y == 1).sum())
        neg_txns = float(num_edges - pos_txns)
        txn_weight = torch.tensor([max(1.0, neg_txns / max(1.0, pos_txns))], device=self.device)
        criterion_txn = nn.BCEWithLogitsLoss(pos_weight=txn_weight)

        criterion_recon = nn.MSELoss()

        optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)

        # Send data tensors to device
        x = data.x.to(self.device)
        edge_index = data.edge_index.to(self.device)
        edge_attr = data.edge_attr.to(self.device)
        y = data.y.to(self.device)
        edge_y = data.edge_y.to(self.device).float()

        history = {
            "epoch": [],
            "total_loss": [],
            "account_loss": [],
            "transaction_loss": [],
            "anomaly_loss": [],
            "val_account_f1": []
        }

        best_val_f1 = -1.0
        best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        logger.info(f"Training Multi-Task GraphSAGE on {num_nodes} accounts & {num_edges} transfers...")

        # 4. Training Loop
        for epoch in range(1, epochs + 1):
            model.train()
            optimizer.zero_grad()

            out = model(x, edge_index, edge_attr)

            # Account Loss (on train mask)
            loss_acc = criterion_account(out["account_logits"][train_mask], y[train_mask])

            # Transaction Loss (on all edges)
            loss_txn = criterion_txn(out["transaction_logits"], edge_y)

            # Anomaly Reconstruction Loss
            loss_ano = criterion_recon(out["recon_embeddings"], out["embeddings"].detach())

            total_loss = (self.w_acc * loss_acc) + (self.w_txn * loss_txn) + (self.w_ano * loss_ano)
            total_loss.backward()
            optimizer.step()

            # Validation check
            model.eval()
            with torch.no_grad():
                val_out = model(x, edge_index, edge_attr)
                val_probs = F.softmax(val_out["account_logits"][val_mask], dim=-1)[:, 1].cpu().numpy()
                val_preds = (val_probs >= 0.5).astype(int)
                val_f1 = f1_score(y[val_mask].cpu().numpy(), val_preds, zero_division=0)

                if val_f1 > best_val_f1:
                    best_val_f1 = val_f1
                    best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

            history["epoch"].append(epoch)
            history["total_loss"].append(round(total_loss.item(), 4))
            history["account_loss"].append(round(loss_acc.item(), 4))
            history["transaction_loss"].append(round(loss_txn.item(), 4))
            history["anomaly_loss"].append(round(loss_ano.item(), 4))
            history["val_account_f1"].append(round(float(val_f1), 4))

        if best_state:
            model.load_state_dict(best_state)

        # 5. Evaluate on HELD-OUT TEST MASK
        model.eval()
        with torch.no_grad():
            final_out = model(x, edge_index, edge_attr)

            # Task A Test Metrics (Account Level)
            test_acc_probs = F.softmax(final_out["account_logits"][test_mask], dim=-1)[:, 1].cpu().numpy()
            test_acc_preds = (test_acc_probs >= 0.5).astype(int)
            test_acc_true = y[test_mask].cpu().numpy()

            acc_prec = float(round(precision_score(test_acc_true, test_acc_preds, zero_division=0), 4))
            acc_rec = float(round(recall_score(test_acc_true, test_acc_preds, zero_division=0), 4))
            acc_f1 = float(round(f1_score(test_acc_true, test_acc_preds, zero_division=0), 4))
            try:
                acc_roc = float(round(roc_auc_score(test_acc_true, test_acc_probs), 4))
            except Exception:
                acc_roc = 0.5
            cm_acc = confusion_matrix(test_acc_true, test_acc_preds).tolist()

            # Task B Test Metrics (Transaction Level)
            txn_probs = torch.sigmoid(final_out["transaction_logits"]).cpu().numpy()
            txn_preds = (txn_probs >= 0.5).astype(int)
            txn_true = edge_y.cpu().numpy()
            txn_prec = float(round(precision_score(txn_true, txn_preds, zero_division=0), 4))
            txn_rec = float(round(recall_score(txn_true, txn_preds, zero_division=0), 4))
            txn_f1 = float(round(f1_score(txn_true, txn_preds, zero_division=0), 4))
            try:
                txn_pr_auc = float(round(average_precision_score(txn_true, txn_probs), 4))
            except Exception:
                txn_pr_auc = 0.0

            # Task C Anomaly Ranking
            ano_scores = final_out["anomaly_scores"].cpu().numpy()
            mule_indices = np.where(y.cpu().numpy() == 1)[0]
            norm_indices = np.where(y.cpu().numpy() == 0)[0]
            avg_mule_anomaly = float(round(np.mean(ano_scores[mule_indices]), 4)) if len(mule_indices) > 0 else 0.0
            avg_norm_anomaly = float(round(np.mean(ano_scores[norm_indices]), 4)) if len(norm_indices) > 0 else 0.0

        # 6. Save Model Checkpoint
        weights_path = os.path.join(self.artifacts_dir, "graphsage_multitask.pt")
        torch.save(model.state_dict(), weights_path)

        # Save Metrics Report
        evaluation_report = {
            "model_architecture": "Shared 2-Layer GraphSAGE (PyG SAGEConv Mean Aggregator)",
            "encoder_embedding_dimension": 16,
            "trained_epochs": epochs,
            "training_loss": history["total_loss"][-1],
            "task_a_account_mule_classification": {
                "test_precision": acc_prec,
                "test_recall": acc_rec,
                "test_f1_score": acc_f1,
                "test_roc_auc": acc_roc,
                "test_confusion_matrix": cm_acc,
                "operating_threshold": 0.5
            },
            "task_b_transaction_suspicious_classification": {
                "precision": txn_prec,
                "recall": txn_rec,
                "f1_score": txn_f1,
                "pr_auc": txn_pr_auc
            },
            "task_c_unsupervised_anomaly_detection": {
                "method": "GNN Latent Embedding Bottleneck Reconstruction (MSE)",
                "mean_anomaly_score_mules": avg_mule_anomaly,
                "mean_anomaly_score_normal": avg_norm_anomaly,
                "anomaly_divergence_ratio": round(avg_mule_anomaly / max(1e-6, avg_norm_anomaly), 2)
            }
        }

        report_path = os.path.join(self.artifacts_dir, "gnn_evaluation_metrics.json")
        with open(report_path, "w") as f:
            json.dump(evaluation_report, f, indent=2)

        history_path = os.path.join(self.artifacts_dir, "gnn_training_history.json")
        with open(history_path, "w") as f:
            json.dump(history, f, indent=2)

        # Plot curves
        self._plot_curves(history)

        logger.info(f"Multi-Task GNN training finished. F1: {acc_f1} -> {report_path}")
        return evaluation_report

    def _plot_curves(self, history: dict):
        try:
            fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))

            epochs = history["epoch"]
            axes[0].plot(epochs, history["total_loss"], label="Total Joint Loss", color="#F43F5E", linewidth=2.0)
            axes[0].plot(epochs, history["account_loss"], label="Task A: Account Loss", color="#0284C7", linestyle="--")
            axes[0].plot(epochs, history["transaction_loss"], label="Task B: Txn Loss", color="#10B981", linestyle=":")
            axes[0].set_title("Multi-Task GNN Loss Convergence", fontsize=11, fontweight="bold")
            axes[0].set_xlabel("Epochs", fontsize=9)
            axes[0].set_ylabel("Loss", fontsize=9)
            axes[0].grid(True, linestyle="--", alpha=0.3)
            axes[0].legend(frameon=True)

            axes[1].plot(epochs, history["val_account_f1"], label="Validation Account F1", color="#8B5CF6", linewidth=2.0)
            axes[1].set_title("Validation Mule Detection F1-Score", fontsize=11, fontweight="bold")
            axes[1].set_xlabel("Epochs", fontsize=9)
            axes[1].set_ylabel("F1 Score", fontsize=9)
            axes[1].set_ylim(0.0, 1.05)
            axes[1].grid(True, linestyle="--", alpha=0.3)
            axes[1].legend(frameon=True)

            plt.tight_layout()
            plot_path = os.path.join(self.artifacts_dir, "gnn_training_curves.png")
            plt.savefig(plot_path, dpi=180)
            plt.close()
        except Exception as e:
            logger.warning(f"Could not render gnn_training_curves.png: {e}")

if __name__ == "__main__":
    csv_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "benchmark_transactions.csv"))
    trainer = MultiTaskGNNTrainer()
    report = trainer.train(csv_file, epochs=50)
    print("Multi-Task GNN Evaluation Report:")
    print(json.dumps(report, indent=2))
