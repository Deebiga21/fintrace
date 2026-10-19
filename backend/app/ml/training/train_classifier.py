"""
FinTrace ML System - Phase 7: Real vs. GAN-Augmented Classifier Benchmark
Empirically compares supervised fraud classification performance on held-out real data.
"""

import os
import json
import logging
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import pandas as pd
import numpy as np
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    precision_recall_curve, roc_curve
)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from ..models.fraud_classifier import TabularFraudClassifier
from ..data.preprocess import TransactionPreprocessor

logger = logging.getLogger("FinTrace.ML.TrainClassifier")

class FraudClassifierBenchmark:
    def __init__(self, artifacts_dir: str = None, device: str = "cpu"):
        if artifacts_dir is None:
            self.artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
        else:
            self.artifacts_dir = artifacts_dir
        os.makedirs(self.artifacts_dir, exist_ok=True)
        self.device = torch.device(device)

    def run_benchmark(
        self,
        real_csv: str,
        synthetic_csv: str = None,
        epochs: int = 50,
        batch_size: int = 64,
        lr: float = 0.003,
        seed: int = 42
    ) -> dict:
        torch.manual_seed(seed)
        np.random.seed(seed)

        # 1. Preprocess real data
        preprocessor = TransactionPreprocessor(self.artifacts_dir)
        df_real = pd.read_csv(real_csv)
        train_df, val_df, test_df, meta = preprocessor.fit_transform_split(df_real)

        def get_labels(d):
            if 'is_ground_truth_mule' in d.columns:
                return d['is_ground_truth_mule'].values.astype(np.float32)
            elif 'is_fraud' in d.columns:
                return d['is_fraud'].values.astype(np.float32)
            elif 'is_suspicious' in d.columns:
                return d['is_suspicious'].values.astype(np.float32)
            return np.zeros(len(d), dtype=np.float32)

        X_train_real = np.stack(train_df['features'].values)
        y_train_real = get_labels(train_df)

        X_val_real = np.stack(val_df['features'].values)
        y_val_real = get_labels(val_df)

        X_test_real = np.stack(test_df['features'].values)
        y_test_real = get_labels(test_df)

        feature_dim = X_train_real.shape[1]

        # 2. Prepare synthetic augmented training data
        if synthetic_csv is None:
            synthetic_csv = os.path.join(self.artifacts_dir, "synthetic_transactions.csv")
        
        df_synth = pd.read_csv(synthetic_csv)
        X_synth = preprocessor.transform_inference(df_synth)
        y_synth = get_labels(df_synth)

        X_train_aug = np.vstack([X_train_real, X_synth])
        y_train_aug = np.concatenate([y_train_real, y_synth])

        logger.info(f"Training datasets prepared: Real Train: {len(X_train_real)} | Augmented Train: {len(X_train_aug)} | Held-out Real Test: {len(X_test_real)}")

        # 3. Train Baseline Model (Real Data Only)
        logger.info("Training Model 1: Baseline Classifier (Real Data Only)...")
        baseline_model, baseline_val_metrics = self._train_single_classifier(
            X_train_real, y_train_real, X_val_real, y_val_real,
            feature_dim, epochs, batch_size, lr
        )
        torch.save(baseline_model.state_dict(), os.path.join(self.artifacts_dir, "classifier_baseline.pt"))

        # 4. Train Augmented Model (Real Data + Validated Synthetic Data)
        logger.info("Training Model 2: Augmented Classifier (Real + GAN-Generated Data)...")
        aug_model, aug_val_metrics = self._train_single_classifier(
            X_train_aug, y_train_aug, X_val_real, y_val_real,
            feature_dim, epochs, batch_size, lr
        )
        torch.save(aug_model.state_dict(), os.path.join(self.artifacts_dir, "classifier_augmented.pt"))

        # 5. Evaluate BOTH models on the EXACT SAME HELD-OUT REAL TEST SET
        logger.info("Evaluating both models on identical held-out REAL test partition...")
        baseline_test_eval = self._evaluate_model(baseline_model, X_test_real, y_test_real)
        aug_test_eval = self._evaluate_model(aug_model, X_test_real, y_test_real)

        # 6. Compute empirical delta & impact
        f1_delta = round(aug_test_eval["f1_score"] - baseline_test_eval["f1_score"], 4)
        recall_delta = round(aug_test_eval["recall"] - baseline_test_eval["recall"], 4)
        prauc_delta = round(aug_test_eval["pr_auc"] - baseline_test_eval["pr_auc"], 4)

        benchmark_report = {
            "evaluation_scope": "Empirical Benchmark on Held-Out Real Test Partition",
            "test_set_size": len(X_test_real),
            "test_positive_fraud_count": int(np.sum(y_test_real)),
            "test_negative_count": int(len(y_test_real) - np.sum(y_test_real)),
            "baseline_model_trained_on": f"{len(X_train_real)} real transactions",
            "augmented_model_trained_on": f"{len(X_train_real)} real + {len(X_synth)} GAN synthetic transactions ({len(X_train_aug)} total)",
            "metrics_comparison": {
                "baseline_real_only": baseline_test_eval,
                "gan_augmented": aug_test_eval,
                "empirical_lift": {
                    "recall_gain": f"{'+' if recall_delta >= 0 else ''}{round(recall_delta * 100, 2)}%",
                    "f1_score_gain": f"{'+' if f1_delta >= 0 else ''}{round(f1_delta * 100, 2)}%",
                    "pr_auc_gain": f"{'+' if prauc_delta >= 0 else ''}{round(prauc_delta * 100, 2)}%",
                    "gan_augmentation_effective": bool(recall_delta > 0 or prauc_delta > 0)
                }
            }
        }

        # Save benchmark report JSON
        report_path = os.path.join(self.artifacts_dir, "classifier_benchmark_report.json")
        with open(report_path, "w") as f:
            json.dump(benchmark_report, f, indent=2)

        # 7. Render ROC and Precision-Recall Curves
        self._plot_pr_roc(
            y_test_real,
            baseline_test_eval["probabilities"],
            aug_test_eval["probabilities"],
            baseline_test_eval["pr_auc"],
            aug_test_eval["pr_auc"]
        )

        logger.info(f"Classifier benchmark finished. Report saved to {report_path}")
        return benchmark_report

    def _train_single_classifier(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        feature_dim: int,
        epochs: int,
        batch_size: int,
        lr: float
    ) -> Tuple[TabularFraudClassifier, dict]:
        model = TabularFraudClassifier(in_features=feature_dim).to(self.device)
        
        # Calculate class weight for positive class
        num_pos = max(1.0, float(np.sum(y_train)))
        num_neg = float(len(y_train) - num_pos)
        pos_weight = torch.tensor([num_neg / num_pos], device=self.device)
        criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

        optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)

        train_ds = TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.float32))
        train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

        best_val_f1 = -1.0
        best_weights = None

        for epoch in range(1, epochs + 1):
            model.train()
            for bx, by in train_loader:
                bx, by = bx.to(self.device), by.to(self.device)
                optimizer.zero_grad()
                logits = model(bx)
                loss = criterion(logits, by)
                loss.backward()
                optimizer.step()

            # Validation check
            model.eval()
            with torch.no_grad():
                val_logits = model(torch.tensor(X_val, dtype=torch.float32, device=self.device))
                val_probs = torch.sigmoid(val_logits).cpu().numpy()
                val_preds = (val_probs >= 0.5).astype(int)
                val_f1 = f1_score(y_val, val_preds, zero_division=0)
                if val_f1 > best_val_f1:
                    best_val_f1 = val_f1
                    best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        if best_weights:
            model.load_state_dict(best_weights)

        return model, {"best_val_f1": float(round(best_val_f1, 4))}

    def _evaluate_model(self, model: TabularFraudClassifier, X_test: np.ndarray, y_test: np.ndarray) -> dict:
        model.eval()
        with torch.no_grad():
            probs = model.predict_proba(torch.tensor(X_test, dtype=torch.float32, device=self.device)).cpu().numpy()

        preds = (probs >= 0.5).astype(int)
        
        precision = float(round(precision_score(y_test, preds, zero_division=0), 4))
        recall = float(round(recall_score(y_test, preds, zero_division=0), 4))
        f1 = float(round(f1_score(y_test, preds, zero_division=0), 4))
        
        try:
            roc_auc = float(round(roc_auc_score(y_test, probs), 4))
        except Exception:
            roc_auc = 0.5

        try:
            pr_auc = float(round(average_precision_score(y_test, probs), 4))
        except Exception:
            pr_auc = 0.0

        cm = confusion_matrix(y_test, preds).tolist()

        return {
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "pr_auc": pr_auc,
            "roc_auc": roc_auc,
            "confusion_matrix": {
                "true_negatives": cm[0][0] if len(cm) > 0 else 0,
                "false_positives": cm[0][1] if len(cm) > 0 and len(cm[0]) > 1 else 0,
                "false_negatives": cm[1][0] if len(cm) > 1 else 0,
                "true_positives": cm[1][1] if len(cm) > 1 and len(cm[1]) > 1 else 0
            },
            "probabilities": probs.tolist()
        }

    def _plot_pr_roc(self, y_true, baseline_probs, aug_probs, base_prauc, aug_prauc):
        try:
            fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))

            # Precision-Recall Curve
            p_base, r_base, _ = precision_recall_curve(y_true, baseline_probs)
            p_aug, r_aug, _ = precision_recall_curve(y_true, aug_probs)

            axes[0].plot(r_base, p_base, label=f"Real Baseline (PR-AUC: {base_prauc:.3f})", color="#64748B", linestyle="--", linewidth=1.8)
            axes[0].plot(r_aug, p_aug, label=f"GAN Augmented (PR-AUC: {aug_prauc:.3f})", color="#F43F5E", linewidth=2.0)
            axes[0].set_title("Precision-Recall Curve on Held-Out Real Data", fontsize=11, fontweight="bold")
            axes[0].set_xlabel("Recall", fontsize=9)
            axes[0].set_ylabel("Precision", fontsize=9)
            axes[0].grid(True, linestyle="--", alpha=0.3)
            axes[0].legend(frameon=True, loc="lower left")

            # ROC Curve
            fpr_base, tpr_base, _ = roc_curve(y_true, baseline_probs)
            fpr_aug, tpr_aug, _ = roc_curve(y_true, aug_probs)

            axes[1].plot(fpr_base, tpr_base, label="Real Baseline", color="#64748B", linestyle="--", linewidth=1.8)
            axes[1].plot(fpr_aug, tpr_aug, label="GAN Augmented", color="#0284C7", linewidth=2.0)
            axes[1].plot([0, 1], [0, 1], color="#CBD5E1", linestyle=":")
            axes[1].set_title("Receiver Operating Characteristic (ROC)", fontsize=11, fontweight="bold")
            axes[1].set_xlabel("False Positive Rate", fontsize=9)
            axes[1].set_ylabel("True Positive Rate", fontsize=9)
            axes[1].grid(True, linestyle="--", alpha=0.3)
            axes[1].legend(frameon=True, loc="lower right")

            plt.tight_layout()
            plot_path = os.path.join(self.artifacts_dir, "pr_roc_curves.png")
            plt.savefig(plot_path, dpi=180)
            plt.close()
        except Exception as e:
            logger.warning(f"Could not render pr_roc_curves.png: {e}")

if __name__ == "__main__":
    benchmark = FraudClassifierBenchmark()
    real_csv = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "benchmark_transactions.csv"))
    res = benchmark.run_benchmark(real_csv, epochs=35)
    print(json.dumps(res["metrics_comparison"]["empirical_lift"], indent=2))
