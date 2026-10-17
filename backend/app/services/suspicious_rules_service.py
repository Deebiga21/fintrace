from datetime import timedelta
import json
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from ..models.account import Account
from ..models.transaction import Transaction
from .graph_service import GraphService

class SuspiciousRulesService:
    @staticmethod
    def analyze_and_tag_patterns(db: Session) -> Dict[str, Any]:
        """
        Analyzes transaction flows and account behaviors, flags suspicious transactions,
        and annotates accounts with detected heuristic graph signals.
        """
        accounts = db.query(Account).all()
        transactions = db.query(Transaction).filter(Transaction.status == "COMPLETED").order_by(Transaction.timestamp.asc()).all()

        if not accounts or not transactions:
            return {"flagged_accounts": 0, "flagged_transactions": 0, "patterns_summary": {}}

        # Build NetworkX graph for cycle detection & neighbor inspection
        G = GraphService.build_networkx_graph(db)
        circular_cycles = GraphService.detect_circular_transfers(G, max_cycle_length=6)
        cycle_node_set = set()
        for cycle in circular_cycles:
            for node in cycle:
                cycle_node_set.add(node)

        # Pre-group transactions by sender and receiver
        txns_by_sender: Dict[str, List[Transaction]] = {}
        txns_by_receiver: Dict[str, List[Transaction]] = {}
        for txn in transactions:
            txns_by_sender.setdefault(txn.sender_account, []).append(txn)
            txns_by_receiver.setdefault(txn.receiver_account, []).append(txn)

        patterns_count = {
            "Rapid Fund Movement": 0,
            "Fan-In Fan-Out Mule Flow": 0,
            "Circular Money Transfer": 0,
            "High Frequency Burst": 0,
            "Aggregator Funneling": 0,
            "High Turnover Drain": 0
        }

        flagged_txns_count = 0
        flagged_accounts_count = 0

        for acc in accounts:
            account_id = acc.account_id
            in_txns = txns_by_receiver.get(account_id, [])
            out_txns = txns_by_sender.get(account_id, [])

            account_flags = []
            
            # 1. Circular Flow Detection
            if account_id in cycle_node_set:
                account_flags.append("Circular Money Transfer")
                patterns_count["Circular Money Transfer"] += 1

            # 2. Fan-In Fan-Out (Mule Pattern)
            unique_senders = set(t.sender_account for t in in_txns)
            unique_receivers = set(t.receiver_account for t in out_txns)
            
            if len(unique_senders) >= 3 and len(unique_receivers) >= 1:
                account_flags.append("Fan-In Fan-Out Mule Flow")
                patterns_count["Fan-In Fan-Out Mule Flow"] += 1

            # 3. Aggregator Funneling (Multiple senders targeting one receiver)
            if len(unique_senders) >= 4 and len(unique_receivers) <= 2:
                account_flags.append("Aggregator Funneling")
                patterns_count["Aggregator Funneling"] += 1

            # 4. Rapid Fund Movement (incoming funds forwarded within 2 hours)
            rapid_transfer_found = False
            for in_t in in_txns:
                for out_t in out_txns:
                    if out_t.timestamp >= in_t.timestamp:
                        diff = (out_t.timestamp - in_t.timestamp).total_seconds()
                        if 0 <= diff <= 7200:  # <= 2 hours
                            rapid_transfer_found = True
                            out_t.is_suspicious = True
                            out_t.flag_reason = "Rapid pass-through within 2 hours of incoming credit"
                            flagged_txns_count += 1
                            break
                if rapid_transfer_found:
                    break

            if rapid_transfer_found:
                account_flags.append("Rapid Fund Movement")
                patterns_count["Rapid Fund Movement"] += 1

            # 5. High Turnover Drain (> 90% of received money forwarded out)
            total_in = sum(t.amount for t in in_txns)
            total_out = sum(t.amount for t in out_txns)
            acc.total_incoming = total_in
            acc.total_outgoing = total_out
            acc.in_degree = len(in_txns)
            acc.out_degree = len(out_txns)
            acc.unique_counterparties = len(unique_senders.union(unique_receivers))

            if total_in > 5000 and total_out > 0:
                turnover = total_out / (total_in + 1e-5)
                acc.turnover_ratio = round(turnover, 3)
                if 0.85 <= turnover <= 1.15:
                    account_flags.append("High Turnover Drain")
                    patterns_count["High Turnover Drain"] += 1
            else:
                acc.turnover_ratio = round(total_out / (total_in + 1e-5), 3)

            # 6. High Frequency Burst (> 5 transactions within 24 hours)
            all_account_txns = sorted(in_txns + out_txns, key=lambda x: x.timestamp)
            if len(all_account_txns) >= 5:
                # check rolling window
                burst = False
                for i in range(len(all_account_txns) - 4):
                    t_start = all_account_txns[i].timestamp
                    t_end = all_account_txns[i + 4].timestamp
                    if (t_end - t_start).total_seconds() <= 86400:  # 24h
                        burst = True
                        break
                if burst:
                    account_flags.append("High Frequency Burst")
                    patterns_count["High Frequency Burst"] += 1

            # Update account flags in DB
            acc.flags_json = json.dumps(list(set(account_flags)))
            if account_flags:
                flagged_accounts_count += 1

        db.commit()

        return {
            "flagged_accounts": flagged_accounts_count,
            "flagged_transactions": flagged_txns_count,
            "patterns_summary": patterns_count,
            "circular_cycles_count": len(circular_cycles)
        }
