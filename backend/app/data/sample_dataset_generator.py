import os
import csv
import random
from datetime import datetime, timedelta

def generate_sample_datasets():
    data_dir = os.path.dirname(__file__)
    os.makedirs(data_dir, exist_ok=True)
    
    txns_path = os.path.join(data_dir, "sample_transactions.csv")
    complaints_path = os.path.join(data_dir, "sample_complaints.csv")

    random.seed(42)
    base_time = datetime(2026, 10, 10, 9, 0, 0)

    transactions = []
    txn_id_counter = 10001

    # 1. Normal Accounts (50 accounts, legitimate activity)
    normal_accounts = [f"ACC_NORM_{i:03d}" for i in range(1, 45)]
    merchants = ["MERCHANT_AMAZON", "MERCHANT_FLIPKART", "MERCHANT_SWIGGY", "UTILITY_ELECTRICITY", "PAYROLL_TECHCORP"]

    # Payroll distribution to normal users
    for acc in normal_accounts:
        transactions.append({
            "transaction_id": f"TXN_{txn_id_counter}",
            "sender_account": "PAYROLL_TECHCORP",
            "receiver_account": acc,
            "amount": round(random.uniform(45000, 120000), 2),
            "timestamp": (base_time + timedelta(hours=random.randint(1, 12), minutes=random.randint(0, 59))).isoformat(),
            "status": "COMPLETED",
            "transaction_type": "NEFT",
            "description": "Monthly Salary Disbursement",
            "is_ground_truth_mule": False
        })
        txn_id_counter += 1

    # Everyday retail and peer-to-peer transfers
    for _ in range(120):
        src = random.choice(normal_accounts)
        dst = random.choice(merchants if random.random() < 0.6 else normal_accounts)
        if src != dst:
            t_offset = random.randint(12, 120)
            transactions.append({
                "transaction_id": f"TXN_{txn_id_counter}",
                "sender_account": src,
                "receiver_account": dst,
                "amount": round(random.uniform(150, 4500), 2),
                "timestamp": (base_time + timedelta(hours=t_offset, minutes=random.randint(0, 59))).isoformat(),
                "status": "COMPLETED",
                "transaction_type": random.choice(["UPI", "IMPS"]),
                "description": "Retail / Everyday Expense",
                "is_ground_truth_mule": False
            })
            txn_id_counter += 1

    # 2. FRAUD PATTERN 1: Fan-In Aggregator Mule Ring (Smurfing / Phishing Victims)
    # 6 victim accounts deposit money into MULE_AGG_01 within a 4-hour window
    victims_ring1 = [f"VICTIM_PHISH_{i:02d}" for i in range(1, 7)]
    mule_agg = "MULE_AGG_01"
    mule_layer = "MULE_LAYER_02"
    cashout_acc = "CASHOUT_CRYPTO_09"

    ring1_time = base_time + timedelta(days=2, hours=10)
    for i, vic in enumerate(victims_ring1):
        amt = round(random.uniform(48000, 75000), 2)
        transactions.append({
            "transaction_id": f"TXN_{txn_id_counter}",
            "sender_account": vic,
            "receiver_account": mule_agg,
            "amount": amt,
            "timestamp": (ring1_time + timedelta(minutes=i * 25)).isoformat(),
            "status": "COMPLETED",
            "transaction_type": "IMPS",
            "description": "Urgent Security Verification Transfer",
            "is_ground_truth_mule": False
        })
        txn_id_counter += 1

    # MULE_AGG_01 immediately forwards aggregate sum to MULE_LAYER_02 in 40 minutes (Rapid Movement + High Turnover)
    transactions.append({
        "transaction_id": f"TXN_{txn_id_counter}",
        "sender_account": mule_agg,
        "receiver_account": mule_layer,
        "amount": 340000.00,
        "timestamp": (ring1_time + timedelta(hours=3, minutes=15)).isoformat(),
        "status": "COMPLETED",
        "transaction_type": "RTGS",
        "description": "Consolidated Settlement Advance",
        "is_ground_truth_mule": True
    })
    txn_id_counter += 1

    # MULE_LAYER_02 forwards out to CASHOUT_CRYPTO_09
    transactions.append({
        "transaction_id": f"TXN_{txn_id_counter}",
        "sender_account": mule_layer,
        "receiver_account": cashout_acc,
        "amount": 335000.00,
        "timestamp": (ring1_time + timedelta(hours=4, minutes=10)).isoformat(),
        "status": "COMPLETED",
        "transaction_type": "WIRE",
        "description": "OTC Digital Asset Purchase",
        "is_ground_truth_mule": True
    })
    txn_id_counter += 1

    # 3. FRAUD PATTERN 2: Circular Money Transfer Loop (Layering)
    # CIRC_A -> CIRC_B -> CIRC_C -> CIRC_D -> CIRC_A
    circ_ring = ["CIRC_MULE_A", "CIRC_MULE_B", "CIRC_MULE_C", "CIRC_MULE_D"]
    circ_time = base_time + timedelta(days=3, hours=14)
    circ_amount = 185000.00

    for idx in range(len(circ_ring)):
        u = circ_ring[idx]
        v = circ_ring[(idx + 1) % len(circ_ring)]
        transactions.append({
            "transaction_id": f"TXN_{txn_id_counter}",
            "sender_account": u,
            "receiver_account": v,
            "amount": circ_amount - (idx * 1500),  # Slight haircut to simulate fee shaving
            "timestamp": (circ_time + timedelta(minutes=idx * 45)).isoformat(),
            "status": "COMPLETED",
            "transaction_type": "IMPS",
            "description": "Inter-account Treasury Transfer",
            "is_ground_truth_mule": True
        })
        txn_id_counter += 1

    # 4. FRAUD PATTERN 3: High-Velocity Rapid Pass-Through Conduit
    # High-value inbound credit drained in 15 minutes
    rapid_mule = "RAPID_CONDUIT_77"
    rapid_source = "VICTIM_CORP_HEIST"
    rapid_time = base_time + timedelta(days=4, hours=11, minutes=20)

    transactions.append({
        "transaction_id": f"TXN_{txn_id_counter}",
        "sender_account": rapid_source,
        "receiver_account": rapid_mule,
        "amount": 490000.00,
        "timestamp": rapid_time.isoformat(),
        "status": "COMPLETED",
        "transaction_type": "RTGS",
        "description": "Invoice Settlement Inv-8891",
        "is_ground_truth_mule": False
    })
    txn_id_counter += 1

    # 3 quick splits sent out within 18 minutes
    for sub_idx, sub_dest in enumerate(["OFFSHORE_SHELL_X1", "OFFSHORE_SHELL_X2", "OFFSHORE_SHELL_X3"]):
        transactions.append({
            "transaction_id": f"TXN_{txn_id_counter}",
            "sender_account": rapid_mule,
            "receiver_account": sub_dest,
            "amount": 160000.00,
            "timestamp": (rapid_time + timedelta(minutes=6 + (sub_idx * 4))).isoformat(),
            "status": "COMPLETED",
            "transaction_type": "IMPS",
            "description": "Urgent Consulting Retainer",
            "is_ground_truth_mule": True
        })
        txn_id_counter += 1

    # 5. FRAUD PATTERN 4: Smurfing Dispersion (One account distributes to multiple mule sub-nodes)
    disp_mule = "DISP_SMURF_88"
    disp_subs = [f"MULE_SUB_{k:02d}" for k in range(1, 6)]
    disp_time = base_time + timedelta(days=5, hours=9)

    transactions.append({
        "transaction_id": f"TXN_{txn_id_counter}",
        "sender_account": "UNIDENTIFIED_ORIGIN_99",
        "receiver_account": disp_mule,
        "amount": 250000.00,
        "timestamp": disp_time.isoformat(),
        "status": "COMPLETED",
        "transaction_type": "RTGS",
        "description": "Contract Staging Escrow",
        "is_ground_truth_mule": True
    })
    txn_id_counter += 1

    for s_idx, s_acc in enumerate(disp_subs):
        transactions.append({
            "transaction_id": f"TXN_{txn_id_counter}",
            "sender_account": disp_mule,
            "receiver_account": s_acc,
            "amount": 48500.00,  # Below standard mandatory audit limit (50,000)
            "timestamp": (disp_time + timedelta(minutes=20 + (s_idx * 15))).isoformat(),
            "status": "COMPLETED",
            "transaction_type": "IMPS",
            "description": "Disbursement Stipend",
            "is_ground_truth_mule": True
        })
        txn_id_counter += 1

    # Write Transactions CSV
    fieldnames = [
        "transaction_id", "sender_account", "receiver_account",
        "amount", "timestamp", "status", "transaction_type",
        "description", "is_ground_truth_mule"
    ]
    with open(txns_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for t in transactions:
            writer.writerow(t)

    # 6. Sample Complaints CSV
    complaints = [
        {
            "complaint_id": "CMP-2026-8812",
            "date_reported": (base_time + timedelta(days=2, hours=14)).isoformat(),
            "complainant_name": "Ramesh Kumar Gupta",
            "description": "Victim received fraudulent call pretending to be Bank KYC Dept. Transferred Rs 65,000 under duress to account MULE_AGG_01.",
            "reported_account_id": "MULE_AGG_01",
            "transaction_id": "TXN_10165",
            "amount_lost": 65000.00,
            "status": "Linked",
            "source": "National Cyber Crime Reporting Portal (1930)"
        },
        {
            "complaint_id": "CMP-2026-8815",
            "date_reported": (base_time + timedelta(days=2, hours=15)).isoformat(),
            "complainant_name": "Ananya Sengupta",
            "description": "Part-time job task scam victim. Deputed funds to beneficiary account MULE_AGG_01 for purported crypto task commission.",
            "reported_account_id": "MULE_AGG_01",
            "transaction_id": "TXN_10166",
            "amount_lost": 72000.00,
            "status": "Linked",
            "source": "State Police Cyber Cell"
        },
        {
            "complaint_id": "CMP-2026-8902",
            "date_reported": (base_time + timedelta(days=4, hours=13)).isoformat(),
            "complainant_name": "Pinnacle Logistics Finance Desk",
            "description": "Unauthorized ERP access diverted payment invoice to conduit account RAPID_CONDUIT_77.",
            "reported_account_id": "RAPID_CONDUIT_77",
            "transaction_id": "TXN_10178",
            "amount_lost": 490000.00,
            "status": "Under_Investigation",
            "source": "Corporate Fraud Grievance Officer"
        },
        {
            "complaint_id": "CMP-2026-8944",
            "date_reported": (base_time + timedelta(days=3, hours=18)).isoformat(),
            "complainant_name": "Dr. Vikas Mehra",
            "description": "Digital arrest scam where imposter police coerced emergency bond deposit into account CIRC_MULE_A.",
            "reported_account_id": "CIRC_MULE_A",
            "transaction_id": "TXN_10174",
            "amount_lost": 185000.00,
            "status": "New",
            "source": "National Cyber Crime Reporting Portal (1930)"
        },
        {
            "complaint_id": "CMP-2026-9011",
            "date_reported": (base_time + timedelta(days=5, hours=11)).isoformat(),
            "complainant_name": "Kavita S. Rao",
            "description": "Phishing link SMS regarding electricity disconnection led to unauthorized netbanking debit routed to DISP_SMURF_88.",
            "reported_account_id": "DISP_SMURF_88",
            "transaction_id": "TXN_10183",
            "amount_lost": 250000.00,
            "status": "New",
            "source": "Bank Anti-Fraud Operations"
        }
    ]

    c_fields = [
        "complaint_id", "date_reported", "complainant_name",
        "description", "reported_account_id", "transaction_id",
        "amount_lost", "status", "source"
    ]
    with open(complaints_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=c_fields)
        writer.writeheader()
        for c in complaints:
            writer.writerow(c)

    print(f"Generated {len(transactions)} sample transactions at {txns_path}")
    print(f"Generated {len(complaints)} sample complaints at {complaints_path}")
    return txns_path, complaints_path

if __name__ == "__main__":
    generate_sample_datasets()
