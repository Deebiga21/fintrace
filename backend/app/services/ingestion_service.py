import os
import io
import csv
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from ..models.account import Account
from ..models.transaction import Transaction
from ..models.complaint import Complaint
from ..models.audit import AuditLog
from .suspicious_rules_service import SuspiciousRulesService
from .gnn_service import GNNService

class IngestionService:
    REQUIRED_COLUMNS = {"transaction_id", "sender_account", "receiver_account", "amount", "timestamp"}

    @staticmethod
    def validate_and_ingest_transactions_csv(
        db: Session,
        csv_file_content: bytes,
        filename: str = "upload.csv"
    ) -> Dict[str, Any]:
        """
        Parses CSV, validates schema and rows, skips duplicates, creates accounts,
        and saves valid transactions to SQLite/PostgreSQL database.
        """
        try:
            df = pd.read_csv(io.BytesIO(csv_file_content))
        except Exception as e:
            raise ValueError(f"Failed to parse CSV file: {str(e)}")

        # Normalize column names
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        missing_cols = IngestionService.REQUIRED_COLUMNS - set(df.columns)
        if missing_cols:
            raise ValueError(f"Missing required CSV columns: {', '.join(missing_cols)}")

        total_records = len(df)
        valid_records = 0
        invalid_records = 0
        duplicate_records = 0
        errors = []

        existing_txn_ids = set(r[0] for r in db.query(Transaction.transaction_id).all())
        existing_account_ids = set(r[0] for r in db.query(Account.account_id).all())

        new_accounts: Dict[str, Account] = {}
        new_transactions: List[Transaction] = []

        def get_or_create_account(acc_id: str) -> Account:
            if acc_id in existing_account_ids:
                return db.query(Account).filter(Account.account_id == acc_id).first()

            if acc_id in new_accounts:
                return new_accounts[acc_id]
            
            # Create synthetic account representation
            acc = Account(
                account_id=acc_id,
                customer_name=f"Entity {acc_id}",
                account_type="Savings",
                current_balance=25000.0,
                initial_balance=25000.0,
                # A transaction's label describes that row; it is not an
                # account-level label. Keep account ground truth unknown.
                is_ground_truth_mule=None
            )
            new_accounts[acc_id] = acc
            return acc

        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                txn_id = str(row["transaction_id"]).strip()
                sender = str(row["sender_account"]).strip()
                receiver = str(row["receiver_account"]).strip()

                if not txn_id or not sender or not receiver or txn_id == "nan":
                    invalid_records += 1
                    errors.append(f"Row {row_num}: Blank ID, sender, or receiver account")
                    continue

                if sender == receiver:
                    invalid_records += 1
                    errors.append(f"Row {row_num}: Sender and receiver cannot be identical ({sender})")
                    continue

                # Check duplicate
                if txn_id in existing_txn_ids:
                    duplicate_records += 1
                    continue

                # Validate amount
                try:
                    amount = float(row["amount"])
                    if amount <= 0:
                        invalid_records += 1
                        errors.append(f"Row {row_num}: Invalid amount {amount}")
                        continue
                except Exception:
                    invalid_records += 1
                    errors.append(f"Row {row_num}: Non-numeric amount")
                    continue

                # Validate timestamp
                raw_time = str(row["timestamp"]).strip()
                try:
                    dt = pd.to_datetime(raw_time).to_pydatetime()
                except Exception:
                    dt = datetime.utcnow()

                status = str(row.get("status", "COMPLETED")).strip().upper()
                txn_type = str(row.get("transaction_type", "IMPS")).strip().upper()
                desc = str(row.get("description", "")) if pd.notna(row.get("description")) else "Electronic Funds Transfer"
                
                # Ensure sender and receiver exist
                get_or_create_account(sender)
                get_or_create_account(receiver)

                txn = Transaction(
                    transaction_id=txn_id,
                    sender_account=sender,
                    receiver_account=receiver,
                    amount=amount,
                    timestamp=dt,
                    status=status,
                    transaction_type=txn_type,
                    description=desc,
                    is_suspicious=False
                )
                new_transactions.append(txn)
                existing_txn_ids.add(txn_id)
                valid_records += 1

            except Exception as ex:
                invalid_records += 1
                errors.append(f"Row {row_num}: Parse exception - {str(ex)}")

        # Batch insert
        if new_accounts:
            db.bulk_save_objects(list(new_accounts.values()))
            db.commit()

        if new_transactions:
            db.bulk_save_objects(new_transactions)
            db.commit()

        # Audit Log
        audit = AuditLog(
            action="CSV_INGESTION",
            target_type="TRANSACTIONS",
            target_id=filename,
            details=f"Ingested {valid_records} transactions ({duplicate_records} duplicates, {invalid_records} invalid) from {filename}"
        )
        db.add(audit)
        db.commit()

        # Analyze patterns and update GNN risk inference
        SuspiciousRulesService.analyze_and_tag_patterns(db)
        GNNService.run_inference(db)

        return {
            "filename": filename,
            "total_records": total_records,
            "valid_records": valid_records,
            "invalid_records": invalid_records,
            "duplicate_records": duplicate_records,
            "new_accounts_created": len(new_accounts),
            "errors_sample": errors[:10]
        }

    @staticmethod
    def load_bundled_sample_data(db: Session) -> Dict[str, Any]:
        """
        Loads the pre-packaged synthetic transaction and complaint datasets into the database.
        """
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        txns_file = os.path.join(data_dir, "sample_transactions.csv")
        complaints_file = os.path.join(data_dir, "sample_complaints.csv")

        if not os.path.exists(txns_file) or not os.path.exists(complaints_file):
            from .sample_dataset_generator import generate_sample_datasets
            generate_sample_datasets()

        with open(txns_file, "rb") as f:
            txn_content = f.read()

        res = IngestionService.validate_and_ingest_transactions_csv(
            db, txn_content, filename="sample_transactions.csv"
        )

        # Ingest complaints
        c_df = pd.read_csv(complaints_file)
        new_complaints = 0
        existing_c_ids = set(r[0] for r in db.query(Complaint.complaint_id).all())

        for _, row in c_df.iterrows():
            c_id = str(row["complaint_id"]).strip()
            if c_id not in existing_c_ids:
                dt = pd.to_datetime(row["date_reported"]).to_pydatetime()
                cmp = Complaint(
                    complaint_id=c_id,
                    date_reported=dt,
                    complainant_name=str(row["complainant_name"]),
                    description=str(row["description"]),
                    reported_account_id=str(row["reported_account_id"]),
                    transaction_id=str(row["transaction_id"]) if pd.notna(row.get("transaction_id")) else None,
                    amount_lost=float(row["amount_lost"]),
                    status=str(row.get("status", "Linked")),
                    source=str(row.get("source", "National Cyber Crime Portal"))
                )
                db.add(cmp)
                existing_c_ids.add(c_id)
                new_complaints += 1

        db.commit()
        res["complaints_loaded"] = new_complaints
        return res
