"""
FinTrace ML System - Benchmark Dataset Generator
Generates rich, multi-typology synthetic financial transaction networks for GNN & GAN benchmarking.
Explicitly labels simulated mule/fraud patterns for evaluation without claiming real-world status.
"""

import os
import random
import pandas as pd
from datetime import datetime, timedelta

def generate_benchmark_dataset(
    output_path: str = None,
    num_normal_accounts: int = 120,
    num_normal_txns: int = 1500,
    seed: int = 42
) -> str:
    if output_path is None:
        output_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "data", "benchmark_transactions.csv")
        )
    
    random.seed(seed)
    base_time = datetime(2026, 9, 1, 8, 0, 0)
    txns = []
    txn_id = 20000

    # 1. Normal Ecosystem
    normal_accounts = [f"ACC_NORM_{i:04d}" for i in range(1, num_normal_accounts + 1)]
    merchants = ["MERCHANT_AMAZON", "MERCHANT_FLIPKART", "MERCHANT_SWIGGY", "MERCHANT_ZOMATO", "UTILITY_POWER", "UTILITY_WATER"]
    corporates = ["CORP_TECH_PAYROLL", "CORP_FINANCE_SALARY", "CORP_RETAIL_WAGES"]

    # Salary credits (monthly cadence)
    for month in [0, 1]:
        pay_date = base_time + timedelta(days=month * 30 + 1)
        for acc in normal_accounts:
            txns.append({
                "transaction_id": f"TXN_{txn_id}",
                "sender_account": random.choice(corporates),
                "receiver_account": acc,
                "amount": round(random.uniform(35000, 140000), 2),
                "timestamp": (pay_date + timedelta(hours=random.randint(1, 14), minutes=random.randint(0, 59))).isoformat(),
                "status": "COMPLETED",
                "transaction_type": "NEFT",
                "description": "Monthly Salary Credit",
                "is_ground_truth_mule": False
            })
            txn_id += 1

    # Everyday retail and P2P transfers
    for _ in range(num_normal_txns):
        src = random.choice(normal_accounts)
        dst = random.choice(merchants if random.random() < 0.65 else normal_accounts)
        if src != dst:
            delta_days = random.randint(1, 90)
            delta_mins = random.randint(0, 1440)
            ttype = random.choice(["UPI", "IMPS", "POS", "NET_BANKING"])
            amt = round(random.uniform(50, 4800) if ttype in ["UPI", "POS"] else random.uniform(1500, 25000), 2)
            txns.append({
                "transaction_id": f"TXN_{txn_id}",
                "sender_account": src,
                "receiver_account": dst,
                "amount": amt,
                "timestamp": (base_time + timedelta(days=delta_days, minutes=delta_mins)).isoformat(),
                "status": "COMPLETED",
                "transaction_type": ttype,
                "description": "Retail Purchase / Peer Transfer",
                "is_ground_truth_mule": False
            })
            txn_id += 1

    # 2. FRAUD TYPOLOGY 1: Multi-Ring Fan-In Smurfing Aggregators across 90 days
    ring_days = [12, 28, 44, 62, 78, 86]
    for ring_idx, r_day in enumerate(ring_days, start=1):
        mule_agg = f"MULE_AGG_RING_{ring_idx:02d}"
        mule_layer = f"MULE_LAYER_RING_{ring_idx:02d}"
        victims = [f"VICTIM_RING{ring_idx}_{v:02d}" for v in range(1, 8)]
        ring_start = base_time + timedelta(days=r_day, hours=9)
        
        # Inflows to aggregator
        for i, vic in enumerate(victims):
            txns.append({
                "transaction_id": f"TXN_{txn_id}",
                "sender_account": vic,
                "receiver_account": mule_agg,
                "amount": round(random.uniform(42000, 89000), 2),
                "timestamp": (ring_start + timedelta(minutes=i * 20)).isoformat(),
                "status": "COMPLETED",
                "transaction_type": "IMPS",
                "description": "Urgent Authorization Advance",
                "is_ground_truth_mule": False
            })
            txn_id += 1
            
        # Outflow from aggregator to layer
        txns.append({
            "transaction_id": f"TXN_{txn_id}",
            "sender_account": mule_agg,
            "receiver_account": mule_layer,
            "amount": round(random.uniform(380000, 520000), 2),
            "timestamp": (ring_start + timedelta(hours=3, minutes=15)).isoformat(),
            "status": "COMPLETED",
            "transaction_type": "RTGS",
            "description": "Consolidated Batch Transfer",
            "is_ground_truth_mule": True
        })
        txn_id += 1

    # 3. FRAUD TYPOLOGY 2: Rapid Pass-Through Conduits across 90 days
    conduit_days = [18, 34, 52, 70, 84, 88]
    for c_idx, c_day in enumerate(conduit_days, start=1):
        conduit = f"MULE_CONDUIT_{c_idx:02d}"
        funder = f"SUSPECT_FUNDER_{c_idx:02d}"
        receiver = f"CASHOUT_SHELL_{c_idx:02d}"
        c_time = base_time + timedelta(days=c_day, hours=14)
        c_amt = round(random.uniform(180000, 490000), 2)
        
        # Rapid Inflow
        txns.append({
            "transaction_id": f"TXN_{txn_id}",
            "sender_account": funder,
            "receiver_account": conduit,
            "amount": c_amt,
            "timestamp": c_time.isoformat(),
            "status": "COMPLETED",
            "transaction_type": "NEFT",
            "description": "Settlement Credit",
            "is_ground_truth_mule": False
        })
        txn_id += 1

        # Immediate Outflow in 18 minutes (99% drained)
        txns.append({
            "transaction_id": f"TXN_{txn_id}",
            "sender_account": conduit,
            "receiver_account": receiver,
            "amount": round(c_amt * 0.992, 2),
            "timestamp": (c_time + timedelta(minutes=18)).isoformat(),
            "status": "COMPLETED",
            "transaction_type": "RTGS",
            "description": "Immediate Disbursal Settlement",
            "is_ground_truth_mule": True
        })
        txn_id += 1

    # 4. FRAUD TYPOLOGY 3: Circular Layering Loops across 90 days
    loop_days = [22, 48, 74, 87]
    for loop_idx, l_day in enumerate(loop_days, start=1):
        loop_nodes = [f"MULE_LOOP_{loop_idx}_{k}" for k in ["A", "B", "C", "D"]]
        l_time = base_time + timedelta(days=l_day, hours=11)
        l_amt = round(random.uniform(95000, 220000), 2)
        
        for step in range(len(loop_nodes)):
            s_node = loop_nodes[step]
            d_node = loop_nodes[(step + 1) % len(loop_nodes)]
            txns.append({
                "transaction_id": f"TXN_{txn_id}",
                "sender_account": s_node,
                "receiver_account": d_node,
                "amount": round(l_amt * (1.0 - step * 0.008), 2),
                "timestamp": (l_time + timedelta(hours=step * 2, minutes=15)).isoformat(),
                "status": "COMPLETED",
                "transaction_type": "IMPS",
                "description": f"Internal Trade Rebalance Step {step+1}",
                "is_ground_truth_mule": True
            })
            txn_id += 1

    df = pd.DataFrame(txns)
    # Sort chronologically
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)
    df['timestamp'] = df['timestamp'].dt.strftime('%Y-%m-%dT%H:%M:%S')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated benchmark dataset: {len(df)} transactions -> {output_path}")
    return output_path

if __name__ == "__main__":
    generate_benchmark_dataset()
