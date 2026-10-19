"""
FinTrace Database Seeder - Proposed Dataset
Populates SQLite/Postgres DB with the 25 primary statement accounts,
their key counterparties, top transactions, and critical AML alerts.
"""

import os
import json
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "fintrace.db"))
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))

def seed_proposed_data():
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at {DB_PATH}")
        return

    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Load account profiles
    profiles_csv = os.path.join(DATA_DIR, "proposed_account_profiles.csv")
    if not os.path.exists(profiles_csv):
        print(f"Profiles CSV not found at {profiles_csv}")
        return
    df_profiles = pd.read_csv(profiles_csv)

    # Load cleaned transactions
    txns_csv = os.path.join(DATA_DIR, "proposed_cleaned_transactions.csv")
    if not os.path.exists(txns_csv):
        print(f"Transactions CSV not found at {txns_csv}")
        return
    
    print("Reading proposed transactions for seeding...")
    # Select sample: all suspicious transactions (up to 1,000) + high value transactions + sample normal transactions
    df_txns = pd.read_csv(txns_csv)
    
    suspicious_sample = df_txns[df_txns['is_suspicious'] == 1].head(800)
    high_val_sample = df_txns[df_txns['amount'] > 100000].head(800)
    general_sample = df_txns[df_txns['is_suspicious'] == 0].sample(n=min(1400, len(df_txns)), random_state=42)
    
    seeded_txns_df = pd.concat([suspicious_sample, high_val_sample, general_sample]).drop_duplicates(subset=['transaction_id']).reset_index(drop=True)
    print(f"Selected {len(seeded_txns_df):,} representative transactions to seed into database.")

    # Collect all counterparties present in these transactions
    senders = set(seeded_txns_df['sender_account'].astype(str))
    receivers = set(seeded_txns_df['receiver_account'].astype(str))
    all_account_ids = senders.union(receivers)

    # 1. Seed Accounts
    print(f"Seeding {len(df_profiles)} primary accounts and {len(all_account_ids)} total graph entities...")
    
    # Map profiles by account_id
    profile_map = {r['account_id']: r for _, r in df_profiles.iterrows()}

    for acc_id in all_account_ids:
        if acc_id in profile_map:
            p = profile_map[acc_id]
            c_name = str(p.get('customer_name', 'Unknown'))
            raw_status = str(p.get('status', 'Active'))
            if 'freeze' in raw_status.lower() or 'dormant' in raw_status.lower():
                status = 'Frozen'
                is_mule = 1
                risk_level = 'CRITICAL'
                risk_score = 0.98
            elif 'closed' in raw_status.lower():
                status = 'Closed'
                is_mule = 1
                risk_level = 'CRITICAL'
                risk_score = 0.95
            elif float(p.get('turnover_ratio', 1.0)) >= 0.95:
                status = 'Active'
                is_mule = 1 if float(p.get('turnover_ratio', 1.0)) >= 0.98 else 0
                risk_level = 'HIGH'
                risk_score = round(min(0.92, float(p.get('turnover_ratio', 1.0)) * 0.9), 2)
            else:
                status = 'Active'
                is_mule = 0
                risk_level = 'LOW'
                risk_score = 0.15

            in_deg = int(p.get('in_degree', 50))
            out_deg = int(p.get('out_degree', 50))
            tot_in = float(p.get('total_credit_inr', 100000.0))
            tot_out = float(p.get('total_debit_inr', 100000.0))
            turnover = float(p.get('turnover_ratio', 1.0))
            flags = json.dumps(["CBS_CONDUIT_ACCOUNT", f"TURNOVER_{int(turnover*100)}PCT"] + (["CORE_BANKING_TOTAL_FREEZE"] if status == 'Frozen' else []))
        else:
            # Counterparty entity
            c_name = f"Counterparty {acc_id[:8]}"
            status = 'Active'
            is_mule = 0
            risk_level = 'LOW'
            risk_score = 0.08
            in_deg = 5
            out_deg = 5
            tot_in = 25000.0
            tot_out = 25000.0
            turnover = 1.0
            flags = json.dumps(["COUNTERPARTY_PEER"])

        c.execute("""
            INSERT OR REPLACE INTO accounts (
                account_id, customer_name, account_type, created_at, initial_balance, current_balance,
                status, risk_score, risk_level, prediction_confidence, is_ground_truth_mule,
                total_incoming, total_outgoing, in_degree, out_degree, unique_counterparties,
                avg_txn_interval_hours, turnover_ratio, flags_json, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            acc_id,
            c_name,
            'Current' if 'conduit' in flags.lower() or 'ACC_SOA' in acc_id else 'Savings',
            datetime.now().isoformat(),
            50000.0,
            round(max(0.0, tot_in - tot_out), 2),
            status,
            risk_score,
            risk_level,
            0.94 if is_mule else 0.88,
            is_mule,
            tot_in,
            tot_out,
            in_deg,
            out_deg,
            in_deg + out_deg,
            1.2,
            turnover,
            flags,
            f"Seeded from Proposed CBS Statement Dataset ({status})"
        ))

    # 2. Seed Transactions
    print(f"Seeding {len(seeded_txns_df)} transactions...")
    for _, r in seeded_txns_df.iterrows():
        c.execute("""
            INSERT OR REPLACE INTO transactions (
                transaction_id, sender_account, receiver_account, amount, timestamp,
                status, transaction_type, description, is_suspicious, flag_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(r['transaction_id']),
            str(r['sender_account']),
            str(r['receiver_account']),
            float(r['amount']),
            str(r['timestamp']),
            str(r['status']),
            str(r['transaction_type']),
            f"Transfer via {r['transaction_type']} [Ref: {str(r['transaction_id'])[:16]}]",
            int(r['is_suspicious']),
            str(r['flag_reason'])
        ))

    # 3. Seed Alerts
    print("Seeding high-priority AML alerts for proposed conduits...")
    alerts = [
        ("ALT-PROP-001", "ACCOUNT", "ACC_SOA_03", "CRITICAL", "CORE_BANKING_TOTAL_FREEZE", "New", "INV-7809-DELHI", "Dormant & Total Freeze in Core Banking (Rohan kumar sah) - Funneled ₹8.67 Cr before regulatory action.", datetime.now().isoformat(), datetime.now().isoformat()),
        ("ALT-PROP-002", "ACCOUNT", "ACC_SOA_02", "CRITICAL", "ABRUPT_ACCOUNT_CLOSURE", "New", "INV-7809-DELHI", "Abrupt Account Closure (Kabir Arora) - Drained ₹10.91 Cr across 11,109 transactions prior to account shutdown.", datetime.now().isoformat(), datetime.now().isoformat()),
        ("ALT-PROP-003", "ACCOUNT", "ACC_SOA_48", "HIGH", "HIGH_VELOCITY_CONDUIT", "In Review", "INV-7809-DELHI", "Massive pass-through conduit (Rachana Dhar) - ₹55.09 Cr turnover with 98.7% rapid drain ratio.", datetime.now().isoformat(), datetime.now().isoformat()),
        ("ALT-PROP-004", "ACCOUNT", "ACC_SOA_28", "HIGH", "HIGH_VELOCITY_CONDUIT", "New", None, "Conduit account (Chaaya Iyer) - ₹42.14 Cr incoming credits drained immediately across 11,446 counterparties.", datetime.now().isoformat(), datetime.now().isoformat()),
        ("ALT-PROP-005", "ACCOUNT", "ACC_SOA_06", "HIGH", "ZERO_RESIDUAL_DRAIN", "New", None, "100.0% turnover conduit (Jack Patil) - Exactly ₹32.57 Cr in / ₹32.57 Cr out leaving zero residual balance.", datetime.now().isoformat(), datetime.now().isoformat()),
        ("ALT-PROP-006", "TRANSACTION", "TXN_SOA_03_HIGH_01", "CRITICAL", "LARGE_VALUE_SUSPICIOUS", "New", "INV-7809-DELHI", "High-value suspicious RTGS transfer exceeding statutory reporting threshold under PMLA Section 12.", datetime.now().isoformat(), datetime.now().isoformat())
    ]

    for alt in alerts:
        c.execute("""
            INSERT OR REPLACE INTO alerts (
                alert_id, target_type, target_id, severity, reason_code, status, assigned_to, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, alt)

    # 4. Seed Active Investigation Case
    print("Seeding active investigation case...")
    c.execute("""
        INSERT OR REPLACE INTO cases (
            case_id, title, priority, assigned_investigator, status, primary_account_id,
            created_at, updated_at, summary, findings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "CASE-2026-MULE-SOA",
        "Syndicate Multi-Hop Conduit & Frozen Mule Ring (ACC_SOA_03 & Conduits)",
        "CRITICAL",
        "INV-7809-DELHI",
        "IN_PROGRESS",
        "ACC_SOA_03",
        datetime.now().isoformat(),
        datetime.now().isoformat(),
        "Deep financial crime investigation into 25 interconnected Core Banking Statement accounts demonstrating high-velocity pass-through conduit behavior and regulatory total freezes.",
        "Ground truth confirmation: ACC_SOA_03 (Rohan kumar sah) verified as 'Dormant & Total Freeze'. 21 connected accounts exhibit rapid turnover ratios >= 0.98 funneled via UPI/IMPS across 254,617 unique counterparties."
    ))

    # 5. Seed Notification
    c.execute("""
        INSERT OR REPLACE INTO notifications (
            id, title, message, type, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (
        "NOTIF-PROP-001",
        "Proposed Banking Dataset Ingested",
        "Standardized 494,262 transactions (₹785.36 Cr volume) from 25 CBS statement accounts. High-risk conduits flagged for review.",
        "WARNING",
        0,
        datetime.now().isoformat()
    ))

    conn.commit()
    conn.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_proposed_data()
