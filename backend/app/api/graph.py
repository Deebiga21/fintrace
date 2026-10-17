from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import json

from ..database import get_db
from ..models.account import Account
from ..models.transaction import Transaction
from ..services.graph_service import GraphService

router = APIRouter(prefix="/graph", tags=["Graph Visualization"])

@router.get("/")
def get_graph_data(
    risk_level: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    limit_nodes: int = Query(150, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns nodes and edges formatted for Cytoscape.js.
    """
    acc_query = db.query(Account)
    if risk_level:
        acc_query = acc_query.filter(Account.risk_level == risk_level)
    
    accounts = acc_query.limit(limit_nodes).all()
    account_ids = set(a.account_id for a in accounts)

    nodes = []
    for a in accounts:
        flags = []
        if a.flags_json:
            try:
                flags = json.loads(a.flags_json)
            except Exception:
                flags = []
        nodes.append({
            "data": {
                "id": a.account_id,
                "label": a.account_id,
                "customer_name": a.customer_name or a.account_id,
                "risk_level": a.risk_level,
                "risk_score": a.risk_score,
                "account_type": a.account_type,
                "balance": a.current_balance,
                "incoming": a.total_incoming,
                "outgoing": a.total_outgoing,
                "flags": flags
            }
        })

    # Fetch directed edges connecting these accounts
    txn_query = db.query(Transaction).filter(
        Transaction.sender_account.in_(account_ids),
        Transaction.receiver_account.in_(account_ids),
        Transaction.status == "COMPLETED"
    )
    if min_amount is not None:
        txn_query = txn_query.filter(Transaction.amount >= min_amount)

    transactions = txn_query.limit(500).all()

    # Aggregate parallel edges for cleaner graph
    edge_map = {}
    for t in transactions:
        key = f"{t.sender_account}->{t.receiver_account}"
        if key in edge_map:
            edge_map[key]["weight"] += t.amount
            edge_map[key]["count"] += 1
            if t.is_suspicious:
                edge_map[key]["is_suspicious"] = True
        else:
            edge_map[key] = {
                "id": key,
                "source": t.sender_account,
                "target": t.receiver_account,
                "weight": t.amount,
                "count": 1,
                "timestamp": t.timestamp.isoformat(),
                "is_suspicious": t.is_suspicious,
                "type": t.transaction_type
            }

    edges = [{"data": v} for v in edge_map.values()]

    return {
        "nodes": nodes,
        "edges": edges,
        "statistics": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "high_risk_nodes": sum(1 for n in nodes if n["data"]["risk_level"] == "High"),
            "suspicious_edges": sum(1 for e in edges if e["data"]["is_suspicious"])
        }
    }

@router.get("/subgraph/{account_id}")
def get_account_subgraph(account_id: str, radius: int = Query(2, le=3), db: Session = Depends(get_db)):
    G = GraphService.build_networkx_graph(db)
    if not G.has_node(account_id):
        raise HTTPException(status_code=404, detail="Account not found in transaction network")
    subgraph_data = GraphService.get_ego_graph(G, account_id, radius=radius)
    return subgraph_data

@router.get("/cycles")
def get_circular_transfers(max_length: int = Query(6, le=10), db: Session = Depends(get_db)):
    G = GraphService.build_networkx_graph(db)
    cycles = GraphService.detect_circular_transfers(G, max_cycle_length=max_length)
    return {
        "total_cycles_detected": len(cycles),
        "cycles": cycles
    }
