from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.complaint import Complaint
from ..models.account import Account
from ..schemas.complaint import ComplaintCreate, ComplaintOut

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.get("/", response_model=List[ComplaintOut])
def list_complaints(
    account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    if account_id:
        query = query.filter(Complaint.reported_account_id == account_id)
    if status:
        query = query.filter(Complaint.status == status)
    if search:
        query = query.filter(
            (Complaint.complaint_id.ilike(f"%{search}%")) |
            (Complaint.complainant_name.ilike(f"%{search}%")) |
            (Complaint.description.ilike(f"%{search}%")) |
            (Complaint.reported_account_id.ilike(f"%{search}%"))
        )
    return query.order_by(Complaint.date_reported.desc()).limit(limit).all()

@router.post("/", response_model=ComplaintOut)
def create_complaint(data: ComplaintCreate, db: Session = Depends(get_db)):
    # Verify or create account record
    acc = db.query(Account).filter(Account.account_id == data.reported_account_id).first()
    if not acc:
        acc = Account(
            account_id=data.reported_account_id,
            customer_name=f"Entity {data.reported_account_id}",
            account_type="Mule_Suspect",
            current_balance=0.0
        )
        db.add(acc)
        db.commit()

    cmp = Complaint(
        complaint_id=data.complaint_id,
        date_reported=data.date_reported or datetime.utcnow(),
        complainant_name=data.complainant_name,
        description=data.description,
        reported_account_id=data.reported_account_id,
        transaction_id=data.transaction_id,
        amount_lost=data.amount_lost,
        status=data.status or "New",
        source=data.source or "National Cyber Crime Reporting Portal"
    )
    db.add(cmp)
    db.commit()
    db.refresh(cmp)
    return cmp

@router.get("/by-account/{account_id}", response_model=List[ComplaintOut])
def get_complaints_for_account(account_id: str, db: Session = Depends(get_db)):
    return db.query(Complaint).filter(Complaint.reported_account_id == account_id).all()
