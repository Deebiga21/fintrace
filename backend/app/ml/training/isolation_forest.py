"""Temporal, unsupervised Isolation Forest baseline for transaction CSVs."""

from __future__ import annotations

import json
import os
import argparse
from dataclasses import dataclass
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer


ID_COLUMNS = {
    "record_id", "transaction_id", "account_group_id", "sender_account",
    "receiver_account", "primary_account", "customer_name", "source_file",
    "source_sheet", "source_row", "description", "narration", "reference",
    "event_timestamp", "timestamp", "date", "datetime",
}
LABEL_COLUMNS = {
    "is_fraud", "isfraud", "is_suspicious", "is_ground_truth_mule",
    "is_mule", "label", "fraud", "flag_reason", "risk_level", "risk_score",
    "mule_score", "anomaly_score", "fraud_probability", "risk_probability",
}
LOW_CARDINALITY_CATEGORIES = {"transaction_type", "status", "currency", "channel"}


def _features(frame: pd.DataFrame) -> pd.DataFrame:
    """Build model inputs without IDs, names, or target/alert columns."""
    result = frame.copy()
    for column in ("event_timestamp", "timestamp", "date", "datetime"):
        if column in result:
            dt = pd.to_datetime(result[column], errors="coerce")
            hour = dt.dt.hour.fillna(0)
            dow = dt.dt.dayofweek.fillna(0)
            result[f"{column}_hour_sin"] = np.sin(2 * np.pi * hour / 24)
            result[f"{column}_hour_cos"] = np.cos(2 * np.pi * hour / 24)
            result[f"{column}_dow_sin"] = np.sin(2 * np.pi * dow / 7)
            result[f"{column}_dow_cos"] = np.cos(2 * np.pi * dow / 7)
    drop = [c for c in result if c.lower() in ID_COLUMNS | LABEL_COLUMNS]
    result.drop(columns=drop, inplace=True, errors="ignore")
    cats = [c for c in result if c.lower() in LOW_CARDINALITY_CATEGORIES]
    for column in cats:
        result[column] = result[column].fillna("UNKNOWN").astype(str)
    result = pd.get_dummies(result, columns=cats, dummy_na=False, dtype=float)
    for column in result:
        result[column] = pd.to_numeric(result[column], errors="coerce")
    result.replace([np.inf, -np.inf], np.nan, inplace=True)
    result = result.select_dtypes(include=[np.number])
    if result.empty:
        raise ValueError("No usable numeric transaction features were found")
    return result


@dataclass
class IsolationForestTrainer:
    artifacts_dir: str
    n_estimators: int = 300
    random_state: int = 42

    @property
    def model_path(self) -> str:
        return os.path.join(self.artifacts_dir, "isolation_forest.joblib")

    @property
    def scores_path(self) -> str:
        return os.path.join(self.artifacts_dir, "isolation_forest_scores.csv")

    @property
    def metrics_path(self) -> str:
        return os.path.join(self.artifacts_dir, "isolation_forest_metrics.json")

    def train(
        self,
        csv_path: str,
        contamination: float = 0.01,
        holdout_csv_path: str | None = None,
    ) -> dict[str, Any]:
        if not 0.0001 <= contamination <= 0.5:
            raise ValueError("contamination must be between 0.0001 and 0.5")
        df = pd.read_csv(csv_path, low_memory=False)
        if len(df) < 10:
            raise ValueError("At least 10 training transactions are required")
        order_col = next((c for c in ("event_timestamp", "timestamp", "date", "datetime") if c in df), None)
        if order_col:
            df[order_col] = pd.to_datetime(df[order_col], errors="coerce")
            df.sort_values(order_col, kind="stable", inplace=True, na_position="last")
            df.reset_index(drop=True, inplace=True)
        if holdout_csv_path:
            train = df
            holdout = pd.read_csv(holdout_csv_path, low_memory=False)
            if holdout.empty:
                raise ValueError("The supplied holdout CSV is empty")
            holdout_order_col = next((c for c in ("event_timestamp", "timestamp", "date", "datetime") if c in holdout), None)
            if holdout_order_col:
                holdout[holdout_order_col] = pd.to_datetime(holdout[holdout_order_col], errors="coerce")
                holdout.sort_values(holdout_order_col, kind="stable", inplace=True, na_position="last")
                holdout.reset_index(drop=True, inplace=True)
            split_description = "separate train CSV and chronological holdout CSV"
        else:
            split_at = max(10, int(len(df) * 0.8))
            if split_at >= len(df):
                split_at = len(df) - 1
            train, holdout = df.iloc[:split_at], df.iloc[split_at:]
            split_description = "chronological 80/20; fit on first 80%, score final 20%"
        x_train = _features(train)
        x_holdout = _features(holdout).reindex(columns=x_train.columns, fill_value=0)
        imputer = SimpleImputer(strategy="median", keep_empty_features=True)
        train_matrix = imputer.fit_transform(x_train)
        holdout_matrix = imputer.transform(x_holdout)
        model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=contamination,
            random_state=self.random_state,
            n_jobs=-1,
        )
        model.fit(train_matrix)
        # Higher scores mean more anomalous. sklearn's decision threshold is 0.
        anomaly_score = -model.decision_function(holdout_matrix)
        flag = anomaly_score > 0
        output_cols = [c for c in (
            "record_id", "transaction_id", "account_group_id", "sender_account",
            "receiver_account", "source_file", "source_sheet", "source_row",
            "event_timestamp", "timestamp", "amount", "signed_amount",
        ) if c in holdout]
        scored = holdout[output_cols].copy()
        scored["iforest_anomaly_score"] = anomaly_score
        scored["iforest_risk_percentile"] = pd.Series(anomaly_score).rank(pct=True).to_numpy() * 100
        scored["iforest_flag"] = flag.astype("int8")
        scored.sort_values("iforest_anomaly_score", ascending=False, inplace=True)

        os.makedirs(self.artifacts_dir, exist_ok=True)
        joblib.dump({"model": model, "imputer": imputer, "columns": list(x_train.columns)}, self.model_path)
        scored.to_csv(self.scores_path, index=False)
        metrics = {
            "status": "COMPLETED",
            "method": "IsolationForest",
            "split": split_description,
            "train_rows": int(len(train)),
            "holdout_rows": int(len(holdout)),
            "feature_count": int(len(x_train.columns)),
            "contamination": float(contamination),
            "flagged_rows": int(flag.sum()),
            "flagged_fraction": float(flag.mean()),
            "top_scores_file": os.path.basename(self.scores_path),
            "interpretation": "Anomaly candidates only; not confirmed fraud labels.",
        }
        with open(self.metrics_path, "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=2)
        return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Fit and score the FinTrace Isolation Forest baseline")
    parser.add_argument("--train", required=True, help="Training CSV path")
    parser.add_argument("--holdout", help="Optional separate chronological holdout CSV path")
    parser.add_argument("--artifacts", default="backend/app/ml/artifacts", help="Local output directory")
    parser.add_argument("--contamination", type=float, default=0.01)
    args = parser.parse_args()
    metrics = IsolationForestTrainer(args.artifacts).train(
        args.train, contamination=args.contamination, holdout_csv_path=args.holdout
    )
    print(json.dumps(metrics, indent=2))
    print(f"Scores saved to {os.path.join(args.artifacts, 'isolation_forest_scores.csv')}")


if __name__ == "__main__":
    main()
