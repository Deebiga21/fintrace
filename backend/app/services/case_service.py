import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..models.case import InvestigationCase, CaseEvidence
from ..models.audit import AuditLog

class CaseService:
    @staticmethod
    def create_case(
        db: Session,
        title: str,
        priority: str = "High",
        assigned_investigator: str = "Lead Financial Crime Specialist",
        primary_account_id: Optional[str] = None,
        summary: Optional[str] = None,
        findings: Optional[str] = None,
        initial_evidence: Optional[List[Dict[str, Any]]] = None
    ) -> InvestigationCase:
        year = datetime.utcnow().year
        rand_suffix = uuid.uuid4().hex[:6].upper()
        case_id = f"CASE-{year}-{rand_suffix}"

        case = InvestigationCase(
            case_id=case_id,
            title=title,
            priority=priority,
            assigned_investigator=assigned_investigator,
            status="New",
            primary_account_id=primary_account_id,
            summary=summary or f"Investigation initiated on entity {primary_account_id or 'Flagged Ring'}",
            findings=findings or "Preliminary GNN risk scoring and pattern matching flagged this account."
        )
        db.add(case)
        db.commit()
        db.refresh(case)

        # Add initial evidence
        if initial_evidence:
            for item in initial_evidence:
                ev = CaseEvidence(
                    case_id=case_id,
                    evidence_type=item.get("evidence_type", "ACCOUNT"),
                    reference_id=str(item.get("reference_id")),
                    description=item.get("description", "Supporting evidence"),
                    metadata_json=str(item.get("metadata_json", "{}"))
                )
                db.add(ev)
            db.commit()

        # Audit log
        audit = AuditLog(
            action="CASE_CREATED",
            target_type="CASE",
            target_id=case_id,
            details=f"Created investigation case '{title}' with priority {priority} by {assigned_investigator}"
        )
        db.add(audit)
        db.commit()

        return case

    @staticmethod
    def add_evidence(
        db: Session,
        case_id: str,
        evidence_type: str,
        reference_id: str,
        description: str,
        metadata_json: str = "{}"
    ) -> CaseEvidence:
        case = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        ev = CaseEvidence(
            case_id=case_id,
            evidence_type=evidence_type,
            reference_id=reference_id,
            description=description,
            metadata_json=metadata_json
        )
        db.add(ev)
        
        audit = AuditLog(
            action="EVIDENCE_ADDED",
            target_type="CASE",
            target_id=case_id,
            details=f"Added {evidence_type} evidence [{reference_id}]: {description[:60]}"
        )
        db.add(audit)
        db.commit()
        db.refresh(ev)
        return ev

    @staticmethod
    def update_case(
        db: Session,
        case_id: str,
        updates: Dict[str, Any]
    ) -> Optional[InvestigationCase]:
        case = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
        if not case:
            return None

        old_status = case.status
        for k, v in updates.items():
            if hasattr(case, k) and v is not None:
                setattr(case, k, v)

        case.updated_at = datetime.utcnow()
        
        audit_detail = f"Updated case {case_id}"
        if "status" in updates and updates["status"] != old_status:
            audit_detail += f": Stage changed from {old_status} to {updates['status']}"

        audit = AuditLog(
            action="CASE_UPDATED",
            target_type="CASE",
            target_id=case_id,
            details=audit_detail
        )
        db.add(audit)
        db.commit()
        db.refresh(case)
        return case
