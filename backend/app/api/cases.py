from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.case import InvestigationCase, CaseEvidence
from ..schemas.case import CaseCreate, CaseUpdate, CaseOut, EvidenceCreate, EvidenceOut
from ..services.case_service import CaseService
from ..services.report_service import ReportService

router = APIRouter(prefix="/cases", tags=["Investigation Cases"])

def serialize_case(case: InvestigationCase, db: Session) -> dict:
    evidence = db.query(CaseEvidence).filter(CaseEvidence.case_id == case.case_id).all()
    return {
        "case_id": case.case_id,
        "title": case.title,
        "priority": case.priority,
        "assigned_investigator": case.assigned_investigator,
        "status": case.status,
        "primary_account_id": case.primary_account_id,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "summary": case.summary,
        "findings": case.findings,
        "evidence_items": [
            {
                "id": e.id,
                "case_id": e.case_id,
                "evidence_type": e.evidence_type,
                "reference_id": e.reference_id,
                "description": e.description,
                "metadata_json": e.metadata_json,
                "created_at": e.created_at
            } for e in evidence
        ]
    }

@router.get("/", response_model=List[CaseOut])
def list_cases(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(InvestigationCase)
    if status:
        query = query.filter(InvestigationCase.status == status)
    if priority:
        query = query.filter(InvestigationCase.priority == priority)
    if search:
        query = query.filter(
            (InvestigationCase.case_id.ilike(f"%{search}%")) |
            (InvestigationCase.title.ilike(f"%{search}%")) |
            (InvestigationCase.primary_account_id.ilike(f"%{search}%"))
        )
    cases = query.order_by(InvestigationCase.updated_at.desc()).all()
    return [serialize_case(c, db) for c in cases]

@router.post("/", response_model=CaseOut)
def create_case(data: CaseCreate, db: Session = Depends(get_db)):
    init_ev = [e.dict() for e in data.initial_evidence] if data.initial_evidence else []
    case = CaseService.create_case(
        db,
        title=data.title,
        priority=data.priority or "High",
        assigned_investigator=data.assigned_investigator or "Lead Financial Crime Specialist",
        primary_account_id=data.primary_account_id,
        summary=data.summary,
        findings=data.findings,
        initial_evidence=init_ev
    )
    return serialize_case(case, db)

@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return serialize_case(case, db)

@router.put("/{case_id}", response_model=CaseOut)
def update_case(case_id: str, data: CaseUpdate, db: Session = Depends(get_db)):
    case = CaseService.update_case(db, case_id, data.dict(exclude_unset=True))
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return serialize_case(case, db)

@router.post("/{case_id}/evidence", response_model=EvidenceOut)
def add_case_evidence(case_id: str, data: EvidenceCreate, db: Session = Depends(get_db)):
    try:
        ev = CaseService.add_evidence(
            db,
            case_id=case_id,
            evidence_type=data.evidence_type,
            reference_id=data.reference_id,
            description=data.description,
            metadata_json=data.metadata_json or "{}"
        )
        return ev
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{case_id}/dossier")
def get_case_dossier(case_id: str, db: Session = Depends(get_db)):
    try:
        return ReportService.generate_case_dossier(db, case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
