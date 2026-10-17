"""
FinTrace ML System - Phase 4, 5, 6, 7 (GNN): Multi-Task GraphSAGE Architecture
Shared neighborhood-aggregating GraphSAGE encoder with dedicated heads:
- Head A: Account-level supervised mule classifier
- Head B: Transaction-level edge classifier (sender + receiver + interaction embeddings)
- Head C: Unsupervised account anomaly reconstruction autoencoder
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Dict, Any, Optional

try:
    from torch_geometric.nn import SAGEConv
    PYG_AVAILABLE = True
except Exception:
    PYG_AVAILABLE = False
    class SAGEConv(nn.Module):
        def __init__(self, in_channels: int, out_channels: int, aggr: str = 'mean'):
            super().__init__()
            self.lin_self = nn.Linear(in_channels, out_channels, bias=False)
            self.lin_neigh = nn.Linear(in_channels, out_channels, bias=True)

        def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
            num_nodes = x.size(0)
            src, dst = edge_index[0], edge_index[1]
            neigh_sum = torch.zeros((num_nodes, x.size(1)), dtype=torch.float32, device=x.device)
            neigh_count = torch.zeros((num_nodes, 1), dtype=torch.float32, device=x.device)
            neigh_sum.index_add_(0, dst, x[src])
            ones = torch.ones((src.size(0), 1), dtype=torch.float32, device=x.device)
            neigh_count.index_add_(0, dst, ones)
            neigh_mean = neigh_sum / torch.clamp(neigh_count, min=1.0)
            return self.lin_self(x) + self.lin_neigh(neigh_mean)


class SharedGraphSAGEEncoder(nn.Module):
    def __init__(
        self,
        in_channels: int = 10,
        hidden_dim: int = 32,
        embedding_dim: int = 16,
        dropout: float = 0.2
    ):
        super().__init__()
        self.conv1 = SAGEConv(in_channels, hidden_dim, aggr='mean')
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.conv2 = SAGEConv(hidden_dim, embedding_dim, aggr='mean')
        self.bn2 = nn.BatchNorm1d(embedding_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        # Layer 1
        h = self.conv1(x, edge_index)
        h = self.bn1(h)
        h = F.relu(h)
        h = self.dropout(h)
        # Layer 2 (latent account embeddings)
        z = self.conv2(h, edge_index)
        z = self.bn2(z)
        z = F.relu(z)
        return z


class AccountMuleHead(nn.Module):
    """
    Task A: Supervised Account-Level Mule Classification.
    """
    def __init__(self, embedding_dim: int = 16, num_classes: int = 2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embedding_dim, 32),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(32, num_classes)
        )

    def forward(self, embeddings: torch.Tensor) -> torch.Tensor:
        return self.net(embeddings)


class TransactionSuspiciousHead(nn.Module):
    """
    Task B: Supervised Transaction-Level Suspicious Edge Classification.
    Combines Sender Embedding, Receiver Embedding, Difference, Elementwise Product, and Edge Attributes.
    """
    def __init__(self, embedding_dim: int = 16, edge_attr_dim: int = 1):
        super().__init__()
        # In dim: sender(16) + receiver(16) + abs_diff(16) + mult(16) + edge_attr(1) = 65
        in_dim = (embedding_dim * 4) + edge_attr_dim
        self.net = nn.Sequential(
            nn.Linear(in_dim, 32),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(32, 1)
        )

    def forward(
        self,
        embeddings: torch.Tensor,
        edge_index: torch.Tensor,
        edge_attr: torch.Tensor
    ) -> torch.Tensor:
        src, dst = edge_index[0], edge_index[1]
        z_src = embeddings[src]
        z_dst = embeddings[dst]
        diff = torch.abs(z_src - z_dst)
        prod = z_src * z_dst

        edge_repr = torch.cat([z_src, z_dst, diff, prod, edge_attr], dim=-1)
        return self.net(edge_repr).squeeze(-1)


class AccountAnomalyAutoencoder(nn.Module):
    """
    Task C: Unsupervised Account Anomaly Detection.
    Reconstructs GNN account embeddings; high reconstruction error indicates topological anomaly.
    """
    def __init__(self, embedding_dim: int = 16, bottleneck_dim: int = 8):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(embedding_dim, 12),
            nn.ReLU(inplace=True),
            nn.Linear(12, bottleneck_dim)
        )
        self.decoder = nn.Sequential(
            nn.Linear(bottleneck_dim, 12),
            nn.ReLU(inplace=True),
            nn.Linear(12, embedding_dim)
        )

    def forward(self, embeddings: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        code = self.encoder(embeddings)
        recon = self.decoder(code)
        # Reconstruction error per node (anomaly score)
        anomaly_scores = torch.mean((embeddings - recon) ** 2, dim=-1)
        return recon, anomaly_scores


class MultiTaskGNN(nn.Module):
    """
    Unified Multi-Task GNN integrating Shared Encoder with Account, Transaction, and Anomaly heads.
    """
    def __init__(
        self,
        node_features_dim: int = 10,
        edge_features_dim: int = 1,
        hidden_dim: int = 32,
        embedding_dim: int = 16
    ):
        super().__init__()
        self.encoder = SharedGraphSAGEEncoder(node_features_dim, hidden_dim, embedding_dim)
        self.account_head = AccountMuleHead(embedding_dim)
        self.transaction_head = TransactionSuspiciousHead(embedding_dim, edge_features_dim)
        self.anomaly_head = AccountAnomalyAutoencoder(embedding_dim)

    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor,
        edge_attr: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        # 1. Compute shared account embeddings
        embeddings = self.encoder(x, edge_index)

        # 2. Account-level mule logits
        account_logits = self.account_head(embeddings)

        # 3. Transaction-level logits
        transaction_logits = self.transaction_head(embeddings, edge_index, edge_attr)

        # 4. Anomaly reconstruction and scores
        recon_embeddings, anomaly_scores = self.anomaly_head(embeddings)

        return {
            "embeddings": embeddings,
            "account_logits": account_logits,
            "transaction_logits": transaction_logits,
            "recon_embeddings": recon_embeddings,
            "anomaly_scores": anomaly_scores
        }
