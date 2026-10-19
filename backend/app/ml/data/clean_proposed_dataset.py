"""
FinTrace AI - Automated Preprocessing & Cleaning Engine for Bank Statements (SOA)
Ingests, cleans, standardizes, and audits the 25 Statement of Account (SOA) banking files
from Proposed_Data_Randomized_Final archive.
"""

import os
import glob
import re
import json
import numpy as np
import pandas as pd
from datetime import datetime

def parse_date_value(val):
    if pd.isna(val) or val is None or str(val).strip() == '':
        return None
    val_str = str(val).strip()
    
    # Try %d%b%Y:%H:%M:%S (e.g. 14JUN2021:12:19:10)
    for fmt in ['%d%b%Y:%H:%M:%S', '%d%b%Y:%H:%M:%S.%f', '%d%b%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%d-%m-%Y', '%Y-%m-%d']:
        try:
            dt = datetime.strptime(val_str, fmt)
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        except ValueError:
            pass
            
    # Try Excel numeric serial date (e.g. 44921)
    try:
        num = float(val)
        if 20000 <= num <= 60000:
            dt = pd.to_datetime(num, unit='D', origin='1899-12-30')
            return dt.strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        pass

    # General pandas parse fallback
    try:
        dt = pd.to_datetime(val_str, dayfirst=True)
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        return None

def clean_proposed_dataset(input_dir: str, output_csv: str, report_json: str):
    files = sorted(glob.glob(os.path.join(input_dir, "*_SOA.*")))
    print(f"Found {len(files)} SOA files to preprocess in {input_dir}")

    all_txns = []
    file_summaries = []
    total_raw_rows = 0
    duplicate_rows_dropped = 0
    missing_dates_filled = 0

    for idx, fpath in enumerate(files):
        fname = os.path.basename(fpath)
        if fname.startswith("~$"):
            continue

        file_tag = fname.split("_")[0]
        print(f"[{idx+1}/{len(files)}] Processing {fname}...")
        try:
            df = pd.read_excel(fpath)
        except Exception as e:
            print(f"Error reading {fname}: {e}")
            continue

        raw_count = len(df)
        total_raw_rows += raw_count

        # Identify primary account ID and name
        primary_acc_id = f"ACC_SOA_{file_tag.zfill(2)}"
        primary_name = f"Entity_{file_tag}"
        account_status = "Active"

        name_cols = [c for c in df.columns if any(k in c.lower() for k in ['name', 'cust_id', 'customer'])]
        for nc in name_cols:
            vals = df[nc].dropna().unique()
            if len(vals) > 0:
                primary_name = str(vals[0])
                break

        status_cols = [c for c in df.columns if 'status' in c.lower()]
        for sc in status_cols:
            vals = df[sc].dropna().unique()
            if len(vals) > 0:
                account_status = str(vals[0])
                break

        # Standardize columns
        col_lower_map = {c.strip().lower(): c for c in df.columns}

        # Date column candidates
        date_col = None
        for candidate in ['pstd_dt', 'tran_date', 'txn date', 'date_of_transaction', 'transaction date']:
            if candidate in col_lower_map:
                date_col = col_lower_map[candidate]
                break

        # Narration / TXN ID candidates
        txn_id_col = None
        for candidate in ['tran_id', 'txn id', 'narration', 'txn particulars', 'ref number']:
            if candidate in col_lower_map:
                txn_id_col = col_lower_map[candidate]
                break

        # Counterparty account candidates
        counterparty_col = None
        for candidate in ['ac_no', 'account no', 'account_number']:
            if candidate in col_lower_map:
                counterparty_col = col_lower_map[candidate]
                break

        # Debit & Credit amounts
        dr_col = None
        for candidate in ['dr_amt', 'debit amount', 'debit_amount']:
            if candidate in col_lower_map:
                dr_col = col_lower_map[candidate]
                break

        cr_col = None
        for candidate in ['cr_amt', 'credit amount', 'credit_amount']:
            if candidate in col_lower_map:
                cr_col = col_lower_map[candidate]
                break

        single_amt_col = None
        if dr_col is None and cr_col is None:
            for candidate in ['amount']:
                if candidate in col_lower_map:
                    single_amt_col = col_lower_map[candidate]
                    break

        dr_cr_col = None
        for candidate in ['dr cr', 'txn typ', 'transaction_type']:
            if candidate in col_lower_map:
                dr_cr_col = col_lower_map[candidate]
                break

        balance_col = None
        for candidate in ['balance', 'eod balance', 'line_balance']:
            if candidate in col_lower_map:
                balance_col = col_lower_map[candidate]
                break

        # Iterate rows
        file_txns_count = 0
        total_dr_amt = 0.0
        total_cr_amt = 0.0

        for r_idx, row in df.iterrows():
            # Extract date
            raw_dt = row[date_col] if date_col else None
            clean_dt = parse_date_value(raw_dt)
            if not clean_dt:
                clean_dt = "2024-01-01 10:00:00"
                missing_dates_filled += 1

            # Determine Amount and Direction
            amount = 0.0
            direction = "DEBIT" # from primary to counterparty

            if dr_col and cr_col:
                dr_val = row[dr_col]
                cr_val = row[cr_col]
                dr_num = float(dr_val) if pd.notna(dr_val) and str(dr_val).strip() != '' else 0.0
                cr_num = float(cr_val) if pd.notna(cr_val) and str(cr_val).strip() != '' else 0.0

                if cr_num > 0.0:
                    amount = cr_num
                    direction = "CREDIT"
                    total_cr_amt += cr_num
                elif dr_num > 0.0:
                    amount = dr_num
                    direction = "DEBIT"
                    total_dr_amt += dr_num
            elif single_amt_col:
                amt_val = row[single_amt_col]
                amount = abs(float(amt_val)) if pd.notna(amt_val) else 0.0
                if dr_cr_col:
                    ind = str(row[dr_cr_col]).upper()
                    if 'CR' in ind or 'CREDIT' in ind:
                        direction = "CREDIT"
                        total_cr_amt += amount
                    else:
                        direction = "DEBIT"
                        total_dr_amt += amount

            if amount <= 0.01:
                continue

            # Counterparty
            cp_raw = str(row[counterparty_col]).strip() if counterparty_col and pd.notna(row[counterparty_col]) else f"CP_{file_tag}_{r_idx%50}"
            cp_id = re.sub(r'[^A-Za-z0-9_]', '', cp_raw)
            if not cp_id or cp_id == primary_acc_id:
                cp_id = f"CP_NODE_{file_tag}_{r_idx%50}"

            # Sender & Receiver
            if direction == "CREDIT":
                sender = cp_id
                receiver = primary_acc_id
            else:
                sender = primary_acc_id
                receiver = cp_id

            # TXN ID
            raw_tid = str(row[txn_id_col]).strip() if txn_id_col and pd.notna(row[txn_id_col]) else None
            if raw_tid and len(raw_tid) > 3 and not raw_tid.lower() in ['na', 'none', 'null', 'nan']:
                # Clean alphanumeric
                sanitized_tid = re.sub(r'[^A-Za-z0-9_-]', '', raw_tid)
                clean_tid = f"TXN_{file_tag}_{sanitized_tid}_{r_idx+1:06d}"
            else:
                clean_tid = f"TXN_{file_tag}_{r_idx+1:06d}"

            # Running balance
            bal = float(row[balance_col]) if balance_col and pd.notna(row[balance_col]) else 1000.0

            # Transaction type inference
            t_type = "UPI"
            if amount >= 200000.0:
                t_type = "RTGS"
            elif amount >= 50000.0:
                t_type = "NEFT"
            elif amount >= 10000.0:
                t_type = "IMPS"
            else:
                t_type = "UPI"

            # Suspicion flag
            is_suspicious = False
            flag_reason = "Normal Transaction"

            if "freeze" in account_status.lower() or "dormant" in account_status.lower():
                is_suspicious = True
                flag_reason = f"Account status flagged in core banking: {account_status}"
            elif amount >= 500000.0:
                is_suspicious = True
                flag_reason = "High volume transaction exceeding AML threshold"

            all_txns.append({
                "transaction_id": clean_tid,
                "sender_account": sender,
                "receiver_account": receiver,
                "amount": round(amount, 2),
                "timestamp": clean_dt,
                "status": "COMPLETED",
                "transaction_type": t_type,
                "running_balance": round(bal, 2),
                "primary_account": primary_acc_id,
                "customer_name": primary_name,
                "is_suspicious": 1 if is_suspicious else 0,
                "flag_reason": flag_reason or ""
            })
            file_txns_count += 1

        file_summaries.append({
            "file": fname,
            "account_id": primary_acc_id,
            "customer_name": primary_name,
            "status": account_status,
            "raw_rows": raw_count,
            "valid_transactions": file_txns_count,
            "total_debit_inr": round(total_dr_amt, 2),
            "total_credit_inr": round(total_cr_amt, 2),
            "turnover_ratio": round(total_dr_amt / (total_cr_amt + 1.0), 4)
        })

    # Combine into DataFrame
    out_df = pd.DataFrame(all_txns)
    
    # Drop duplicates on transaction_id
    initial_len = len(out_df)
    out_df = out_df.drop_duplicates(subset=["transaction_id", "sender_account", "receiver_account", "amount"])
    duplicate_rows_dropped = initial_len - len(out_df)

    # Sort chronologically
    out_df = out_df.sort_values(by="timestamp").reset_index(drop=True)

    # Save cleaned transactions CSV
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    out_df.to_csv(output_csv, index=False)
    print(f"\nSaved {len(out_df)} standardized transactions to {output_csv}")

    # Generate Account Profiles
    acc_profiles = []
    for s in file_summaries:
        acc_id = s["account_id"]
        acc_txns = out_df[(out_df["sender_account"] == acc_id) | (out_df["receiver_account"] == acc_id)]
        
        in_txns = acc_txns[acc_txns["receiver_account"] == acc_id]
        out_txns = acc_txns[acc_txns["sender_account"] == acc_id]
        
        in_deg = len(in_txns)
        out_deg = len(out_txns)
        total_in = float(in_txns["amount"].sum())
        total_out = float(out_txns["amount"].sum())
        
        cps = set(acc_txns["sender_account"]).union(set(acc_txns["receiver_account"])) - {acc_id}
        turnover = total_out / (total_in + 1e-5)
        
        risk_score = 0.1
        risk_level = "Low"
        flags = []
        
        if "freeze" in s["status"].lower():
            risk_score = 0.98
            risk_level = "High"
            flags.append("BANK_FROZEN_ACCOUNT")
        elif "closed" in s["status"].lower():
            risk_score = 0.82
            risk_level = "High"
            flags.append("ABRUPT_CLOSED_ACCOUNT")
            
        if turnover >= 0.95 and in_deg >= 10:
            risk_score = max(risk_score, 0.89)
            risk_level = "High"
            flags.append("RAPID_PASS_THROUGH_DRAIN")
            
        if in_deg >= 50 and out_deg <= 5:
            risk_score = max(risk_score, 0.86)
            risk_level = "High"
            flags.append("FAN_IN_AGGREGATOR")
            
        if risk_score < 0.40:
            risk_level = "Low"
        elif risk_score < 0.70:
            risk_level = "Medium"
        else:
            risk_level = "High"

        acc_profiles.append({
            "account_id": acc_id,
            "customer_name": s["customer_name"],
            "status": s["status"],
            "risk_score": round(risk_score, 3),
            "risk_level": risk_level,
            "in_degree": in_deg,
            "out_degree": out_deg,
            "total_incoming": round(total_in, 2),
            "total_outgoing": round(total_out, 2),
            "turnover_ratio": round(turnover, 4),
            "unique_counterparties": len(cps),
            "flags": flags
        })

    acc_df = pd.DataFrame(acc_profiles)
    acc_profiles_csv = os.path.join(os.path.dirname(output_csv), "proposed_account_profiles.csv")
    acc_df.to_csv(acc_profiles_csv, index=False)

    # Compilation Report
    quality_report = {
        "dataset_name": "Proposed_Data_Randomized_Final (25 Bank Statements of Account)",
        "source_archive": "Proposed_Data_Randomized_Final-20261019T113144Z-1-001.zip",
        "processed_at": datetime.now().isoformat(),
        "total_source_files": len(file_summaries),
        "total_raw_rows_parsed": total_raw_rows,
        "valid_transactions_standardized": len(out_df),
        "duplicates_removed": duplicate_rows_dropped,
        "missing_dates_reconstructed": missing_dates_filled,
        "total_financial_volume_inr": round(float(out_df["amount"].sum()), 2),
        "total_accounts_profiled": len(acc_profiles),
        "high_risk_mule_candidates": int((acc_df["risk_level"] == "High").sum()),
        "medium_risk_candidates": int((acc_df["risk_level"] == "Medium").sum()),
        "low_risk_accounts": int((acc_df["risk_level"] == "Low").sum()),
        "date_span": {
            "earliest_timestamp": str(out_df["timestamp"].min()),
            "latest_timestamp": str(out_df["timestamp"].max())
        },
        "file_details": file_summaries
    }

    with open(report_json, "w") as f:
        json.dump(quality_report, f, indent=2)

    print(f"Quality and preprocessing report saved to {report_json}")
    return quality_report

if __name__ == "__main__":
    cur_dir = os.path.dirname(os.path.abspath(__file__))
    input_dir = os.path.abspath(os.path.join(cur_dir, "..", "..", "data", "proposed_raw", "Proposed_Data_Randomized_Final"))
    output_csv = os.path.abspath(os.path.join(cur_dir, "..", "..", "data", "proposed_cleaned_transactions.csv"))
    report_json = os.path.abspath(os.path.join(cur_dir, "..", "artifacts", "proposed_data_cleaning_report.json"))
    clean_proposed_dataset(input_dir, output_csv, report_json)
