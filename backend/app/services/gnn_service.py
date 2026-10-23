import os
import sys
import warnings

os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["TRITON_DISABLE_LINE_INFO"] = "1"
warnings.filterwarnings("ignore", category=UserWarning)

import json
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix, accuracy_score

from ..models.account import Account
from ..models.transaction import Transaction
from ..models.model_run import ModelRun
from ..config import settings
from .graph_service import GraphService

# Try importing torch_geometric; provide robust native fallback if ever needed
try:
    from torch_geometric.nn import SAGEConv
    from torch_geometric.data import Data
    PYG_AVAILABLE = True
except Exception:
    PYG_AVAILABLE = False


class NativeSAGEConv(nn.Module):
    """
    Pure PyTorch fallback implementation of GraphSAGE Mean Aggregator:
    h_v = W1 * x_v + W2 * (1/|N(v)| * sum_{u in N(v)} x_u)
    """
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.lin_self = nn.Linear(in_channels, out_channels, bias=False)
        self.lin_neigh = nn.Linear(in_channels, out_channels, bias=True)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        num_nodes = x.size(0)
        # edge_index is [2, E] (source, target)
        src, dst = edge_index[0], edge_index[1]
        
        # Aggregate neighbor features via scatter mean
        neigh_sum = torch.zeros_like(x)
        neigh_count = torch.zeros((num_nodes, 1), dtype=torch.float32, device=x.device)
        
        neigh_sum.index_add_(0, dst, x[src])
        ones = torch.ones((src.size(0), 1), dtype=torch.float32, device=x.device)
        neigh_count.index_add_(0, dst, ones)
        
        neigh_mean = neigh_sum / torch.clamp(neigh_count, min=1.0)
        
        out = self.lin_self(x) + self.lin_neigh(neigh_mean)
        return out


class FinancialGraphSAGE(nn.Module):
    """
    Two-layer GraphSAGE architecture tailored for financial transaction graphs.
    """
    def __init__(self, in_features: int = 8, hidden_dim: int = 32, embedding_dim: int = 16, num_classes: int = 2):
        super().__init__()
        if PYG_AVAILABLE:
            self.conv1 = SAGEConv(in_features, hidden_dim, aggr='mean')
            self.conv2 = SAGEConv(hidden_dim, embedding_dim, aggr='mean')
        else:
            self.conv1 = NativeSAGEConv(in_features, hidden_dim)
            self.conv2 = NativeSAGEConv(hidden_dim, embedding_dim)

        self.dropout = nn.Dropout(p=0.2)
        self.classifier = nn.Linear(embedding_dim, num_classes)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # Layer 1
        h = self.conv1(x, edge_index)
        h = F.relu(h)
        h = self.dropout(h)
        
        # Layer 2 (latent node embeddings)
        embeddings = self.conv2(h, edge_index)
        embeddings_relu = F.relu(embeddings)
        
        # Final classification logits
        logits = self.classifier(embeddings_relu)
        return logits, embeddings


class GNNService:
    WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "graphsage_mule_model.pt")

    @staticmethod
    def extract_graph_tensors(db: Session) -> Tuple[torch.Tensor, torch.Tensor, List[str], Dict[str, int]]:
        """
        Extracts node feature tensor X and directed edge_index from database.
        Returns:
            X: [N, 8] Tensor
            edge_index: [2, E] LongTensor
            account_ids: list of account IDs corresponding to node indices
            node_to_idx: map of account_id -> index
        """
        accounts = db.query(Account).order_by(Account.account_id).all()
        if not accounts:
            return torch.empty((0, 8)), torch.empty((2, 0), dtype=torch.long), [], {}

        account_ids = [a.account_id for a in accounts]
        node_to_idx = {aid: i for i, aid in enumerate(account_ids)}

        # Structural network metrics
        metrics = GraphService.compute_graph_metrics(db)

        # Build feature matrix X:
        # 0: log1p(in_degree)
        # 1: log1p(out_degree)
        # 2: log1p(total_incoming)
        # 3: log1p(total_outgoing)
        # 4: turnover_ratio (bounded [0, 5])
        # 5: log1p(unique_counterparties)
        # 6: PageRank * 100
        # 7: Betweenness Centrality * 100
        feature_rows = []
        for acc in accounts:
            m = metrics.get(acc.account_id, {})
            row = [
                np.log1p(float(acc.in_degree or 0)),
                np.log1p(float(acc.out_degree or 0)),
                np.log1p(float(acc.total_incoming or 0.0)),
                np.log1p(float(acc.total_outgoing or 0.0)),
                float(min(acc.turnover_ratio or 0.0, 5.0)),
                np.log1p(float(acc.unique_counterparties or 0)),
                float(m.get("pagerank", 0.0) * 100.0),
                float(m.get("betweenness", 0.0) * 100.0),
            ]
            feature_rows.append(row)

        X = torch.tensor(feature_rows, dtype=torch.float32)

        # Build edge_index from completed transactions
        txns = db.query(Transaction).filter(Transaction.status == "COMPLETED").all()
        src_list = []
        dst_list = []
        for t in txns:
            if t.sender_account in node_to_idx and t.receiver_account in node_to_idx:
                src_list.append(node_to_idx[t.sender_account])
                dst_list.append(node_to_idx[t.receiver_account])

        if src_list:
            edge_index = torch.tensor([src_list, dst_list], dtype=torch.long)
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long)

        return X, edge_index, account_ids, node_to_idx

    @staticmethod
    def train_model(db: Session, epochs: int = 100, lr: float = 0.01) -> Dict[str, Any]:
        """
        Trains GraphSAGE on accounts with labels. Evaluates real Precision, Recall, F1, Accuracy, and Confusion Matrix.
        """
        X, edge_index, account_ids, node_to_idx = GNNService.extract_graph_tensors(db)
        if len(account_ids) < 4:
            raise ValueError("Insufficient accounts to train GraphSAGE (at least 4 required).")

        accounts = db.query(Account).order_by(Account.account_id).all()
        labeled = [
            (i, 1 if account.is_ground_truth_mule else 0)
            for i, account in enumerate(accounts)
            if account.is_ground_truth_mule is not None
        ]
        if len(labeled) < 4 or len({label for _, label in labeled}) < 2:
            raise ValueError(
                "GraphSAGE training requires at least four accounts with explicit account-level labels, including both classes. "
                "Account names, heuristic flags, and existing risk scores are not treated as ground truth."
            )

        mask_indices = np.array([i for i, _ in labeled])
        labels = np.zeros(len(accounts), dtype=np.int64)
        for i, label in labeled:
            labels[i] = label
        y = torch.tensor(labels, dtype=torch.long)
        
        # Train / Validation split (70% train, 30% val)
        np.random.seed(42)
        indices = mask_indices.copy()
        np.random.shuffle(indices)
        split = int(0.7 * len(indices))
        train_idx = indices[:split]
        val_idx = indices[split:] if split < len(indices) else indices

        model = FinancialGraphSAGE(in_features=8, hidden_dim=32, embedding_dim=16, num_classes=2)
        optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
        criterion = nn.CrossEntropyLoss()

        model.train()
        final_loss = 0.0
        for epoch in range(epochs):
            optimizer.zero_grad()
            logits, _ = model(X, edge_index)
            loss = criterion(logits[train_idx], y[train_idx])
            loss.backward()
            optimizer.step()
            final_loss = float(loss.item())

        # Evaluate on validation split
        model.eval()
        with torch.no_grad():
            logits, embeddings = model(X, edge_index)
            preds = torch.argmax(logits, dim=1).numpy()
            probs = F.softmax(logits, dim=1)[:, 1].numpy()

        y_true = y[val_idx].numpy()
        y_pred = preds[val_idx]

        acc = float(accuracy_score(y_true, y_pred)) if len(val_idx) > 0 else 1.0
        prec = float(precision_score(y_true, y_pred, zero_division=0)) if len(val_idx) > 0 else 1.0
        rec = float(recall_score(y_true, y_pred, zero_division=0)) if len(val_idx) > 0 else 1.0
        f1 = float(f1_score(y_true, y_pred, zero_division=0)) if len(val_idx) > 0 else 1.0
        
        if len(val_idx) > 0:
            cm = confusion_matrix(y_true, y_pred).tolist()
            if len(cm) == 1:
                cm = [[cm[0][0], 0], [0, 0]]
        else:
            cm = [[len(indices), 0], [0, 0]]

        # Save model weights
        os.makedirs(os.path.dirname(GNNService.WEIGHTS_PATH), exist_ok=True)
        torch.save(model.state_dict(), GNNService.WEIGHTS_PATH)

        # Check if true ground truth was available
        has_true_gt = any(acc.is_ground_truth_mule is not None for acc in accounts)

        # Record in ModelRun
        run = ModelRun(
            model_name="GraphSAGE (PyG SAGEConv)" if PYG_AVAILABLE else "GraphSAGE (Native PyTorch)",
            architecture="2-layer GraphSAGE (Mean Aggregator) + 16D Embeddings",
            num_nodes=len(account_ids),
            num_edges=edge_index.size(1),
            epochs=epochs,
            train_loss=round(final_loss, 4),
            accuracy=round(acc, 4),
            precision=round(prec, 4),
            recall=round(rec, 4),
            f1_score=round(f1, 4),
            confusion_matrix_json=json.dumps(cm),
            is_trained_on_ground_truth=has_true_gt,
            notes="Trained with genuine cross-entropy loss and message passing over account transaction graph."
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        # Run inference right after training to update scores
        GNNService.run_inference(db)

        return {
            "status": "success",
            "model_name": run.model_name,
            "run_id": run.run_id,
            "num_nodes": run.num_nodes,
            "num_edges": run.num_edges,
            "epochs": epochs,
            "final_loss": round(final_loss, 4),
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": cm,
            "is_trained_on_ground_truth": has_true_gt,
            "notes": run.notes
        }

    @staticmethod
    def run_inference(db: Session) -> Dict[str, Any]:
        """
        Runs GraphSAGE inference across all accounts, predicts risk scores, classifies
        into Low, Medium, and High risk using configurable thresholds, and saves embeddings.
        """
        import time
        start_t = time.time()

        # Do not turn random initial weights into operational account scores.
        if not os.path.isfile(GNNService.WEIGHTS_PATH):
            return {
                "total_accounts_scored": 0,
                "high_risk_count": 0,
                "medium_risk_count": 0,
                "low_risk_count": 0,
                "execution_time_ms": round((time.time() - start_t) * 1000.0, 2),
                "is_trained_model": False,
                "status": "model_unavailable",
                "message": "Train or load a compatible GraphSAGE checkpoint before scoring accounts."
            }

        X, edge_index, account_ids, node_to_idx = GNNService.extract_graph_tensors(db)
        if len(account_ids) == 0:
            return {
                "total_accounts_scored": 0,
                "high_risk_count": 0,
                "medium_risk_count": 0,
                "low_risk_count": 0,
                "execution_time_ms": 0.0,
                "is_trained_model": False,
                "status": "empty_graph"
            }

        model = FinancialGraphSAGE(in_features=8, hidden_dim=32, embedding_dim=16, num_classes=2)
        try:
            model.load_state_dict(torch.load(
                GNNService.WEIGHTS_PATH,
                map_location=torch.device('cpu'),
                weights_only=True
            ))
        except Exception as exc:
            return {
                "total_accounts_scored": 0,
                "high_risk_count": 0,
                "medium_risk_count": 0,
                "low_risk_count": 0,
                "execution_time_ms": round((time.time() - start_t) * 1000.0, 2),
                "is_trained_model": False,
                "status": "checkpoint_incompatible",
                "message": f"GraphSAGE checkpoint could not be loaded: {exc}"
            }

        model.eval()
        with torch.no_grad():
            logits, embeddings = model(X, edge_index)
            probs = F.softmax(logits, dim=1)[:, 1].numpy()

        accounts = db.query(Account).order_by(Account.account_id).all()
        high_count = 0
        med_count = 0
        low_count = 0

        for i, acc in enumerate(accounts):
            raw_score = float(probs[i])
            
            score = round(raw_score, 4)
            acc.risk_score = score
            acc.prediction_confidence = round(float(abs(score - 0.5) * 2.0), 3)

            # Categorize by thresholds
            if score >= settings.HIGH_RISK_THRESHOLD:
                acc.risk_level = "High"
                high_count += 1
            elif score >= settings.MEDIUM_RISK_THRESHOLD:
                acc.risk_level = "Medium"
                med_count += 1
            else:
                acc.risk_level = "Low"
                low_count += 1

            # Save latent embedding (first 4 dimensions for compactness)
            emb_vector = [round(float(x), 4) for x in embeddings[i].numpy()[:8]]
            acc.embedding_json = json.dumps(emb_vector)

        db.commit()
        exec_ms = round((time.time() - start_t) * 1000.0, 2)

        return {
            "total_accounts_scored": len(accounts),
            "high_risk_count": high_count,
            "medium_risk_count": med_count,
            "low_risk_count": low_count,
            "execution_time_ms": exec_ms,
            "is_trained_model": True,
            "status": "completed"
        }

    @staticmethod
    def get_risk_explanation(db: Session, account_id: str) -> Optional[Dict[str, Any]]:
        """
        Produces detailed explainability report for a flagged account:
        - GNN risk score & category
        - Structural features (degree, turnover, PageRank)
        - Connected high-risk neighbor accounts
        - Supporting transactions
        - Detected graph patterns
        - Plain-language investigation summary
        """
        acc = db.query(Account).filter(Account.account_id == account_id).first()
        if not acc:
            return None

        # Connected accounts
        in_txns = db.query(Transaction).filter(Transaction.receiver_account == account_id).all()
        out_txns = db.query(Transaction).filter(Transaction.sender_account == account_id).all()

        counterparty_ids = set([t.sender_account for t in in_txns] + [t.receiver_account for t in out_txns])
        high_risk_neighbors = db.query(Account).filter(
            Account.account_id.in_(counterparty_ids),
            Account.risk_level == "High"
        ).all()

        flags = json.loads(acc.flags_json) if acc.flags_json else []
        is_trained = os.path.exists(GNNService.WEIGHTS_PATH)

        return {
            "account_id": acc.account_id,
            "customer_name": acc.customer_name or acc.account_id,
            "risk_score": acc.risk_score,
            "risk_level": acc.risk_level,
            "prediction_confidence": acc.prediction_confidence,
            "is_simulated": not is_trained,
            "structural_features": {
                "in_degree": acc.in_degree,
                "out_degree": acc.out_degree,
                "total_incoming": acc.total_incoming,
                "total_outgoing": acc.total_outgoing,
                "turnover_ratio": acc.turnover_ratio,
                "unique_counterparties": acc.unique_counterparties
            },
            "detected_patterns": flags,
            "connected_high_risk_accounts": [n.account_id for n in high_risk_neighbors],
            "supporting_transactions_count": len(in_txns) + len(out_txns),
            "graph_context": {
                "total_counterparties": len(counterparty_ids),
                "high_risk_neighbors_count": len(high_risk_neighbors),
                "inflow_volume": acc.total_incoming,
                "outflow_volume": acc.total_outgoing
            }
        }
