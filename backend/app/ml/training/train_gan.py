"""
FinTrace ML System - Phase 4: Tabular GAN Training Pipeline
Trains the Conditional Wasserstein GAN with Gradient Penalty on financial transactions.
"""

import os
import json
import logging
import torch
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from ..models.tabular_gan import TabularGenerator, TabularCritic, compute_gradient_penalty
from ..data.preprocess import TransactionPreprocessor

logger = logging.getLogger("FinTrace.ML.TrainGAN")

class GANTrainer:
    def __init__(
        self,
        artifacts_dir: str = None,
        device: str = "cpu",
        noise_dim: int = 64,
        hidden_dim: int = 128,
        lr: float = 0.0002,
        b1: float = 0.5,
        b2: float = 0.9,
        lambda_gp: float = 10.0,
        n_critic: int = 3
    ):
        if artifacts_dir is None:
            self.artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
        else:
            self.artifacts_dir = artifacts_dir
        os.makedirs(self.artifacts_dir, exist_ok=True)

        self.device = torch.device(device)
        self.noise_dim = noise_dim
        self.hidden_dim = hidden_dim
        self.lr = lr
        self.b1 = b1
        self.b2 = b2
        self.lambda_gp = lambda_gp
        self.n_critic = n_critic

    def train(
        self,
        csv_path: str,
        epochs: int = 80,
        batch_size: int = 64,
        seed: int = 42
    ) -> dict:
        torch.manual_seed(seed)
        np.random.seed(seed)

        # 1. Preprocess & split data
        preprocessor = TransactionPreprocessor(self.artifacts_dir)
        df = pd.read_csv(csv_path)
        train_df, val_df, test_df, meta = preprocessor.fit_transform_split(df)

        X_train = np.stack(train_df['features'].values)
        
        # Binary condition labels: [legitimate, fraud]
        if 'is_ground_truth_mule' in train_df.columns:
            labels = train_df['is_ground_truth_mule'].values.astype(int)
        elif 'is_fraud' in train_df.columns:
            labels = train_df['is_fraud'].values.astype(int)
        elif 'is_suspicious' in train_df.columns:
            labels = train_df['is_suspicious'].values.astype(int)
        else:
            labels = np.zeros(len(train_df), dtype=int)
        conditions = np.zeros((len(labels), 2), dtype=np.float32)
        conditions[np.arange(len(labels)), labels] = 1.0

        dataset = TensorDataset(
            torch.tensor(X_train, dtype=torch.float32),
            torch.tensor(conditions, dtype=torch.float32)
        )
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, drop_last=(len(dataset) > batch_size))

        total_features = X_train.shape[1]
        num_continuous = len(preprocessor.num_cols)
        cat_cardinalities = [len(cats) for cats in preprocessor.encoder.categories_]

        # 2. Instantiate Generator and Critic
        generator = TabularGenerator(
            noise_dim=self.noise_dim,
            condition_dim=2,
            num_continuous=num_continuous,
            cat_cardinalities=cat_cardinalities,
            hidden_dim=self.hidden_dim
        ).to(self.device)

        critic = TabularCritic(
            feature_dim=total_features,
            condition_dim=2,
            hidden_dim=self.hidden_dim
        ).to(self.device)

        opt_g = optim.Adam(generator.parameters(), lr=self.lr, betas=(self.b1, self.b2))
        opt_c = optim.Adam(critic.parameters(), lr=self.lr, betas=(self.b1, self.b2))

        history = {
            "epoch": [],
            "critic_loss": [],
            "generator_loss": [],
            "wasserstein_distance": [],
            "gradient_penalty": []
        }

        logger.info(f"Starting CWGAN-GP training for {epochs} epochs on {len(X_train)} samples...")

        # 3. Training Loop
        for epoch in range(1, epochs + 1):
            c_loss_epoch = 0.0
            g_loss_epoch = 0.0
            wd_epoch = 0.0
            gp_epoch = 0.0
            batches_c = 0
            batches_g = 0

            for i, (real_x, cond) in enumerate(dataloader):
                real_x = real_x.to(self.device)
                cond = cond.to(self.device)
                b_size = real_x.size(0)

                # ===================
                #  Train Critic
                # ===================
                opt_c.zero_grad()

                z = torch.randn(b_size, self.noise_dim, device=self.device)
                fake_x = generator(z, cond)

                real_validity = critic(real_x, cond)
                fake_validity = critic(fake_x.detach(), cond)

                gp = compute_gradient_penalty(critic, real_x, fake_x.detach(), cond, self.device)
                
                # Wasserstein loss: E[Critic(fake)] - E[Critic(real)] + lambda * GP
                c_loss = fake_validity.mean() - real_validity.mean() + self.lambda_gp * gp
                c_loss.backward()
                opt_c.step()

                w_dist = (real_validity.mean() - fake_validity.mean()).item()
                c_loss_epoch += c_loss.item()
                wd_epoch += w_dist
                gp_epoch += gp.item()
                batches_c += 1

                # ===================
                #  Train Generator
                # ===================
                if i % self.n_critic == 0:
                    opt_g.zero_grad()
                    gen_fake = generator(z, cond)
                    g_loss = -critic(gen_fake, cond).mean()
                    g_loss.backward()
                    opt_g.step()

                    g_loss_epoch += g_loss.item()
                    batches_g += 1

            avg_c = c_loss_epoch / max(1, batches_c)
            avg_g = g_loss_epoch / max(1, batches_g)
            avg_wd = wd_epoch / max(1, batches_c)
            avg_gp = gp_epoch / max(1, batches_c)

            history["epoch"].append(epoch)
            history["critic_loss"].append(round(avg_c, 4))
            history["generator_loss"].append(round(avg_g, 4))
            history["wasserstein_distance"].append(round(avg_wd, 4))
            history["gradient_penalty"].append(round(avg_gp, 4))

            if epoch % 10 == 0 or epoch == epochs:
                logger.info(f"Epoch [{epoch}/{epochs}] Critic Loss: {avg_c:.4f} | Gen Loss: {avg_g:.4f} | W-Dist: {avg_wd:.4f}")

        # 4. Save model weights and training curves
        torch.save(generator.state_dict(), os.path.join(self.artifacts_dir, "generator.pt"))
        torch.save(critic.state_dict(), os.path.join(self.artifacts_dir, "critic.pt"))

        # Save training history JSON
        history_path = os.path.join(self.artifacts_dir, "gan_training_history.json")
        with open(history_path, "w") as f:
            json.dump(history, f, indent=2)

        # Plot loss curves
        self._plot_loss_curves(history)

        result = {
            "status": "COMPLETED",
            "epochs_trained": epochs,
            "final_critic_loss": history["critic_loss"][-1],
            "final_generator_loss": history["generator_loss"][-1],
            "final_wasserstein_distance": history["wasserstein_distance"][-1],
            "training_samples": len(X_train),
            "total_features": total_features,
            "artifacts": {
                "generator_weights": "generator.pt",
                "critic_weights": "critic.pt",
                "loss_curves": "gan_loss_curves.png",
                "history": "gan_training_history.json"
            }
        }

        # Save summary
        summary_path = os.path.join(self.artifacts_dir, "gan_metrics.json")
        with open(summary_path, "w") as f:
            json.dump(result, f, indent=2)

        return result

    def _plot_loss_curves(self, history: dict):
        try:
            plt.figure(figsize=(9, 4.5))
            epochs = history["epoch"]
            plt.plot(epochs, history["critic_loss"], label="Critic Loss (Wasserstein + GP)", color="#F43F5E", linewidth=1.8)
            plt.plot(epochs, history["generator_loss"], label="Generator Loss", color="#0284C7", linewidth=1.8)
            plt.plot(epochs, history["wasserstein_distance"], label="Wasserstein Distance", color="#10B981", linestyle="--", linewidth=1.5)

            plt.title("Conditional Tabular GAN (CWGAN-GP) Training Convergence", fontsize=12, fontweight="bold", pad=12)
            plt.xlabel("Epochs", fontsize=10)
            plt.ylabel("Loss / Objective Value", fontsize=10)
            plt.grid(True, linestyle="--", alpha=0.3)
            plt.legend(frameon=True, facecolor="#F8FAFC", edgecolor="#CBD5E1")
            plt.tight_layout()

            plot_path = os.path.join(self.artifacts_dir, "gan_loss_curves.png")
            plt.savefig(plot_path, dpi=180)
            plt.close()
        except Exception as e:
            logger.warning(f"Could not render gan_loss_curves.png: {e}")

if __name__ == "__main__":
    csv_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "benchmark_transactions.csv"))
    trainer = GANTrainer()
    res = trainer.train(csv_file, epochs=40)
    print("GAN Training Finished:", json.dumps(res, indent=2))
