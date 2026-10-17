import networkx as nx
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
from sqlalchemy.orm import Session
from ..models.account import Account
from ..models.transaction import Transaction

class GraphService:
    @staticmethod
    def build_networkx_graph(db: Session) -> nx.DiGraph:
        """
        Builds a directed multi-edge or weighted directed graph from transactions in DB.
        """
        G = nx.DiGraph()
        
        # Add all accounts as nodes
        accounts = db.query(Account).all()
        for acc in accounts:
            G.add_node(
                acc.account_id,
                label=acc.account_id,
                customer_name=acc.customer_name or acc.account_id,
                account_type=acc.account_type,
                risk_score=acc.risk_score or 0.0,
                risk_level=acc.risk_level or "Low",
                current_balance=acc.current_balance,
                total_incoming=acc.total_incoming,
                total_outgoing=acc.total_outgoing,
                is_ground_truth_mule=acc.is_ground_truth_mule
            )
            
        # Add transactions as directed edges
        transactions = db.query(Transaction).filter(Transaction.status == "COMPLETED").all()
        for txn in transactions:
            if not G.has_node(txn.sender_account):
                G.add_node(txn.sender_account, label=txn.sender_account, risk_level="Low", risk_score=0.0)
            if not G.has_node(txn.receiver_account):
                G.add_node(txn.receiver_account, label=txn.receiver_account, risk_level="Low", risk_score=0.0)
                
            # If edge already exists, aggregate weight and keep latest timestamp
            if G.has_edge(txn.sender_account, txn.receiver_account):
                edge_data = G[txn.sender_account][txn.receiver_account]
                edge_data["weight"] += txn.amount
                edge_data["count"] += 1
                edge_data["transactions"].append({
                    "id": txn.transaction_id,
                    "amount": txn.amount,
                    "timestamp": txn.timestamp.isoformat(),
                    "is_suspicious": txn.is_suspicious
                })
                if txn.is_suspicious:
                    edge_data["is_suspicious"] = True
            else:
                G.add_edge(
                    txn.sender_account,
                    txn.receiver_account,
                    weight=txn.amount,
                    count=1,
                    is_suspicious=txn.is_suspicious,
                    transactions=[{
                        "id": txn.transaction_id,
                        "amount": txn.amount,
                        "timestamp": txn.timestamp.isoformat(),
                        "is_suspicious": txn.is_suspicious
                    }]
                )
                
        return G

    @staticmethod
    def compute_graph_metrics(db: Session) -> Dict[str, Dict[str, float]]:
        """
        Calculates NetworkX structural features: PageRank, In/Out degree, betweenness centrality.
        """
        G = GraphService.build_networkx_graph(db)
        if len(G.nodes) == 0:
            return {}

        try:
            pageranks = nx.pagerank(G, alpha=0.85, max_iter=200)
        except Exception:
            pageranks = {node: 0.0 for node in G.nodes}

        try:
            betweenness = nx.betweenness_centrality(G, normalized=True)
        except Exception:
            betweenness = {node: 0.0 for node in G.nodes}

        metrics = {}
        for node in G.nodes:
            in_deg = G.in_degree(node)
            out_deg = G.out_degree(node)
            neighbors = set(G.predecessors(node)).union(set(G.successors(node)))
            metrics[node] = {
                "in_degree": in_deg,
                "out_degree": out_deg,
                "unique_counterparties": len(neighbors),
                "pagerank": float(pageranks.get(node, 0.0)),
                "betweenness": float(betweenness.get(node, 0.0))
            }
        return metrics

    @staticmethod
    def detect_circular_transfers(G: nx.DiGraph, max_cycle_length: int = 6) -> List[List[str]]:
        """
        Finds directed simple cycles representing layering money laundering loops.
        """
        try:
            cycles = list(nx.simple_cycles(G))
            # Filter cycles within reasonable length for money laundering loops
            valid_cycles = [c for c in cycles if 2 <= len(c) <= max_cycle_length]
            return valid_cycles
        except Exception:
            return []

    @staticmethod
    def get_ego_graph(G: nx.DiGraph, account_id: str, radius: int = 2) -> Dict[str, Any]:
        """
        Extracts sub-graph surrounding a target account up to `radius` hops for visual investigation.
        """
        if not G.has_node(account_id):
            return {"nodes": [], "edges": [], "root": account_id}

        # Ego graph in undirected view for neighborhood extraction
        undirected_G = G.to_undirected()
        try:
            sub_nodes = nx.single_source_shortest_path_length(undirected_G, account_id, cutoff=radius).keys()
        except Exception:
            sub_nodes = [account_id]

        subG = G.subgraph(sub_nodes)

        nodes = []
        for n in subG.nodes:
            data = G.nodes[n]
            nodes.append({
                "data": {
                    "id": str(n),
                    "label": str(n),
                    "customer_name": data.get("customer_name", n),
                    "account_type": data.get("account_type", "Standard"),
                    "risk_level": data.get("risk_level", "Low"),
                    "risk_score": float(data.get("risk_score", 0.0)),
                    "balance": float(data.get("current_balance", 0.0)),
                    "total_incoming": float(data.get("total_incoming", 0.0)),
                    "total_outgoing": float(data.get("total_outgoing", 0.0)),
                    "is_root": (n == account_id)
                }
            })

        edges = []
        for u, v, data in subG.edges(data=True):
            txns = data.get("transactions", [])
            latest_time = txns[-1]["timestamp"] if txns else ""
            edges.append({
                "data": {
                    "id": f"{u}->{v}",
                    "source": str(u),
                    "target": str(v),
                    "weight": float(data.get("weight", 0.0)),
                    "count": int(data.get("count", 1)),
                    "timestamp": latest_time,
                    "is_suspicious": bool(data.get("is_suspicious", False))
                }
            })

        return {"nodes": nodes, "edges": edges, "root": account_id}

    @staticmethod
    def trace_money_trail(db: Session, account_id: str, max_hops: int = 4) -> Dict[str, Any]:
        """
        Traces sequence of money movements backward (sources of funds) and forward (destinations).
        Returns ordered hop trails, timestamps, amounts, and layering patterns.
        """
        # Fetch all transactions involving this account or nearby
        forward_trails = []
        backward_trails = []

        # 1. Forward trail (outflow: account -> hop1 -> hop2 -> hop3)
        visited_forward = set([account_id])
        current_layer = [account_id]
        hops_forward_data = []

        for hop in range(1, max_hops + 1):
            if not current_layer:
                break
            txns = db.query(Transaction).filter(
                Transaction.sender_account.in_(current_layer),
                Transaction.status == "COMPLETED"
            ).order_by(Transaction.timestamp.asc()).all()

            next_layer = []
            for t in txns:
                hops_forward_data.append({
                    "hop": hop,
                    "direction": "OUTFLOW",
                    "sender": t.sender_account,
                    "receiver": t.receiver_account,
                    "amount": t.amount,
                    "timestamp": t.timestamp.isoformat(),
                    "transaction_id": t.transaction_id,
                    "type": t.transaction_type,
                    "is_suspicious": t.is_suspicious
                })
                if t.receiver_account not in visited_forward:
                    visited_forward.add(t.receiver_account)
                    next_layer.append(t.receiver_account)
            current_layer = next_layer[:15]  # limit breadth

        # 2. Backward trail (inflow: hop3 -> hop2 -> hop1 -> account)
        visited_back = set([account_id])
        current_layer = [account_id]
        hops_backward_data = []

        for hop in range(1, max_hops + 1):
            if not current_layer:
                break
            txns = db.query(Transaction).filter(
                Transaction.receiver_account.in_(current_layer),
                Transaction.status == "COMPLETED"
            ).order_by(Transaction.timestamp.desc()).all()

            next_layer = []
            for t in txns:
                hops_backward_data.append({
                    "hop": hop,
                    "direction": "INFLOW",
                    "sender": t.sender_account,
                    "receiver": t.receiver_account,
                    "amount": t.amount,
                    "timestamp": t.timestamp.isoformat(),
                    "transaction_id": t.transaction_id,
                    "type": t.transaction_type,
                    "is_suspicious": t.is_suspicious
                })
                if t.sender_account not in visited_back:
                    visited_back.add(t.sender_account)
                    next_layer.append(t.sender_account)
            current_layer = next_layer[:15]

        # Combine nodes for subgraph
        involved_accounts = list(visited_forward.union(visited_back))
        acc_objs = db.query(Account).filter(Account.account_id.in_(involved_accounts)).all()
        acc_map = {a.account_id: a for a in acc_objs}

        nodes = []
        for aid in involved_accounts:
            a = acc_map.get(aid)
            nodes.append({
                "data": {
                    "id": aid,
                    "label": aid,
                    "customer_name": a.customer_name if a else aid,
                    "risk_level": a.risk_level if a else "Low",
                    "risk_score": a.risk_score if a else 0.0,
                    "is_target": (aid == account_id),
                    "direction": "TARGET" if aid == account_id else ("OUTFLOW" if aid in visited_forward else "INFLOW")
                }
            })

        all_hop_txns = hops_backward_data + hops_forward_data
        edges = []
        seen_edges = set()
        for t in all_hop_txns:
            edge_key = f"{t['sender']}->{t['receiver']}"
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                edges.append({
                    "data": {
                        "id": edge_key,
                        "source": t["sender"],
                        "target": t["receiver"],
                        "amount": t["amount"],
                        "timestamp": t["timestamp"],
                        "is_suspicious": t["is_suspicious"]
                    }
                })

        return {
            "target_account": account_id,
            "forward_steps": hops_forward_data,
            "backward_steps": hops_backward_data,
            "graph": {"nodes": nodes, "edges": edges},
            "layering_analysis": {
                "total_inflow_nodes": len(visited_back) - 1,
                "total_outflow_nodes": len(visited_forward) - 1,
                "detected_layering_hops": max([t["hop"] for t in all_hop_txns], default=0),
                "is_potential_conduit": (len(hops_backward_data) > 0 and len(hops_forward_data) > 0)
            }
        }
