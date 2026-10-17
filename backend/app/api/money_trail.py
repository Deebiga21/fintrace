from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.graph_service import GraphService
from ..models.account import Account

router = APIRouter(prefix="/money-trail", tags=["Money Trail"])

@router.get("/{account_id}")
def trace_money_trail(account_id: str, max_hops: int = Query(4, le=6), db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.account_id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    trail_data = GraphService.trace_money_trail(db, account_id, max_hops=max_hops)
    return trail_data
