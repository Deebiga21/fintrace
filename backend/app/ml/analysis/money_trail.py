"""
FinTrace ML System - Phase 8: Timestamp-Aware Money-Flow & Multi-Hop Risk Analysis
Traverses directed transaction graph to discover circular layering loops,
rapid pass-through conduits, and fan-in smurfing aggregation paths.
"""

import networkx as nx
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Optional

class MoneyFlowAnalyzer:
    def __init__(self, df_txns: pd.DataFrame):
        self.df = df_txns.copy()
        if 'timestamp' in self.df.columns:
            self.df['dt'] = pd.to_datetime(self.df['timestamp'], errors='coerce')
        else:
            self.df['dt'] = pd.Timestamp.now()
        self.df = self.df.sort_values('dt').reset_index(drop=True)

        # Build directed NetworkX graph
        self.G = nx.DiGraph()
        for _, row in self.df.iterrows():
            src = str(row['sender_account'])
            dst = str(row['receiver_account'])
            amt = float(row['amount'])
            dt = row['dt']
            txn_id = str(row['transaction_id'])
            is_mule = bool(row.get('is_ground_truth_mule', False))

            self.G.add_edge(
                src, dst,
                amount=amt,
                timestamp=dt,
                transaction_id=txn_id,
                is_mule=is_mule
            )

    def trace_forward(self, start_account: str, max_hops: int = 5) -> List[Dict[str, Any]]:
        """
        Traces downstream disbursement paths from a source account up to max_hops.
        """
        paths = []
        if start_account not in self.G:
            return paths

        def dfs(current: str, current_path: List[Dict[str, Any]], visited: set, depth: int):
            if depth >= max_hops:
                return
            
            for nxt in self.G.successors(current):
                edge_data = self.G.get_edge_data(current, nxt)
                step = {
                    "from_account": current,
                    "to_account": nxt,
                    "amount": edge_data["amount"],
                    "timestamp": edge_data["timestamp"].isoformat() if hasattr(edge_data["timestamp"], "isoformat") else str(edge_data["timestamp"]),
                    "transaction_id": edge_data["transaction_id"],
                    "is_mule_flagged": edge_data.get("is_mule", False),
                    "hop": depth + 1
                }
                new_path = current_path + [step]
                paths.append(new_path)

                if nxt not in visited:
                    visited.add(nxt)
                    dfs(nxt, new_path, visited, depth + 1)
                    visited.remove(nxt)

        dfs(start_account, [], {start_account}, 0)
        return paths

    def detect_circular_loops(self, max_length: int = 5, limit: int = 30) -> List[Dict[str, Any]]:
        """
        Detects circular layering loops (A -> B -> C -> A) using bounded directed cycle detection.
        """
        import itertools
        cycles = []
        try:
            # Bounded cycle generator to prevent exponential traversal
            cycle_gen = nx.simple_cycles(self.G, length_bound=max_length)
            for cycle in itertools.islice(cycle_gen, limit):
                if 2 <= len(cycle) <= max_length:
                    # Calculate loop volume
                    loop_txns = []
                    total_vol = 0.0
                    for i in range(len(cycle)):
                        u = cycle[i]
                        v = cycle[(i + 1) % len(cycle)]
                        if self.G.has_edge(u, v):
                            e = self.G.get_edge_data(u, v)
                            loop_txns.append({
                                "step": i + 1,
                                "sender": u,
                                "receiver": v,
                                "amount": e["amount"],
                                "timestamp": e["timestamp"].isoformat() if hasattr(e["timestamp"], "isoformat") else str(e["timestamp"])
                            })
                            total_vol += e["amount"]

                    cycles.append({
                        "pattern_type": "CIRCULAR_LAYERING_LOOP",
                        "cycle_length": len(cycle),
                        "cycle_accounts": cycle + [cycle[0]],
                        "total_loop_volume": round(total_vol, 2),
                        "hop_sequence": loop_txns,
                        "risk_level": "CRITICAL",
                        "typology": "Cycle Concealment / Round-Tripping"
                    })
        except Exception as e:
            pass
        return cycles

    def detect_rapid_conduits(self, max_delay_minutes: int = 60, min_drain_ratio: float = 0.85) -> List[Dict[str, Any]]:
        """
        Detects rapid pass-through conduit accounts (Inflow followed immediately by >85% Outflow within max_delay_minutes).
        """
        conduits = []
        for node in self.G.nodes():
            in_edges = list(self.G.in_edges(node, data=True))
            out_edges = list(self.G.out_edges(node, data=True))

            if not in_edges or not out_edges:
                continue

            for _, _, in_data in in_edges:
                in_time = in_data["timestamp"]
                in_amt = in_data["amount"]

                for _, dst, out_data in out_edges:
                    out_time = out_data["timestamp"]
                    out_amt = out_data["amount"]

                    if out_time > in_time:
                        delta = (out_time - in_time).total_seconds() / 60.0
                        if 0 <= delta <= max_delay_minutes:
                            drain_ratio = out_amt / max(1.0, in_amt)
                            if drain_ratio >= min_drain_ratio:
                                conduits.append({
                                    "pattern_type": "RAPID_PASS_THROUGH_CONDUIT",
                                    "conduit_account": node,
                                    "funder_account": in_data["transaction_id"],
                                    "beneficiary_account": dst,
                                    "inflow_amount": in_amt,
                                    "outflow_amount": out_amt,
                                    "drain_ratio": round(min(1.0, drain_ratio) * 100, 1),
                                    "dwell_time_minutes": round(delta, 1),
                                    "risk_level": "HIGH",
                                    "typology": "Transit Mule Funnel"
                                })
        return conduits
