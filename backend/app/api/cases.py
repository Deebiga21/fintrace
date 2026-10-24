from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict

from ..database import get_db
from ..models.case import InvestigationCase, CaseEvidence
from ..models.audit import AuditLog
from ..schemas.case import (
    CaseCreate,
    CaseUpdate,
    CaseOut,
    EvidenceCreate,
    EvidenceOut,
    CaseSummaryOut,
    StatusUpdateRequest,
    PriorityUpdateRequest,
    AssigneeUpdateRequest,
    FindingsUpdateRequest,
    LinkAccountRequest,
    UnlinkAccountRequest,
    LinkTransactionRequest,
    UnlinkTransactionRequest,
    LinkComplaintRequest
)
from ..services.case_service import CaseService
from ..services.report_service import ReportService

router = APIRouter(prefix="/cases", tags=["Investigation Cases"])

@router.get("", response_model=List[CaseOut])
@router.get("/", response_model=List[CaseOut], include_in_schema=False)
def list_cases(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    investigator: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(100),
    db: Session = Depends(get_db)
):
    query = db.query(InvestigationCase)
    if status and status.strip() and status.upper() != "ALL":
        st = status.strip()
        if st in ["Under_Investigation", "Under Investigation", "Active Investigation"]:
            query = query.filter(
                InvestigationCase.status.in_(["Under_Investigation", "Under Investigation", "Active Investigation"])
            )
        else:
            query = query.filter(InvestigationCase.status == st)

    if priority and priority.strip() and priority.upper() != "ALL":
        query = query.filter(InvestigationCase.priority.ilike(priority.strip()))

    if source_type and source_type.strip() and source_type.upper() != "ALL":
        query = query.filter(InvestigationCase.source_type == source_type.strip())

    if investigator and investigator.strip() and investigator.upper() != "ALL":
        query = query.filter(InvestigationCase.assigned_investigator == investigator.strip())

    if search and search.strip():
        s = search.strip()
        query = query.filter(
            (InvestigationCase.case_id.ilike(f"%{s}%")) |
            (InvestigationCase.title.ilike(f"%{s}%")) |
            (InvestigationCase.primary_account_id.ilike(f"%{s}%"))
        )

    cases = query.order_by(InvestigationCase.updated_at.desc()).limit(limit).all()
    # List view doesn't need to deeply fetch all related entities for 100 cases, but includes evidence items
    return [CaseService.serialize_case(c, db, include_relations=False) for c in cases]

@router.get("/summary", response_model=CaseSummaryOut)
@router.get("/summary/", response_model=CaseSummaryOut, include_in_schema=False)
def get_cases_summary(db: Session = Depends(get_db)):
    return CaseService.get_cases_summary(db)

@router.get("/investigators")
@router.get("/investigators/", include_in_schema=False)
def get_investigators():
    return {"investigators": CaseService.get_investigators()}

@router.post("", response_model=CaseOut)
@router.post("/", response_model=CaseOut, include_in_schema=False)
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
        source_type=data.source_type or "Manual",
        source_reference_id=data.source_reference_id,
        created_by=data.created_by or "Investigator",
        initial_evidence=init_ev
    )
    return CaseService.serialize_case(case, db, include_relations=True)

@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(
        (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found in docket.")
    return CaseService.serialize_case(case, db, include_relations=True)

@router.put("/{case_id}", response_model=CaseOut)
def update_case(case_id: str, data: CaseUpdate, db: Session = Depends(get_db)):
    case = CaseService.update_case(db, case_id, data.dict(exclude_unset=True))
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")
    return CaseService.serialize_case(case, db, include_relations=True)

@router.post("/{case_id}/status", response_model=CaseOut)
def update_case_status(case_id: str, data: StatusUpdateRequest, db: Session = Depends(get_db)):
    try:
        case = CaseService.update_status(
            db,
            case_id=case_id,
            status=data.status,
            closure_reason=data.closure_reason,
            version=data.version
        )
        return CaseService.serialize_case(case, db, include_relations=True)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/priority", response_model=CaseOut)
def update_case_priority(case_id: str, data: PriorityUpdateRequest, db: Session = Depends(get_db)):
    try:
        case = CaseService.update_priority(
            db,
            case_id=case_id,
            priority=data.priority,
            version=data.version
        )
        return CaseService.serialize_case(case, db, include_relations=True)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/assignee", response_model=CaseOut)
def update_case_assignee(case_id: str, data: AssigneeUpdateRequest, db: Session = Depends(get_db)):
    try:
        case = CaseService.update_assignee(
            db,
            case_id=case_id,
            assignee=data.assigned_investigator,
            version=data.version
        )
        return CaseService.serialize_case(case, db, include_relations=True)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/findings", response_model=CaseOut)
def update_case_findings(case_id: str, data: FindingsUpdateRequest, db: Session = Depends(get_db)):
    try:
        case = CaseService.update_findings(
            db,
            case_id=case_id,
            summary=data.summary,
            findings=data.findings,
            version=data.version
        )
        return CaseService.serialize_case(case, db, include_relations=True)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/link-account")
def link_case_account(case_id: str, data: LinkAccountRequest, db: Session = Depends(get_db)):
    try:
        ca = CaseService.link_account(
            db,
            case_id=case_id,
            account_id=data.account_id,
            role=data.role or "Conduit Mule Account",
            notes=data.notes or ""
        )
        return {"status": "success", "message": f"Account {data.account_id} linked successfully.", "link_id": ca.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/unlink-account")
def unlink_case_account(case_id: str, data: UnlinkAccountRequest, db: Session = Depends(get_db)):
    try:
        CaseService.unlink_account(db, case_id=case_id, account_id=data.account_id)
        return {"status": "success", "message": f"Account {data.account_id} unlinked successfully."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/link-transaction")
def link_case_transaction(case_id: str, data: LinkTransactionRequest, db: Session = Depends(get_db)):
    try:
        ct = CaseService.link_transaction(
            db,
            case_id=case_id,
            transaction_id=data.transaction_id,
            relevance=data.relevance or "Suspected Layering Transfer",
            notes=data.notes or ""
        )
        return {"status": "success", "message": f"Transaction {data.transaction_id} linked successfully.", "link_id": ct.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/unlink-transaction")
def unlink_case_transaction(case_id: str, data: UnlinkTransactionRequest, db: Session = Depends(get_db)):
    try:
        CaseService.unlink_transaction(db, case_id=case_id, transaction_id=data.transaction_id)
        return {"status": "success", "message": f"Transaction {data.transaction_id} unlinked successfully."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/link-complaint")
def link_case_complaint(case_id: str, data: LinkComplaintRequest, db: Session = Depends(get_db)):
    try:
        cc = CaseService.link_complaint(db, case_id=case_id, complaint_id=data.complaint_id)
        return {"status": "success", "message": f"Complaint {data.complaint_id} linked successfully.", "link_id": cc.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{case_id}/evidence", response_model=List[EvidenceOut])
def list_case_evidence(case_id: str, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(
        (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")
    return db.query(CaseEvidence).filter(CaseEvidence.case_id == case.case_id).order_by(CaseEvidence.created_at.desc()).all()

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

@router.delete("/{case_id}/evidence/{evidence_id}")
def remove_case_evidence(case_id: str, evidence_id: int, db: Session = Depends(get_db)):
    try:
        ok = CaseService.remove_evidence(db, case_id=case_id, evidence_id=evidence_id)
        if not ok:
            raise HTTPException(status_code=404, detail=f"Evidence {evidence_id} not found on case.")
        return {"status": "success", "message": f"Evidence #{evidence_id} removed from case."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{case_id}/audit")
def get_case_audit(case_id: str, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(
        (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")
    audits = db.query(AuditLog).filter(
        (AuditLog.target_id == case.case_id) | (AuditLog.target_id == case.case_number)
    ).order_by(AuditLog.timestamp.desc()).all()
    return audits

@router.get("/{case_id}/dossier")
def get_case_dossier(case_id: str, db: Session = Depends(get_db)):
    try:
        return ReportService.generate_case_dossier(db, case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
