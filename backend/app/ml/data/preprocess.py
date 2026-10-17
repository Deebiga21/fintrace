"""
FinTrace ML System - Phase 3: Preprocessing & Leakage-Free Feature Engineering
Fits scalers and encoders strictly on the training partition and preserves schemas for inference.
"""

import os
import json
import logging
import joblib
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List
from sklearn.preprocessing import StandardScaler, OneHotEncoder

logger = logging.getLogger("FinTrace.ML.Preprocess")

class TransactionPreprocessor:
    def __init__(self, artifacts_dir: str = None):
        if artifacts_dir is None:
            self.artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
        else:
            self.artifacts_dir = artifacts_dir
        os.makedirs(self.artifacts_dir, exist_ok=True)
        
        self.scaler = StandardScaler()
        self.encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
        self.is_fitted = False
        
        self.num_cols = ['amount', 'log_amount', 'hour_of_day', 'day_of_week']
        self.cat_cols = ['transaction_type', 'status']
        self.feature_names = []

    def fit_transform_split(
        self,
        df: pd.DataFrame,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """
        Performs a temporal train/val/test split and fits transformers ONLY on train_df.
        """
        # Ensure chronological ordering
        df = df.copy()
        if 'timestamp' in df.columns:
            df['dt'] = pd.to_datetime(df['timestamp'])
            df = df.sort_values('dt').reset_index(drop=True)
        else:
            df['dt'] = pd.Timestamp.now()

        # Feature engineering
        df = self._engineer_features(df)

        n = len(df)
        train_end = int(n * train_ratio)
        val_end = int(n * (train_ratio + val_ratio))

        train_df = df.iloc[:train_end].copy()
        val_df = df.iloc[train_end:val_end].copy()
        test_df = df.iloc[val_end:].copy()

        # Fit transformers strictly on train_df
        self.scaler.fit(train_df[self.num_cols].fillna(0.0))
        
        # Ensure categorical columns exist and fillna
        for c in self.cat_cols:
            if c not in train_df.columns:
                train_df[c] = 'UNKNOWN'
                val_df[c] = 'UNKNOWN'
                test_df[c] = 'UNKNOWN'
            else:
                train_df[c] = train_df[c].fillna('UNKNOWN').astype(str)
                val_df[c] = val_df[c].fillna('UNKNOWN').astype(str)
                test_df[c] = test_df[c].fillna('UNKNOWN').astype(str)

        self.encoder.fit(train_df[self.cat_cols])
        encoded_cat_names = list(self.encoder.get_feature_names_out(self.cat_cols))
        self.feature_names = self.num_cols + encoded_cat_names
        self.is_fitted = True

        # Transform all three partitions
        X_train = self._transform_features(train_df)
        X_val = self._transform_features(val_df)
        X_test = self._transform_features(test_df)

        train_df['features'] = list(X_train)
        val_df['features'] = list(X_val)
        test_df['features'] = list(X_test)

        metadata = {
            "num_features": len(self.feature_names),
            "feature_names": self.feature_names,
            "train_size": len(train_df),
            "val_size": len(val_df),
            "test_size": len(test_df),
            "scaler_means": {col: float(m) for col, m in zip(self.num_cols, self.scaler.mean_)},
            "scaler_scales": {col: float(s) for col, s in zip(self.num_cols, self.scaler.scale_)},
            "categorical_categories": {
                c: [str(x) for x in cats] for c, cats in zip(self.cat_cols, self.encoder.categories_)
            }
        }

        # Save artifacts
        self.save_params(metadata)
        logger.info(f"Preprocessing completed. Features: {len(self.feature_names)}")
        return train_df, val_df, test_df, metadata

    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)
        df['log_amount'] = np.log1p(np.maximum(0, df['amount']))
        df['hour_of_day'] = df['dt'].dt.hour
        df['day_of_week'] = df['dt'].dt.dayofweek
        return df

    def _transform_features(self, df: pd.DataFrame) -> np.ndarray:
        num_arr = self.scaler.transform(df[self.num_cols].fillna(0.0))
        cat_arr = self.encoder.transform(df[self.cat_cols].fillna('UNKNOWN').astype(str))
        return np.hstack([num_arr, cat_arr]).astype(np.float32)

    def transform_inference(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transforms new raw transaction records at inference time.
        """
        if not self.is_fitted:
            self.load_params()
        df = df.copy()
        if 'timestamp' in df.columns:
            df['dt'] = pd.to_datetime(df['timestamp'], errors='coerce').fillna(pd.Timestamp.now())
        else:
            df['dt'] = pd.Timestamp.now()
        df = self._engineer_features(df)
        return self._transform_features(df)

    def save_params(self, metadata: dict):
        schema_path = os.path.join(self.artifacts_dir, "preprocess_params.json")
        with open(schema_path, "w") as f:
            json.dump(metadata, f, indent=2)
        joblib.dump(self.scaler, os.path.join(self.artifacts_dir, "scaler.joblib"))
        joblib.dump(self.encoder, os.path.join(self.artifacts_dir, "encoder.joblib"))

    def load_params(self):
        scaler_path = os.path.join(self.artifacts_dir, "scaler.joblib")
        encoder_path = os.path.join(self.artifacts_dir, "encoder.joblib")
        schema_path = os.path.join(self.artifacts_dir, "preprocess_params.json")
        
        if os.path.exists(scaler_path) and os.path.exists(encoder_path):
            self.scaler = joblib.load(scaler_path)
            self.encoder = joblib.load(encoder_path)
            if os.path.exists(schema_path):
                with open(schema_path, "r") as f:
                    meta = json.load(f)
                    self.feature_names = meta.get("feature_names", [])
            self.is_fitted = True
            logger.info("Loaded fitted preprocessor from artifacts.")
        else:
            raise RuntimeError("Preprocessor artifacts not found. Fit the preprocessor first.")

if __name__ == "__main__":
    csv_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "benchmark_transactions.csv"))
    df = pd.read_csv(csv_file)
    pre = TransactionPreprocessor()
    train_df, val_df, test_df, meta = pre.fit_transform_split(df)
    print(f"Features created: {meta['num_features']}")
    print(f"Train/Val/Test: {len(train_df)}/{len(val_df)}/{len(test_df)}")
