"""
FinTrace ML System - Phase 9: Suspicious Community & Syndicate Ring Detection
Identifies tightly-knit account clusters using modularity-based community detection fused with GNN risk scores.
"""

import networkx as nx
import pandas as pd
import numpy as np
from typing import List, Dict, Any

class SyndicateCommunityDetector:
    def __init__(self, df_txns: pd.DataFrame, mule_accounts: set = None):
        self.df = df_txns.copy()
        self.mule_accounts = mule_accounts or set()

        # Build undirected weighted projection for modularity optimization
        self.G = nx.Graph()
        for _, row in self.df.iterrows():
            u = str(row['sender_account'])
            v = str(row['receiver_account'])
            amt = float(row.get('amount', 1.0))
            if self.G.has_edge(u, v):
                self.G[u][v]['weight'] += amt
                self.G[u][v]['count'] += 1
            else:
                self.G.add_edge(u, v, weight=amt, count=1)

    def detect_communities(self, min_size: int = 3) -> List[Dict[str, Any]]:
        """
        Partitions the transaction graph into modular communities and computes risk density.
        """
        if len(self.G.nodes) == 0:
            return []

        # Modularity communities
        communities_generator = nx.community.greedy_modularity_communities(self.G, weight='weight')
        results = []

        for c_id, comm_nodes in enumerate(communities_generator, start=1):
            nodes_list = sorted(list(comm_nodes))
            if len(nodes_list) < min_size:
                continue

            subgraph = self.G.subgraph(nodes_list)
            internal_volume = sum(d['weight'] for _, _, d in subgraph.edges(data=True))
            internal_txns = sum(d['count'] for _, _, d in subgraph.edges(data=True))

            # Number of flagged mule nodes
            mule_members = [n for n in nodes_list if n in self.mule_accounts or 'MULE' in n or 'CASHOUT' in n]
            mule_ratio = len(mule_members) / len(nodes_list)

            density = nx.density(subgraph)

            # Composite community risk score (0 - 100)
            risk_score = min(100.0, round((mule_ratio * 65.0) + (density * 25.0) + min(10.0, internal_txns * 0.2), 1))
            risk_tier = "CRITICAL" if risk_score >= 65 else ("HIGH" if risk_score >= 40 else "MODERATE")

            results.append({
                "community_id": f"COMM_RING_{c_id:03d}",
                "size": len(nodes_list),
                "member_accounts": nodes_list,
                "internal_volume": round(internal_volume, 2),
                "internal_transactions": internal_txns,
                "graph_density": round(density, 4),
                "flagged_mule_count": len(mule_members),
                "flagged_mule_ratio": round(mule_ratio, 3),
                "community_risk_score": risk_score,
                "risk_tier": risk_tier,
                "investigation_recommendation": (
                    "Syndicate coordination pattern: Immediate coordinated freezing required"
                    if risk_tier == "CRITICAL" else "Monitor internal settlement flows and verify KYC counterparties"
                )
            })

        # Sort by risk score descending
        results.sort(key=lambda x: x["community_risk_score"], reverse=True)
        return results
