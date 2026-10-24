import json
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.account import Account
from ..schemas.account import AccountOut
from ..schemas.gnn import AccountRiskExplanation
from ..services.gnn_service import GNNService

router = APIRouter(prefix="/accounts", tags=["Accounts"])

def serialize_account(acc: Account) -> dict:
    flags = []
    if acc.flags_json:
        try:
            flags = json.loads(acc.flags_json)
        except Exception:
            flags = []
    return {
        "account_id": acc.account_id,
        "customer_name": acc.customer_name or acc.account_id,
        "account_type": acc.account_type,
        "initial_balance": acc.initial_balance,
        "current_balance": acc.current_balance,
        "status": acc.status,
        "risk_score": acc.risk_score,
        "risk_level": acc.risk_level,
        "prediction_confidence": acc.prediction_confidence,
        "is_ground_truth_mule": acc.is_ground_truth_mule,
        "total_incoming": acc.total_incoming,
        "total_outgoing": acc.total_outgoing,
        "in_degree": acc.in_degree,
        "out_degree": acc.out_degree,
        "unique_counterparties": acc.unique_counterparties,
        "avg_txn_interval_hours": acc.avg_txn_interval_hours,
        "turnover_ratio": acc.turnover_ratio,
        "flags": flags,
        "created_at": acc.created_at,
        "notes": acc.notes
    }

@router.get("", response_model=List[AccountOut])
@router.get("/", response_model=List[AccountOut], include_in_schema=False)
def list_accounts(
    risk_level: Optional[str] = Query(None),
    min_risk_score: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    account_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    skip: int = Query(0),
    db: Session = Depends(get_db)
):
    query = db.query(Account)
    if risk_level:
        query = query.filter(Account.risk_level == risk_level)
    if min_risk_score is not None:
        query = query.filter(Account.risk_score >= min_risk_score)
    if account_type:
        query = query.filter(Account.account_type == account_type)
    if search:
        query = query.filter(
            (Account.account_id.ilike(f"%{search}%")) |
            (Account.customer_name.ilike(f"%{search}%"))
        )

    # High risk first
    accounts = query.order_by(Account.risk_score.desc()).offset(skip).limit(limit).all()
    return [serialize_account(a) for a in accounts]

@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: str, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.account_id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    return serialize_account(acc)

@router.get("/{account_id}/explanation", response_model=AccountRiskExplanation)
def get_account_explanation(account_id: str, db: Session = Depends(get_db)):
    explanation = GNNService.get_risk_explanation(db, account_id)
    if not explanation:
        raise HTTPException(status_code=404, detail="Account not found")
    return explanation
