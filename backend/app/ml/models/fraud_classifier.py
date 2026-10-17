"""
FinTrace ML System - Phase 7: Supervised Fraud Classifier Architecture
Deep Tabular Neural Network with residual connections and calibrated sigmoid probability output.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class TabularFraudClassifier(nn.Module):
    def __init__(self, in_features: int, hidden_dim: int = 64, dropout: float = 0.2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(inplace=True),
            nn.Linear(32, 1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Returns raw logits.
        """
        return self.net(x).squeeze(-1)

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """
        Returns calibrated sigmoid fraud probabilities in range [0.0, 1.0].
        """
        logits = self.forward(x)
        return torch.sigmoid(logits)
