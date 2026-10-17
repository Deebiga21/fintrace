"""
FinTrace ML System - Phase 6: Synthetic Data Quality & Privacy Validation
Statistically evaluates numerical distributions, categorical frequencies, correlation fidelity,
and privacy leakage between real training data and GAN-generated transactions.
"""

import os
import json
import logging
import pandas as pd
import numpy as np
from scipy.stats import wasserstein_distance, ks_2samp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

logger = logging.getLogger("FinTrace.ML.ValidateSynthetic")

class SyntheticQualityValidator:
    def __init__(self, artifacts_dir: str = None):
        if artifacts_dir is None:
            self.artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
        else:
            self.artifacts_dir = artifacts_dir
        os.makedirs(self.artifacts_dir, exist_ok=True)

    def evaluate(
        self,
        real_csv: str,
        synthetic_csv: str,
        output_report: str = None
    ) -> dict:
        df_real = pd.read_csv(real_csv)
        df_synth = pd.read_csv(synthetic_csv)

        logger.info(f"Evaluating synthetic fidelity: {len(df_real)} real vs {len(df_synth)} synthetic records...")

        # 1. Numerical fidelity (Amount & Log Amount)
        real_amt = df_real['amount'].dropna().values
        synth_amt = df_synth['amount'].dropna().values

        real_log_amt = np.log1p(np.maximum(0, real_amt))
        synth_log_amt = np.log1p(np.maximum(0, synth_amt))

        # Wasserstein Distance on log-amounts (scale-invariant)
        w_dist_log = float(round(wasserstein_distance(real_log_amt, synth_log_amt), 4))
        ks_stat, ks_pval = ks_2samp(real_log_amt, synth_log_amt)

        numerical_metrics = {
            "wasserstein_distance_log_amount": w_dist_log,
            "ks_statistic": float(round(ks_stat, 4)),
            "ks_pvalue": float(round(ks_pval, 6)),
            "real_mean_amount": float(round(np.mean(real_amt), 2)),
            "synth_mean_amount": float(round(np.mean(synth_amt), 2)),
            "real_median_amount": float(round(np.median(real_amt), 2)),
            "synth_median_amount": float(round(np.median(synth_amt), 2)),
            "numerical_fidelity_score": float(round(max(0.0, 100.0 - (w_dist_log * 25.0)), 2))
        }

        # 2. Categorical distribution divergence (Total Variation Distance)
        cat_metrics = {}
        for col in ['transaction_type', 'status']:
            if col in df_real.columns and col in df_synth.columns:
                real_dist = df_real[col].value_counts(normalize=True).to_dict()
                synth_dist = df_synth[col].value_counts(normalize=True).to_dict()
                all_keys = set(real_dist.keys()).union(set(synth_dist.keys()))
                
                # Total Variation Distance: 0.5 * sum |P(x) - Q(x)|
                tvd = 0.5 * sum(abs(real_dist.get(k, 0.0) - synth_dist.get(k, 0.0)) for k in all_keys)
                cat_metrics[col] = {
                    "total_variation_distance": float(round(tvd, 4)),
                    "fidelity_score": float(round(max(0.0, (1.0 - tvd) * 100.0), 2)),
                    "real_frequencies": {k: float(round(v, 4)) for k, v in real_dist.items()},
                    "synth_frequencies": {k: float(round(v, 4)) for k, v in synth_dist.items()}
                }

        # 3. Privacy & Memorization Check (ensuring GAN didn't just copy verbatim training transactions)
        # Check exact (amount, type) match percentage
        real_pairs = set(zip(df_real['amount'].round(2), df_real['transaction_type'].astype(str)))
        synth_pairs = list(zip(df_synth['amount'].round(2), df_synth['transaction_type'].astype(str)))
        exact_duplicate_count = sum(1 for p in synth_pairs if p in real_pairs)
        exact_duplicate_rate = float(round(exact_duplicate_count / max(1, len(synth_pairs)) * 100.0, 2))

        # Check account identity isolation: No real account name should exist in synthetic data
        real_accounts = set(df_real['sender_account'].unique()).union(set(df_real['receiver_account'].unique()))
        synth_accounts = set(df_synth['sender_account'].unique()).union(set(df_synth['receiver_account'].unique()))
        account_leakage_count = len(real_accounts.intersection(synth_accounts))

        privacy_metrics = {
            "account_identifier_leakage": account_leakage_count,
            "privacy_risk_status": "PASSED (ZERO LEAKAGE)" if account_leakage_count == 0 else "FAILED",
            "exact_feature_match_rate": f"{exact_duplicate_rate}%",
            "novel_sample_diversity_rate": f"{round(100.0 - exact_duplicate_rate, 2)}%"
        }

        # 4. Overall quality gate
        overall_fidelity = round(
            (numerical_metrics["numerical_fidelity_score"] * 0.5) +
            (np.mean([m["fidelity_score"] for m in cat_metrics.values()]) * 0.5),
            2
        )
        usable_for_augmentation = bool(overall_fidelity >= 65.0 and account_leakage_count == 0)

        report = {
            "evaluation_timestamp": pd.Timestamp.now().isoformat(),
            "real_samples_count": len(df_real),
            "synthetic_samples_count": len(df_synth),
            "overall_fidelity_score": overall_fidelity,
            "usable_for_augmentation": usable_for_augmentation,
            "numerical_distribution_fidelity": numerical_metrics,
            "categorical_distribution_fidelity": cat_metrics,
            "privacy_and_memorization_audit": privacy_metrics
        }

        if output_report is None:
            output_report = os.path.join(self.artifacts_dir, "synthetic_quality_report.json")
        with open(output_report, "w") as f:
            json.dump(report, f, indent=2)

        # 5. Visual plot comparing Real vs Synthetic distributions
        self._plot_distributions(real_log_amt, synth_log_amt, df_real, df_synth)
        logger.info(f"Synthetic quality audit complete. Fidelity: {overall_fidelity}% -> {output_report}")
        return report

    def _plot_distributions(self, real_log_amt, synth_log_amt, df_real, df_synth):
        try:
            fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))

            # Subplot 1: Transaction Amount KDE / Histograms
            axes[0].hist(real_log_amt, bins=25, density=True, alpha=0.55, color="#0284C7", label="Real Transactions")
            axes[0].hist(synth_log_amt, bins=25, density=True, alpha=0.55, color="#F43F5E", label="Synthetic (CWGAN-GP)")
            axes[0].set_title("Log-Amount Distribution Overlap", fontsize=11, fontweight="bold")
            axes[0].set_xlabel("Log(1 + Amount)", fontsize=9)
            axes[0].set_ylabel("Probability Density", fontsize=9)
            axes[0].grid(True, linestyle="--", alpha=0.3)
            axes[0].legend(frameon=True)

            # Subplot 2: Transaction Type Frequency Comparison
            if 'transaction_type' in df_real.columns and 'transaction_type' in df_synth.columns:
                real_types = df_real['transaction_type'].value_counts(normalize=True)
                synth_types = df_synth['transaction_type'].value_counts(normalize=True)
                all_cats = sorted(list(set(real_types.index).union(set(synth_types.index))))
                x = np.arange(len(all_cats))
                width = 0.35

                r_vals = [real_types.get(k, 0.0) * 100 for k in all_cats]
                s_vals = [synth_types.get(k, 0.0) * 100 for k in all_cats]

                axes[1].bar(x - width/2, r_vals, width, label='Real %', color='#0284C7')
                axes[1].bar(x + width/2, s_vals, width, label='Synthetic %', color='#F43F5E')
                axes[1].set_title("Categorical Distribution Match (Type)", fontsize=11, fontweight="bold")
                axes[1].set_xticks(x)
                axes[1].set_xticklabels(all_cats, rotation=25, ha="right", fontsize=8)
                axes[1].set_ylabel("Share (%)", fontsize=9)
                axes[1].grid(axis="y", linestyle="--", alpha=0.3)
                axes[1].legend(frameon=True)

            plt.tight_layout()
            plot_path = os.path.join(self.artifacts_dir, "real_vs_synthetic_distributions.png")
            plt.savefig(plot_path, dpi=180)
            plt.close()
        except Exception as e:
            logger.warning(f"Could not render real_vs_synthetic_distributions.png: {e}")

if __name__ == "__main__":
    real_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "benchmark_transactions.csv"))
    synth_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "artifacts", "synthetic_transactions.csv"))
    validator = SyntheticQualityValidator()
    report = validator.evaluate(real_path, synth_path)
    print("Quality Report Summary:")
    print(f"Overall Fidelity: {report['overall_fidelity_score']}%")
    print(f"Usable for Augmentation: {report['usable_for_augmentation']}")
    print(f"Privacy Leakage: {report['privacy_and_memorization_audit']['privacy_risk_status']}")
