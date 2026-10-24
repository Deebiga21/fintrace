import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..models.case import InvestigationCase, CaseEvidence, CaseAccount, CaseTransaction, CaseComplaint
from ..models.account import Account
from ..models.transaction import Transaction
from ..models.complaint import Complaint
from ..models.audit import AuditLog
from ..websocket_manager import ws_manager

INVESTIGATORS_REGISTRY = [
    {
        "id": "INV-001",
        "badge_id": "INV-001",
        "name": "Lead Financial Crime Specialist",
        "email": "lead.investigator@fintrace.gov",
        "role": "Supervisory Investigator",
        "display": "Lead Financial Crime Specialist (INV-001)"
    },
    {
        "id": "INV-002",
        "badge_id": "INV-002",
        "name": "Senior AML Intelligence Analyst",
        "email": "aml.analyst@fintrace.gov",
        "role": "Senior Analyst",
        "display": "Senior AML Intelligence Analyst (INV-002)"
    },
    {
        "id": "INV-003",
        "badge_id": "INV-003",
        "name": "Cyber Forensic Specialist",
        "email": "cyber.forensics@fintrace.gov",
        "role": "Forensics Examiner",
        "display": "Cyber Forensic Specialist (INV-003)"
    },
    {
        "id": "INV-004",
        "badge_id": "INV-004",
        "name": "Financial Intelligence Unit Liaison",
        "email": "fiu.liaison@fintrace.gov",
        "role": "Enforcement Liaison",
        "display": "Financial Intelligence Unit Liaison (INV-004)"
    }
]

class CaseService:
    @staticmethod
    def get_investigators() -> List[Dict[str, Any]]:
        return INVESTIGATORS_REGISTRY

    @staticmethod
    def serialize_case(case: InvestigationCase, db: Session, include_relations: bool = True) -> Dict[str, Any]:
        evidence = db.query(CaseEvidence).filter(CaseEvidence.case_id == case.case_id).order_by(CaseEvidence.created_at.desc()).all()
        evidence_items = [
            {
                "id": e.id,
                "case_id": e.case_id,
                "evidence_type": e.evidence_type,
                "reference_id": e.reference_id,
                "description": e.description,
                "metadata_json": e.metadata_json or "{}",
                "created_at": e.created_at.isoformat() if e.created_at else datetime.utcnow().isoformat()
            } for e in evidence
        ]

        linked_accounts = []
        linked_txns = []
        correlated_complaints = []
        audit_logs = []

        if include_relations:
            # Linked accounts
            case_accs = db.query(CaseAccount).filter(CaseAccount.case_id == case.case_id).all()
            for ca in case_accs:
                acc = db.query(Account).filter(Account.account_id == ca.account_id).first()
                linked_accounts.append({
                    "id": ca.id,
                    "account_id": ca.account_id,
                    "role": ca.role or "Conduit Mule Account",
                    "notes": ca.notes or "",
                    "linked_at": ca.linked_at.isoformat() if ca.linked_at else datetime.utcnow().isoformat(),
                    "customer_name": acc.customer_name if acc else f"Entity {ca.account_id}",
                    "risk_level": acc.risk_level if acc else "Medium",
                    "risk_score": acc.risk_score if acc else 0.5,
                    "current_balance": acc.current_balance if acc else 0.0
                })

            # If primary_account_id exists and not in linked_accounts, add it as primary
            if case.primary_account_id and not any(a["account_id"] == case.primary_account_id for a in linked_accounts):
                acc = db.query(Account).filter(Account.account_id == case.primary_account_id).first()
                linked_accounts.insert(0, {
                    "id": 0,
                    "account_id": case.primary_account_id,
                    "role": "Primary Subject",
                    "notes": "Primary investigated subject account",
                    "linked_at": case.created_at.isoformat() if case.created_at else datetime.utcnow().isoformat(),
                    "customer_name": acc.customer_name if acc else f"Entity {case.primary_account_id}",
                    "risk_level": acc.risk_level if acc else "High",
                    "risk_score": acc.risk_score if acc else 0.85,
                    "current_balance": acc.current_balance if acc else 0.0
                })

            # Linked transactions
            case_txs = db.query(CaseTransaction).filter(CaseTransaction.case_id == case.case_id).all()
            for ct in case_txs:
                t = db.query(Transaction).filter(Transaction.transaction_id == ct.transaction_id).first()
                linked_txns.append({
                    "id": ct.id,
                    "transaction_id": ct.transaction_id,
                    "relevance": ct.relevance or "Suspected Layering Transfer",
                    "notes": ct.notes or "",
                    "linked_at": ct.linked_at.isoformat() if ct.linked_at else datetime.utcnow().isoformat(),
                    "sender_account": t.sender_account if t else "UNKNOWN",
                    "receiver_account": t.receiver_account if t else "UNKNOWN",
                    "amount": t.amount if t else 0.0,
                    "status": t.status if t else "COMPLETED",
                    "timestamp": t.timestamp.isoformat() if t and t.timestamp else datetime.utcnow().isoformat()
                })

            # If no transactions linked yet, link top transactions from primary account
            if not linked_txns and case.primary_account_id:
                sample_txs = db.query(Transaction).filter(
                    (Transaction.sender_account == case.primary_account_id) | 
                    (Transaction.receiver_account == case.primary_account_id)
                ).limit(5).all()
                for st in sample_txs:
                    linked_txns.append({
                        "id": 0,
                        "transaction_id": st.transaction_id,
                        "relevance": "Flagged Network Flow",
                        "notes": "Correlated flow associated with primary suspect",
                        "linked_at": case.created_at.isoformat() if case.created_at else datetime.utcnow().isoformat(),
                        "sender_account": st.sender_account,
                        "receiver_account": st.receiver_account,
                        "amount": st.amount,
                        "status": st.status,
                        "timestamp": st.timestamp.isoformat() if st.timestamp else datetime.utcnow().isoformat()
                    })

            # Linked complaints
            case_cmps = db.query(CaseComplaint).filter(CaseComplaint.case_id == case.case_id).all()
            for cc in case_cmps:
                c = db.query(Complaint).filter(Complaint.complaint_id == cc.complaint_id).first()
                if c:
                    correlated_complaints.append({
                        "complaint_id": c.complaint_id,
                        "complainant_name": c.complainant_name,
                        "reported_account_id": c.reported_account_id,
                        "amount_lost": c.amount_lost,
                        "date_reported": c.date_reported.isoformat() if c.date_reported else datetime.utcnow().isoformat(),
                        "description": c.description,
                        "status": c.status
                    })

            if not correlated_complaints and case.primary_account_id:
                cmps = db.query(Complaint).filter(Complaint.reported_account_id == case.primary_account_id).limit(5).all()
                for c in cmps:
                    correlated_complaints.append({
                        "complaint_id": c.complaint_id,
                        "complainant_name": c.complainant_name,
                        "reported_account_id": c.reported_account_id,
                        "amount_lost": c.amount_lost,
                        "date_reported": c.date_reported.isoformat() if c.date_reported else datetime.utcnow().isoformat(),
                        "description": c.description,
                        "status": c.status
                    })

            # Audit logs
            audits = db.query(AuditLog).filter(
                (AuditLog.target_id == case.case_id) | 
                (AuditLog.target_id == case.case_number)
            ).order_by(AuditLog.timestamp.desc()).limit(30).all()
            for a in audits:
                audit_logs.append({
                    "id": a.id,
                    "action": a.action,
                    "user": a.user or "Investigator",
                    "details": a.details,
                    "target_type": a.target_type,
                    "target_id": a.target_id,
                    "timestamp": a.timestamp.isoformat() if a.timestamp else datetime.utcnow().isoformat()
                })

        return {
            "case_id": case.case_id,
            "case_number": getattr(case, "case_number", None) or case.case_id,
            "title": case.title,
            "priority": case.priority,
            "assigned_investigator": case.assigned_investigator,
            "status": case.status,
            "primary_account_id": case.primary_account_id,
            "created_at": case.created_at.isoformat() if case.created_at else datetime.utcnow().isoformat(),
            "updated_at": case.updated_at.isoformat() if case.updated_at else datetime.utcnow().isoformat(),
            "created_by": getattr(case, "created_by", None) or "Investigator",
            "source_type": getattr(case, "source_type", None) or "GNN Alert",
            "source_reference_id": getattr(case, "source_reference_id", None),
            "summary": case.summary,
            "findings": case.findings,
            "closure_reason": getattr(case, "closure_reason", None),
            "version": getattr(case, "version", 1) or 1,
            "evidence_count": len(evidence),
            "evidence_items": evidence_items,
            "linked_accounts": linked_accounts,
            "linked_transactions": linked_txns,
            "correlated_complaints": correlated_complaints,
            "audit_logs": audit_logs
        }

    @staticmethod
    def get_cases_summary(db: Session) -> Dict[str, int]:
        total_cases = db.query(InvestigationCase).count()
        active_cases = db.query(InvestigationCase).filter(
            ~InvestigationCase.status.in_(["Closed", "Resolved"])
        ).count()
        critical_priority = db.query(InvestigationCase).filter(
            InvestigationCase.priority.in_(["Critical", "CRITICAL"])
        ).count()
        high_priority = db.query(InvestigationCase).filter(
            InvestigationCase.priority.in_(["High", "HIGH"])
        ).count()
        closed_cases = db.query(InvestigationCase).filter(
            InvestigationCase.status.in_(["Closed", "Resolved"])
        ).count()

        return {
            "total_cases": total_cases,
            "active_cases": active_cases,
            "critical_priority": critical_priority,
            "high_priority": high_priority,
            "closed_cases": closed_cases
        }

    @staticmethod
    def create_case(
        db: Session,
        title: str,
        priority: str = "High",
        assigned_investigator: str = "Lead Financial Crime Specialist",
        primary_account_id: Optional[str] = None,
        summary: Optional[str] = None,
        findings: Optional[str] = None,
        source_type: str = "Manual",
        source_reference_id: Optional[str] = None,
        created_by: str = "Investigator",
        initial_evidence: Optional[List[Dict[str, Any]]] = None
    ) -> InvestigationCase:
        year = datetime.utcnow().year
        rand_suffix = uuid.uuid4().hex[:6].upper()
        case_id = f"CASE-{year}-{rand_suffix}"

        case = InvestigationCase(
            case_id=case_id,
            case_number=case_id,
            title=title,
            priority=priority,
            assigned_investigator=assigned_investigator,
            status="New",
            primary_account_id=primary_account_id,
            created_by=created_by,
            source_type=source_type,
            source_reference_id=source_reference_id,
            summary=summary or f"Investigation initiated on entity {primary_account_id or 'Flagged Ring'}",
            findings=findings or "Preliminary GNN risk scoring and pattern matching flagged this account.",
            version=1
        )
        db.add(case)
        db.commit()
        db.refresh(case)

        # Primary account link
        if primary_account_id:
            ca = CaseAccount(
                case_id=case_id,
                account_id=primary_account_id,
                role="Primary Subject",
                notes="Primary investigative subject account",
                linked_by=created_by
            )
            db.add(ca)

        # Initial evidence
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

        # Audit log
        audit = AuditLog(
            action="CASE_CREATED",
            target_type="CASE",
            target_id=case_id,
            user=created_by,
            details=f"Created investigation case '{title}' with priority {priority} by {assigned_investigator}"
        )
        db.add(audit)
        db.commit()

        # Emit WebSocket event
        ws_manager.emit_event("case.created", case_id, {
            "title": title,
            "priority": priority,
            "status": "New",
            "assigned_investigator": assigned_investigator,
            "created_at": datetime.utcnow().isoformat()
        })

        return case

    @staticmethod
    def update_case(db: Session, case_id: str, updates: Dict[str, Any]) -> Optional[InvestigationCase]:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            return None

        old_status = case.status
        for k, v in updates.items():
            if hasattr(case, k) and v is not None:
                setattr(case, k, v)

        case.version = (getattr(case, "version", 1) or 1) + 1
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

        ws_manager.emit_event("case.updated", case_id, {
            "updated_at": case.updated_at.isoformat()
        })
        return case

    @staticmethod
    def update_status(db: Session, case_id: str, status: str, closure_reason: Optional[str] = None, version: Optional[int] = None) -> InvestigationCase:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        old_status = case.status
        case.status = status
        if closure_reason:
            case.closure_reason = closure_reason
        case.version = (getattr(case, "version", 1) or 1) + 1
        case.updated_at = datetime.utcnow()

        audit = AuditLog(
            action="CASE_STATUS_CHANGED",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Status transitioned from '{old_status}' to '{status}'. Reason: {closure_reason or 'Supervisory approval'}"
        )
        db.add(audit)
        db.commit()
        db.refresh(case)

        ws_manager.emit_event("case.status_changed", case.case_id, {
            "new_status": status,
            "closure_reason": closure_reason,
            "updated_at": case.updated_at.isoformat()
        })
        return case

    @staticmethod
    def update_priority(db: Session, case_id: str, priority: str, version: Optional[int] = None) -> InvestigationCase:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        old_priority = case.priority
        case.priority = priority
        case.version = (getattr(case, "version", 1) or 1) + 1
        case.updated_at = datetime.utcnow()

        audit = AuditLog(
            action="CASE_PRIORITY_CHANGED",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Priority adjusted from '{old_priority}' to '{priority}'."
        )
        db.add(audit)
        db.commit()
        db.refresh(case)

        ws_manager.emit_event("case.priority_changed", case.case_id, {
            "new_priority": priority,
            "updated_at": case.updated_at.isoformat()
        })
        return case

    @staticmethod
    def update_assignee(db: Session, case_id: str, assignee: str, version: Optional[int] = None) -> InvestigationCase:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        old_assignee = case.assigned_investigator
        case.assigned_investigator = assignee
        case.version = (getattr(case, "version", 1) or 1) + 1
        case.updated_at = datetime.utcnow()

        audit = AuditLog(
            action="CASE_ASSIGNEE_CHANGED",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Reassigned from '{old_assignee}' to '{assignee}'."
        )
        db.add(audit)
        db.commit()
        db.refresh(case)

        ws_manager.emit_event("case.assignee_changed", case.case_id, {
            "new_assignee": assignee,
            "updated_at": case.updated_at.isoformat()
        })
        return case

    @staticmethod
    def update_findings(db: Session, case_id: str, summary: Optional[str] = None, findings: Optional[str] = None, version: Optional[int] = None) -> InvestigationCase:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        if summary is not None:
            case.summary = summary
        if findings is not None:
            case.findings = findings

        case.version = (getattr(case, "version", 1) or 1) + 1
        case.updated_at = datetime.utcnow()

        audit = AuditLog(
            action="CASE_FINDINGS_UPDATED",
            target_type="CASE",
            target_id=case.case_id,
            details="Investigator updated forensic case summary and evidentiary findings narrative."
        )
        db.add(audit)
        db.commit()
        db.refresh(case)

        ws_manager.emit_event("case.findings_updated", case.case_id, {
            "summary": case.summary,
            "findings": case.findings,
            "updated_at": case.updated_at.isoformat()
        })
        return case

    @staticmethod
    def link_account(db: Session, case_id: str, account_id: str, role: str = "Conduit Mule Account", notes: str = "") -> CaseAccount:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        existing = db.query(CaseAccount).filter(
            CaseAccount.case_id == case.case_id,
            CaseAccount.account_id == account_id
        ).first()
        if existing:
            existing.role = role
            existing.notes = notes
            db.commit()
            return existing

        ca = CaseAccount(
            case_id=case.case_id,
            account_id=account_id,
            role=role,
            notes=notes,
            linked_by=case.assigned_investigator or "Investigator"
        )
        db.add(ca)

        audit = AuditLog(
            action="ACCOUNT_LINKED_TO_CASE",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Linked suspect account {account_id} as '{role}'"
        )
        db.add(audit)
        db.commit()
        db.refresh(ca)

        ws_manager.emit_event("case.account_linked", case.case_id, {
            "account_id": account_id,
            "role": role
        })
        return ca

    @staticmethod
    def unlink_account(db: Session, case_id: str, account_id: str) -> bool:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        db.query(CaseAccount).filter(
            CaseAccount.case_id == case.case_id,
            CaseAccount.account_id == account_id
        ).delete()

        audit = AuditLog(
            action="ACCOUNT_UNLINKED_FROM_CASE",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Unlinked account {account_id} from case."
        )
        db.add(audit)
        db.commit()

        ws_manager.emit_event("case.account_unlinked", case.case_id, {
            "account_id": account_id
        })
        return True

    @staticmethod
    def link_transaction(db: Session, case_id: str, transaction_id: str, relevance: str = "Suspected Layering Transfer", notes: str = "") -> CaseTransaction:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        existing = db.query(CaseTransaction).filter(
            CaseTransaction.case_id == case.case_id,
            CaseTransaction.transaction_id == transaction_id
        ).first()
        if existing:
            existing.relevance = relevance
            existing.notes = notes
            db.commit()
            return existing

        ct = CaseTransaction(
            case_id=case.case_id,
            transaction_id=transaction_id,
            relevance=relevance,
            notes=notes,
            linked_by=case.assigned_investigator or "Investigator"
        )
        db.add(ct)

        audit = AuditLog(
            action="TRANSACTION_LINKED_TO_CASE",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Linked transaction {transaction_id} as '{relevance}'"
        )
        db.add(audit)
        db.commit()
        db.refresh(ct)

        ws_manager.emit_event("case.transaction_linked", case.case_id, {
            "transaction_id": transaction_id,
            "relevance": relevance
        })
        return ct

    @staticmethod
    def unlink_transaction(db: Session, case_id: str, transaction_id: str) -> bool:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        db.query(CaseTransaction).filter(
            CaseTransaction.case_id == case.case_id,
            CaseTransaction.transaction_id == transaction_id
        ).delete()

        audit = AuditLog(
            action="TRANSACTION_UNLINKED_FROM_CASE",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Unlinked transaction {transaction_id} from case."
        )
        db.add(audit)
        db.commit()

        ws_manager.emit_event("case.transaction_unlinked", case.case_id, {
            "transaction_id": transaction_id
        })
        return True

    @staticmethod
    def link_complaint(db: Session, case_id: str, complaint_id: str) -> CaseComplaint:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        existing = db.query(CaseComplaint).filter(
            CaseComplaint.case_id == case.case_id,
            CaseComplaint.complaint_id == complaint_id
        ).first()
        if existing:
            return existing

        cc = CaseComplaint(
            case_id=case.case_id,
            complaint_id=complaint_id,
            linked_by=case.assigned_investigator or "Investigator"
        )
        db.add(cc)

        audit = AuditLog(
            action="COMPLAINT_LINKED_TO_CASE",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Linked cybercrime complaint {complaint_id} to case dossier."
        )
        db.add(audit)
        db.commit()
        db.refresh(cc)

        ws_manager.emit_event("case.complaint_linked", case.case_id, {
            "complaint_id": complaint_id
        })
        return cc

    @staticmethod
    def add_evidence(
        db: Session,
        case_id: str,
        evidence_type: str,
        reference_id: str,
        description: str,
        metadata_json: str = "{}"
    ) -> CaseEvidence:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        ev = CaseEvidence(
            case_id=case.case_id,
            evidence_type=evidence_type,
            reference_id=reference_id,
            description=description,
            metadata_json=metadata_json
        )
        db.add(ev)
        
        audit = AuditLog(
            action="EVIDENCE_ADDED",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Added {evidence_type} evidence [{reference_id}]: {description[:60]}"
        )
        db.add(audit)
        db.commit()
        db.refresh(ev)

        ws_manager.emit_event("case.evidence_added", case.case_id, {
            "evidence_id": ev.id,
            "evidence_type": evidence_type,
            "reference_id": reference_id
        })
        return ev

    @staticmethod
    def remove_evidence(db: Session, case_id: str, evidence_id: int) -> bool:
        case = db.query(InvestigationCase).filter(
            (InvestigationCase.case_id == case_id) | (InvestigationCase.case_number == case_id)
        ).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        ev = db.query(CaseEvidence).filter(
            CaseEvidence.case_id == case.case_id,
            CaseEvidence.id == evidence_id
        ).first()
        if not ev:
            return False

        db.delete(ev)
        audit = AuditLog(
            action="EVIDENCE_REMOVED",
            target_type="CASE",
            target_id=case.case_id,
            details=f"Removed evidence #{evidence_id} from case."
        )
        db.add(audit)
        db.commit()

        ws_manager.emit_event("case.evidence_removed", case.case_id, {
            "evidence_id": evidence_id
        })
        return True

    @staticmethod
    def seed_sample_cases_if_empty(db: Session):
        count = db.query(InvestigationCase).count()
        if count > 0:
            return

        sample_cases_data = [
            {
                "case_id": "CASE-2026-001",
                "title": "Operation Cyclone: Multi-Hop Mule Ring",
                "priority": "Critical",
                "assigned_investigator": "Lead Financial Crime Specialist",
                "status": "Under_Investigation",
                "primary_account_id": "MULE_AGG_01",
                "source_type": "GNN Alert",
                "summary": "GraphSAGE detected high-velocity fund pooling across 8 victim phished accounts into primary aggregator MULE_AGG_01 before outbound dispersion.",
                "findings": "Victim phish conduits VICTIM_PHISH_01, 02, and 03 routed an aggregate of INR 176,272 within 4 minutes. GNN mule probability computed at 0.865. Account frozen pending court production.",
                "evidence": [
                    {"evidence_type": "ACCOUNT", "reference_id": "MULE_AGG_01", "description": "Primary high-inflow aggregator node identified by 2-hop GraphSAGE model."},
                    {"evidence_type": "TRANSACTION", "reference_id": "TXN_10161", "description": "Initial entry transaction INR 49,463.51 originating from phished victim account."},
                    {"evidence_type": "COMPLAINT", "reference_id": "CMP-2026-8812", "description": "1930 Cybercrime Portal complaint filed by victim Ramesh Kumar Gupta."}
                ],
                "accounts": [
                    {"account_id": "MULE_AGG_01", "role": "Primary Aggregator", "notes": "High risk conduit accumulator"},
                    {"account_id": "MULE_LAYER_02", "role": "Layering Node", "notes": "Second tier distributor"}
                ],
                "txns": ["TXN_10161", "TXN_10162"],
                "complaints": ["CMP-2026-8812", "CMP-2026-8815"]
            },
            {
                "case_id": "CASE-2026-002",
                "title": "Digital Smurfing & Layering Syndicate",
                "priority": "High",
                "assigned_investigator": "Senior AML Intelligence Analyst",
                "status": "Under Review",
                "primary_account_id": "MULE_LAYER_02",
                "source_type": "Money Trail",
                "summary": "Structured outbound transfers just below regulatory reporting thresholds observed exiting through multiple intermediary wallets.",
                "findings": "Automated money trail analysis reveals circular layering patterns. Turnover ratio exceeds 4.2x daily baseline.",
                "evidence": [
                    {"evidence_type": "ACCOUNT", "reference_id": "MULE_LAYER_02", "description": "Secondary dispersion node with high out-degree fan-out."},
                    {"evidence_type": "TRANSACTION", "reference_id": "TXN_10162", "description": "INR 61,997.86 intermediary smurfing split transfer."}
                ],
                "accounts": [
                    {"account_id": "MULE_LAYER_02", "role": "Layering Mule", "notes": "Intermediary conduit"}
                ],
                "txns": ["TXN_10162"],
                "complaints": ["CMP-2026-8815"]
            },
            {
                "case_id": "CASE-2026-003",
                "title": "NCCRP Fraud Alert - High Velocity Funnel",
                "priority": "Critical",
                "assigned_investigator": "Cyber Forensic Specialist",
                "status": "Escalated",
                "primary_account_id": "CIRC_MULE_A",
                "source_type": "Complaint",
                "summary": "Coordinated cyber extortion funnel involving circular money rotation across 3 interconnected accounts.",
                "findings": "Immediate FIU statutory freeze order recommended. Cyclic wash trade confirmed between CIRC_MULE_A, CIRC_MULE_B, and CIRC_MULE_C.",
                "evidence": [
                    {"evidence_type": "ACCOUNT", "reference_id": "CIRC_MULE_A", "description": "Head node in 3-cycle circular fund routing scheme."},
                    {"evidence_type": "COMPLAINT", "reference_id": "CMP-2026-8902", "description": "FIR registered via National Cyber Crime Reporting Portal."}
                ],
                "accounts": [
                    {"account_id": "CIRC_MULE_A", "role": "Syndicate Head", "notes": "Circular trading originator"},
                    {"account_id": "CIRC_MULE_B", "role": "Cyclic Conduit", "notes": "Intermediary loop node"}
                ],
                "txns": [],
                "complaints": ["CMP-2026-8902"]
            },
            {
                "case_id": "CASE-2026-004",
                "title": "Corporate Shell Conduit Dormant Surge",
                "priority": "Medium",
                "assigned_investigator": "Financial Intelligence Unit Liaison",
                "status": "New",
                "primary_account_id": "RAPID_CONDUIT_77",
                "source_type": "Manual",
                "summary": "Previously dormant business checking account experienced sudden 1,200% influx within a 24-hour window.",
                "findings": "Pending KYC verification and authorized signatory interview. Target account balance currently held under provisional audit.",
                "evidence": [
                    {"evidence_type": "ACCOUNT", "reference_id": "RAPID_CONDUIT_77", "description": "Subject entity exhibiting sudden volume spike anomaly."}
                ],
                "accounts": [
                    {"account_id": "RAPID_CONDUIT_77", "role": "Suspect Conduit", "notes": "Rapid transit account"}
                ],
                "txns": [],
                "complaints": []
            }
        ]

        for cdata in sample_cases_data:
            case = InvestigationCase(
                case_id=cdata["case_id"],
                case_number=cdata["case_id"],
                title=cdata["title"],
                priority=cdata["priority"],
                assigned_investigator=cdata["assigned_investigator"],
                status=cdata["status"],
                primary_account_id=cdata["primary_account_id"],
                source_type=cdata["source_type"],
                summary=cdata["summary"],
                findings=cdata["findings"],
                version=1
            )
            db.add(case)
            db.commit()

            for ev in cdata.get("evidence", []):
                db.add(CaseEvidence(
                    case_id=case.case_id,
                    evidence_type=ev["evidence_type"],
                    reference_id=ev["reference_id"],
                    description=ev["description"],
                    metadata_json="{}"
                ))

            for acc in cdata.get("accounts", []):
                db.add(CaseAccount(
                    case_id=case.case_id,
                    account_id=acc["account_id"],
                    role=acc["role"],
                    notes=acc["notes"],
                    linked_by=case.assigned_investigator
                ))

            for txn_id in cdata.get("txns", []):
                db.add(CaseTransaction(
                    case_id=case.case_id,
                    transaction_id=txn_id,
                    relevance="Correlated Syndicate Transfer",
                    notes="Flagged in case intake",
                    linked_by=case.assigned_investigator
                ))

            for cmp_id in cdata.get("complaints", []):
                db.add(CaseComplaint(
                    case_id=case.case_id,
                    complaint_id=cmp_id,
                    linked_by=case.assigned_investigator
                ))

            db.add(AuditLog(
                action="CASE_CREATED",
                target_type="CASE",
                target_id=case.case_id,
                user=case.assigned_investigator,
                details=f"Initialized benchmark case '{case.title}'"
            ))

        db.commit()
