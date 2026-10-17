"""
FinTrace ML System - Phase 5: Synthetic Transaction Generation
Generates realistic general transactions and conditional minority-class (fraud/mule) records.
Clearly tags all outputs as synthetic.
"""

import os
import json
import logging
import torch
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from ..models.tabular_gan import TabularGenerator
from ..data.preprocess import TransactionPreprocessor

logger = logging.getLogger("FinTrace.ML.GenerateSynthetic")

class SyntheticTransactionGenerator:
    def __init__(self, artifacts_dir: str = None, device: str = "cpu"):
        if artifacts_dir is None:
            self.artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
        else:
            self.artifacts_dir = artifacts_dir

        self.device = torch.device(device)
        self.preprocessor = TransactionPreprocessor(self.artifacts_dir)
        self.preprocessor.load_params()

        # Load schema metadata
        schema_path = os.path.join(self.artifacts_dir, "preprocess_params.json")
        with open(schema_path, "r") as f:
            self.meta = json.load(f)

        self.num_continuous = len(self.preprocessor.num_cols)
        self.cat_cardinalities = [len(cats) for cats in self.preprocessor.encoder.categories_]
        self.total_features = self.meta["num_features"]

        # Load Generator
        self.generator = TabularGenerator(
            noise_dim=64,
            condition_dim=2,
            num_continuous=self.num_continuous,
            cat_cardinalities=self.cat_cardinalities,
            hidden_dim=128
        ).to(self.device)

        weights_path = os.path.join(self.artifacts_dir, "generator.pt")
        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"Generator weights not found at {weights_path}. Train the GAN first.")
        
        self.generator.load_state_dict(torch.load(weights_path, map_location=self.device, weights_only=True))
        self.generator.eval()

    def generate(
        self,
        num_samples: int = 500,
        fraud_ratio: float = 0.35, # Increased ratio for minority-class augmentation
        seed: int = 42,
        output_csv: str = None
    ) -> pd.DataFrame:
        torch.manual_seed(seed)
        np.random.seed(seed)

        num_fraud = int(num_samples * fraud_ratio)
        num_normal = num_samples - num_fraud

        # Build condition vectors
        conditions_list = []
        if num_normal > 0:
            c_norm = np.zeros((num_normal, 2), dtype=np.float32)
            c_norm[:, 0] = 1.0  # Legitimate
            conditions_list.append(c_norm)
        if num_fraud > 0:
            c_fraud = np.zeros((num_fraud, 2), dtype=np.float32)
            c_fraud[:, 1] = 1.0  # Fraud / Mule
            conditions_list.append(c_fraud)

        conditions_arr = np.vstack(conditions_list)
        cond_tensor = torch.tensor(conditions_arr, dtype=torch.float32, device=self.device)
        noise = torch.randn(num_samples, 64, device=self.device)

        with torch.no_grad():
            synthetic_features = self.generator(noise, cond_tensor).cpu().numpy()

        # Invert continuous features
        cont_features = synthetic_features[:, :self.num_continuous]
        inverted_cont = self.preprocessor.scaler.inverse_transform(cont_features)

        # Invert categorical features
        cat_features = synthetic_features[:, self.num_continuous:]
        offset = 0
        cat_columns = {}
        for c_idx, col_name in enumerate(self.preprocessor.cat_cols):
            card = self.cat_cardinalities[c_idx]
            sub_arr = cat_features[:, offset:offset + card]
            chosen_indices = np.argmax(sub_arr, axis=1)
            categories = self.preprocessor.encoder.categories_[c_idx]
            cat_columns[col_name] = [str(categories[idx]) for idx in chosen_indices]
            offset += card

        # Assemble DataFrame
        df_out = pd.DataFrame()
        df_out["amount"] = np.round(np.clip(inverted_cont[:, 0], a_min=10.0, a_max=1000000.0), 2)
        
        for col_name, vals in cat_columns.items():
            df_out[col_name] = vals

        # Is ground truth label
        df_out["is_ground_truth_mule"] = (conditions_arr[:, 1] == 1.0)
        df_out["is_synthetic"] = True

        # Generate realistic synthetic identifiers
        base_time = datetime(2026, 10, 15, 10, 0, 0)
        txn_ids = []
        sender_ids = []
        receiver_ids = []
        timestamps = []
        descriptions = []

        for i, is_fraud in enumerate(df_out["is_ground_truth_mule"]):
            txn_ids.append(f"SYNTH_TXN_{i+1:05d}")
            delta_mins = int(abs(inverted_cont[i, 2] * 60) + i * 5) % 43200
            t_stamp = base_time + timedelta(minutes=delta_mins)
            timestamps.append(t_stamp.strftime("%Y-%m-%dT%H:%M:%S"))

            if is_fraud:
                sender_ids.append(f"SYNTH_MULE_{((i % 12) + 1):03d}")
                receiver_ids.append(f"SYNTH_LAYER_{((i % 8) + 1):03d}")
                descriptions.append("Simulated High-Velocity Pass-Through Settlement")
            else:
                sender_ids.append(f"SYNTH_USER_{((i % 120) + 1):04d}")
                receiver_ids.append(f"SYNTH_MERCHANT_{((i % 25) + 1):03d}")
                descriptions.append("Simulated Everyday Retail / P2P Transfer")

        df_out["transaction_id"] = txn_ids
        df_out["sender_account"] = sender_ids
        df_out["receiver_account"] = receiver_ids
        df_out["timestamp"] = timestamps
        df_out["description"] = descriptions

        # Reorder columns
        cols = [
            "transaction_id", "sender_account", "receiver_account",
            "amount", "timestamp", "status", "transaction_type",
            "description", "is_ground_truth_mule", "is_synthetic"
        ]
        df_out = df_out[cols]

        if output_csv is None:
            output_csv = os.path.join(self.artifacts_dir, "synthetic_transactions.csv")
        df_out.to_csv(output_csv, index=False)
        logger.info(f"Generated {len(df_out)} synthetic transactions -> {output_csv}")
        return df_out

if __name__ == "__main__":
    generator = SyntheticTransactionGenerator()
    df_synth = generator.generate(num_samples=400, fraud_ratio=0.4)
    print(f"Generated {len(df_synth)} records. Fraud count: {df_synth['is_ground_truth_mule'].sum()}")
