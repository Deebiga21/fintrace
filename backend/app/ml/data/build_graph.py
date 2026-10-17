"""
FinTrace ML System - Phase 3 (GNN): Directed Transaction Graph Construction
Builds PyG Data structures with engineered node/edge feature tensors and bidirectional ID mappings.
Preserves true directed transfer semantics (Sender -> Receiver) without label leakage.
"""

import os
import json
import logging
import torch
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List

try:
    from torch_geometric.data import Data
    PYG_AVAILABLE = True
except Exception:
    PYG_AVAILABLE = False
    class Data:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

logger = logging.getLogger("FinTrace.ML.BuildGraph")

class TransactionGraphBuilder:
    def __init__(self, artifacts_dir: str = None):
        if artifacts_dir is None:
            self.artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "artifacts")
        else:
            self.artifacts_dir = artifacts_dir
        os.makedirs(self.artifacts_dir, exist_ok=True)
        self.node_to_idx = {}
        self.idx_to_node = {}

    def build_from_dataframe(self, df: pd.DataFrame) -> Tuple[Any, Dict[str, Any]]:
        """
        Constructs a directed PyG Data graph from a transaction DataFrame.
        """
        df = df.copy()
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)
        
        # 1. Map nodes
        senders = df['sender_account'].astype(str).tolist()
        receivers = df['receiver_account'].astype(str).tolist()
        all_accounts = sorted(list(set(senders + receivers)))

        self.node_to_idx = {acc: i for i, acc in enumerate(all_accounts)}
        self.idx_to_node = {i: acc for i, acc in enumerate(all_accounts)}
        num_nodes = len(all_accounts)

        # 2. Directed Edges (src -> dst)
        src_indices = [self.node_to_idx[s] for s in senders]
        dst_indices = [self.node_to_idx[d] for d in receivers]
        edge_index = torch.tensor([src_indices, dst_indices], dtype=torch.long)

        # 3. Node Feature Engineering
        # Calculate in-degree, out-degree, inflow, outflow, drain ratio, counterparties
        inflows = np.zeros(num_nodes, dtype=np.float32)
        outflows = np.zeros(num_nodes, dtype=np.float32)
        in_counts = np.zeros(num_nodes, dtype=np.float32)
        out_counts = np.zeros(num_nodes, dtype=np.float32)
        counterparties = {i: set() for i in range(num_nodes)}
        max_amts = np.zeros(num_nodes, dtype=np.float32)

        amounts = df['amount'].values.astype(np.float32)
        for s_idx, d_idx, amt in zip(src_indices, dst_indices, amounts):
            outflows[s_idx] += amt
            inflows[d_idx] += amt
            out_counts[s_idx] += 1.0
            in_counts[d_idx] += 1.0
            counterparties[s_idx].add(d_idx)
            counterparties[d_idx].add(s_idx)
            max_amts[s_idx] = max(max_amts[s_idx], amt)
            max_amts[d_idx] = max(max_amts[d_idx], amt)

        unique_cp = np.array([len(counterparties[i]) for i in range(num_nodes)], dtype=np.float32)
        total_txns = in_counts + out_counts
        avg_amts = np.where(total_txns > 0, (inflows + outflows) / np.maximum(1.0, total_txns), 0.0)

        # Turnover drain ratio: min(1.0, outflow / max(1.0, inflow))
        drain_ratios = np.where(inflows > 0, np.minimum(1.0, outflows / np.maximum(1.0, inflows)), 0.0)
        net_flows = inflows - outflows

        # Log transforms for scale invariance
        log_inflows = np.log1p(np.maximum(0, inflows))
        log_outflows = np.log1p(np.maximum(0, outflows))
        log_max_amts = np.log1p(np.maximum(0, max_amts))
        log_avg_amts = np.log1p(np.maximum(0, avg_amts))

        # 10-Dimensional Node Feature Tensor:
        # [log_inflow, log_outflow, in_count, out_count, unique_cp, log_avg_amt, log_max_amt, drain_ratio, net_flow_norm, total_txns]
        net_flow_norm = np.clip(net_flows / (np.abs(inflows) + np.abs(outflows) + 1.0), -1.0, 1.0)
        
        node_features = np.column_stack([
            log_inflows,
            log_outflows,
            in_counts,
            out_counts,
            unique_cp,
            log_avg_amts,
            log_max_amts,
            drain_ratios,
            net_flow_norm,
            total_txns
        ]).astype(np.float32)

        # Simple standard normalization across node features
        f_mean = np.mean(node_features, axis=0)
        f_std = np.std(node_features, axis=0)
        node_features = (node_features - f_mean) / np.where(f_std > 1e-6, f_std, 1.0)
        x = torch.tensor(node_features, dtype=torch.float32)

        # 4. Edge Features (Normalized amount, timestamp delta)
        log_edge_amts = np.log1p(amounts)
        norm_edge_amts = (log_edge_amts - np.mean(log_edge_amts)) / (np.std(log_edge_amts) + 1e-6)
        edge_attr = torch.tensor(norm_edge_amts[:, None], dtype=torch.float32)

        # 5. Account-level ground truth labels
        # An account is flagged as mule if it actively acts as a mule conduit / aggregator / loop node
        account_labels = np.zeros(num_nodes, dtype=np.int64)
        if 'is_ground_truth_mule' in df.columns:
            mule_txns = df[df['is_ground_truth_mule'] == True]
            # Flag sender of mule transaction as conduit/aggregator
            for s_acc in mule_txns['sender_account'].unique():
                if str(s_acc) in self.node_to_idx:
                    account_labels[self.node_to_idx[str(s_acc)]] = 1

        y = torch.tensor(account_labels, dtype=torch.long)
        edge_y = torch.tensor(df['is_ground_truth_mule'].values.astype(np.int64), dtype=torch.long) if 'is_ground_truth_mule' in df.columns else None

        # Build PyG Data object
        data = Data(
            x=x,
            edge_index=edge_index,
            edge_attr=edge_attr,
            y=y,
            edge_y=edge_y,
            num_nodes=num_nodes
        )

        metadata = {
            "num_nodes": num_nodes,
            "num_edges": edge_index.size(1),
            "node_feature_dim": x.size(1),
            "edge_feature_dim": edge_attr.size(1),
            "flagged_mule_accounts": int(np.sum(account_labels)),
            "legitimate_accounts": int(num_nodes - np.sum(account_labels)),
            "node_to_idx_path": "node_mapping.json"
        }

        # Save mapping
        mapping_path = os.path.join(self.artifacts_dir, "node_mapping.json")
        with open(mapping_path, "w") as f:
            json.dump({
                "node_to_idx": self.node_to_idx,
                "idx_to_node": {str(k): v for k, v in self.idx_to_node.items()}
            }, f, indent=2)

        logger.info(f"Graph built: {num_nodes} nodes, {edge_index.size(1)} directed edges.")
        return data, metadata

if __name__ == "__main__":
    csv_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "benchmark_transactions.csv"))
    df = pd.read_csv(csv_file)
    builder = TransactionGraphBuilder()
    data, meta = builder.build_from_dataframe(df)
    print(f"Graph constructed: {meta['num_nodes']} accounts, {meta['num_edges']} edges. Mule accounts: {meta['flagged_mule_accounts']}")
