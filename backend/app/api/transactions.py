from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.transaction import Transaction
from ..schemas.transaction import TransactionOut
from ..services.ingestion_service import IngestionService

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("/upload")
async def upload_transactions_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    content = await file.read()
    try:
        result = IngestionService.validate_and_ingest_transactions_csv(db, content, filename=file.filename)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/load-sample")
def load_sample_dataset(db: Session = Depends(get_db)):
    try:
        result = IngestionService.load_bundled_sample_data(db)
        return {
            "status": "success",
            "message": "Sample synthetic transaction and complaint dataset loaded successfully.",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load sample data: {str(e)}")

@router.get("/", response_model=List[TransactionOut])
def list_transactions(
    account_id: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    is_suspicious: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    skip: int = Query(0),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    if account_id:
        query = query.filter((Transaction.sender_account == account_id) | (Transaction.receiver_account == account_id))
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)
    if is_suspicious is not None:
        query = query.filter(Transaction.is_suspicious == is_suspicious)
    if search:
        query = query.filter(
            (Transaction.transaction_id.ilike(f"%{search}%")) |
            (Transaction.sender_account.ilike(f"%{search}%")) |
            (Transaction.receiver_account.ilike(f"%{search}%")) |
            (Transaction.description.ilike(f"%{search}%"))
        )

    return query.order_by(Transaction.timestamp.desc()).offset(skip).limit(limit).all()

@router.get("/{txn_id}", response_model=TransactionOut)
def get_transaction(txn_id: str, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.transaction_id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn
