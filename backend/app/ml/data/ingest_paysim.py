"""
FinTrace ML System - Phase 2: PaySim Dataset Ingestion & Adapter
Loads and standardizes the real Kaggle PaySim dataset (ealaxi/paysim1)
Preserves authentic transaction distributions, timesteps, fraud events, and mule conduits.
"""

import os
import sys
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

logger = logging.getLogger("FinTrace.ML.IngestPaySim")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

DEFAULT_KAGGLE_PATH = os.path.expanduser(
    r"~/.cache/kagglehub/datasets/ealaxi/paysim1/versions/2/PS_20174392719_1491204439457_log.csv"
)
OUTPUT_PAYSIM_CSV = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "paysim_transactions.csv")
)

def ingest_paysim_dataset(
    raw_path: str = DEFAULT_KAGGLE_PATH,
    output_path: str = OUTPUT_PAYSIM_CSV,
    max_step: int = 15,
    sample_background: int = 8000,
    random_state: int = 42
) -> pd.DataFrame:
    """
    Ingests and standardizes a high-fidelity connected subnetwork of PaySim:
    - Extracts all authentic fraud events (TRANSFER and CASH_OUT) up to max_step.
    - Extracts all normal transactions involving the participating fraud accounts.
    - Samples realistic background normal mobile-money transactions across the same steps.
    - Standardizes schemas to match FinTrace graph and ML pipelines.
    """
    if not os.path.exists(raw_path):
        raise FileNotFoundError(f"PaySim raw dataset not found at: {raw_path}")

    logger.info(f"Loading PaySim raw file from: {raw_path} (Filtering steps <= {max_step})")
    
    chunks = []
    for chunk in pd.read_csv(raw_path, chunksize=100000):
        c = chunk[chunk['step'] <= max_step]
        chunks.append(c)
        if chunk['step'].max() > max_step:
            break

    df_window = pd.concat(chunks, ignore_index=True)
    logger.info(f"Loaded {len(df_window)} total PaySim transactions across steps 1 to {max_step}.")

    # 1. Identify all authentic fraud transactions
    fraud_txns = df_window[df_window['isFraud'] == 1].copy()
    fraud_accounts = set(fraud_txns['nameOrig']).union(set(fraud_txns['nameDest']))
    logger.info(f"Identified {len(fraud_txns)} authentic fraud transactions involving {len(fraud_accounts)} accounts.")

    # 2. Extract legitimate transactions involving these accounts
    related_txns = df_window[
        (df_window['isFraud'] == 0) & 
        (df_window['nameOrig'].isin(fraud_accounts) | df_window['nameDest'].isin(fraud_accounts))
    ].copy()
    logger.info(f"Found {len(related_txns)} connected legitimate transactions for fraud-linked accounts.")

    # 3. Sample background normal transactions
    other_txns = df_window[
        ~df_window.index.isin(fraud_txns.index) & 
        ~df_window.index.isin(related_txns.index)
    ]
    if len(other_txns) > sample_background:
        sampled_other = other_txns.sample(n=sample_background, random_state=random_state).copy()
    else:
        sampled_other = other_txns.copy()

    logger.info(f"Sampled {len(sampled_other)} normal background transactions.")

    # 4. Combine and sort chronologically by step
    combined = pd.concat([fraud_txns, related_txns, sampled_other], ignore_index=True)
    combined = combined.sort_values('step').reset_index(drop=True)

    # 5. Schema mapping to FinTrace standards
    # Base timestamp: 2026-01-01 00:00:00 + step * 1 hour + index % 60 minutes
    base_dt = datetime(2026, 1, 1, 0, 0, 0)
    timestamps = [
        (base_dt + timedelta(hours=int(s), minutes=int(idx % 60), seconds=int((idx * 7) % 60))).strftime("%Y-%m-%d %H:%M:%S")
        for idx, s in enumerate(combined['step'])
    ]

    # Account-level mule identification:
    # In PaySim, fraudulent TRANSFER destination accounts and fraudulent CASH_OUT accounts are mule conduits
    mule_receivers = set(fraud_txns[fraud_txns['type'] == 'TRANSFER']['nameDest'])
    mule_cashouts = set(fraud_txns[fraud_txns['type'] == 'CASH_OUT']['nameOrig'])
    all_mules = mule_receivers.union(mule_cashouts)

    std_df = pd.DataFrame({
        "transaction_id": [f"PAYSIM_S{row.step}_{idx:06d}" for idx, row in combined.iterrows()],
        "sender_account": combined['nameOrig'].astype(str),
        "receiver_account": combined['nameDest'].astype(str),
        "amount": combined['amount'].astype(float).round(2),
        "timestamp": timestamps,
        "step": combined['step'].astype(int),
        "transaction_type": combined['type'].astype(str),
        "status": "COMPLETED",
        "is_fraud": combined['isFraud'].astype(int),
        "is_ground_truth_mule": combined['isFraud'].astype(bool),
        "is_flagged_fraud": combined['isFlaggedFraud'].astype(int),
        "sender_old_balance": combined['oldbalanceOrg'].astype(float).round(2),
        "sender_new_balance": combined['newbalanceOrig'].astype(float).round(2),
        "receiver_old_balance": combined['oldbalanceDest'].astype(float).round(2),
        "receiver_new_balance": combined['newbalanceDest'].astype(float).round(2),
        "is_mule_account_involved": [
            1 if (orig in all_mules or dest in all_mules) else 0
            for orig, dest in zip(combined['nameOrig'], combined['nameDest'])
        ]
    })

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    std_df.to_csv(output_path, index=False)
    logger.info(f"Standardized PaySim dataset saved to {output_path} ({len(std_df)} rows).")

    return std_df

if __name__ == "__main__":
    df = ingest_paysim_dataset()
    print("Ingestion complete. Summary:")
    print("Shape:", df.shape)
    print("Fraud count:", df['is_fraud'].sum())
    print("Unique accounts:", len(set(df['sender_account']).union(set(df['receiver_account']))))
    print("Head:\n", df[['transaction_id', 'sender_account', 'receiver_account', 'amount', 'transaction_type', 'is_fraud']].head())
