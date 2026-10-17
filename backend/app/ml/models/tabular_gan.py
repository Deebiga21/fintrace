"""
FinTrace ML System - Phase 4: Conditional Tabular GAN (CWGAN-GP) Architecture
PyTorch implementation of Conditional Wasserstein GAN with Gradient Penalty for financial transactions.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class TabularGenerator(nn.Module):
    def __init__(
        self,
        noise_dim: int = 64,
        condition_dim: int = 2,
        num_continuous: int = 4,
        cat_cardinalities: list = None,
        hidden_dim: int = 128
    ):
        super().__init__()
        self.noise_dim = noise_dim
        self.condition_dim = condition_dim
        self.num_continuous = num_continuous
        self.cat_cardinalities = cat_cardinalities or [5, 2] # e.g. 5 transaction types, 2 statuses

        in_dim = noise_dim + condition_dim
        
        self.backbone = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(hidden_dim, hidden_dim * 2),
            nn.LayerNorm(hidden_dim * 2),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.LeakyReLU(0.2, inplace=True)
        )

        # Continuous numerical feature output head
        self.continuous_head = nn.Linear(hidden_dim, num_continuous)

        # Discrete categorical feature output heads (softmax)
        self.cat_heads = nn.ModuleList([
            nn.Linear(hidden_dim, card) for card in self.cat_cardinalities
        ])

    def forward(self, noise: torch.Tensor, condition: torch.Tensor, tau: float = 0.8) -> torch.Tensor:
        """
        noise: [batch_size, noise_dim]
        condition: [batch_size, condition_dim] (one-hot or class probability)
        Returns: [batch_size, total_features]
        """
        inp = torch.cat([noise, condition], dim=-1)
        h = self.backbone(inp)

        # Continuous values (already normalized by StandardScaler, standard linear output)
        cont_out = self.continuous_head(h)

        # Categorical values (Gumbel Softmax during training, straight softmax during inference)
        cat_outs = []
        for head in self.cat_heads:
            logits = head(h)
            if self.training:
                probs = F.gumbel_softmax(logits, tau=tau, hard=False)
            else:
                probs = F.softmax(logits, dim=-1)
            cat_outs.append(probs)

        out = torch.cat([cont_out] + cat_outs, dim=-1)
        return out


class TabularCritic(nn.Module):
    """
    Wasserstein Discriminator / Critic with Gradient Penalty support.
    """
    def __init__(
        self,
        feature_dim: int,
        condition_dim: int = 2,
        hidden_dim: int = 128
    ):
        super().__init__()
        in_dim = feature_dim + condition_dim
        
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Dropout(0.15),
            nn.Linear(hidden_dim, hidden_dim * 2),
            nn.LayerNorm(hidden_dim * 2),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Dropout(0.15),
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Linear(hidden_dim, 1)  # Scalar critic score (Wasserstein distance)
        )

    def forward(self, features: torch.Tensor, condition: torch.Tensor) -> torch.Tensor:
        inp = torch.cat([features, condition], dim=-1)
        return self.net(inp)


def compute_gradient_penalty(
    critic: TabularCritic,
    real_samples: torch.Tensor,
    fake_samples: torch.Tensor,
    conditions: torch.Tensor,
    device: torch.device
) -> torch.Tensor:
    """
    Calculates gradient penalty for WGAN-GP: E[(||grad(critic(x_hat))||_2 - 1)^2]
    """
    batch_size = real_samples.size(0)
    alpha = torch.rand(batch_size, 1, device=device)
    alpha = alpha.expand_as(real_samples)

    interpolates = (alpha * real_samples + ((1 - alpha) * fake_samples)).requires_grad_(True)
    critic_interpolates = critic(interpolates, conditions)

    grad_outputs = torch.ones_like(critic_interpolates, device=device, requires_grad=False)
    gradients = torch.autograd.grad(
        outputs=critic_interpolates,
        inputs=interpolates,
        grad_outputs=grad_outputs,
        create_graph=True,
        retain_graph=True,
        only_inputs=True
    )[0]

    gradients = gradients.view(batch_size, -1)
    gradient_norm = gradients.norm(2, dim=1)
    gradient_penalty = ((gradient_norm - 1.0) ** 2).mean()
    return gradient_penalty
