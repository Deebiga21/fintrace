from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from ..models.account import Account
from ..models.transaction import Transaction
from ..models.complaint import Complaint
from ..models.case import InvestigationCase, CaseEvidence
from ..models.model_run import ModelRun

class ReportService:
    @staticmethod
    def get_dashboard_overview(db: Session) -> Dict[str, Any]:
        total_accounts = db.query(Account).count()
        total_transactions = db.query(Transaction).count()
        
        # Volume
        txns = db.query(Transaction.amount).filter(Transaction.status == "COMPLETED").all()
        total_volume = sum(t[0] for t in txns) if txns else 0.0

        # Risk counts
        high_risk = db.query(Account).filter(Account.risk_level == "High").count()
        med_risk = db.query(Account).filter(Account.risk_level == "Medium").count()
        low_risk = db.query(Account).filter(Account.risk_level == "Low").count()
        flagged = high_risk + med_risk

        # Cases
        open_cases = db.query(InvestigationCase).filter(InvestigationCase.status.in_(["New", "Under_Investigation", "Escalated"])).count()
        closed_cases = db.query(InvestigationCase).filter(InvestigationCase.status == "Closed").count()

        # Complaints
        complaints = db.query(Complaint).all()
        total_complaints = len(complaints)
        total_complaint_amount = sum(c.amount_lost for c in complaints)

        # Risk distribution
        risk_distribution = {
            "High": high_risk,
            "Medium": med_risk,
            "Low": low_risk
        }

        # Top suspicious patterns
        pattern_counts = {
            "Rapid Fund Movement": 0,
            "Fan-In Fan-Out Mule Flow": 0,
            "Circular Money Transfer": 0,
            "High Turnover Drain": 0,
            "Aggregator Funneling": 0
        }
        import json
        all_accounts = db.query(Account.flags_json).all()
        for acc in all_accounts:
            if acc[0]:
                try:
                    flags = json.loads(acc[0])
                    for f in flags:
                        if f in pattern_counts:
                            pattern_counts[f] += 1
                        else:
                            pattern_counts[f] = 1
                except Exception:
                    pass

        # Recent high risk accounts
        recent_high = db.query(Account).filter(Account.risk_level == "High").order_by(Account.risk_score.desc()).limit(8).all()
        recent_list = []
        for a in recent_high:
            recent_list.append({
                "account_id": a.account_id,
                "customer_name": a.customer_name,
                "risk_score": a.risk_score,
                "risk_level": a.risk_level,
                "total_incoming": a.total_incoming,
                "total_outgoing": a.total_outgoing,
                "flags": json.loads(a.flags_json) if a.flags_json else []
            })

        # Daily volume trend (dummy or real aggregate)
        day_buckets: Dict[str, float] = {}
        all_txns = db.query(Transaction.timestamp, Transaction.amount).filter(Transaction.status == "COMPLETED").all()
        for ts, amt in all_txns:
            d_str = ts.strftime("%Y-%m-%d")
            day_buckets[d_str] = day_buckets.get(d_str, 0.0) + amt

        volume_by_day = [{"date": k, "volume": round(v, 2)} for k, v in sorted(day_buckets.items())]

        return {
            "total_accounts": total_accounts,
            "total_transactions": total_transactions,
            "total_volume": round(total_volume, 2),
            "flagged_accounts": flagged,
            "high_risk_accounts": high_risk,
            "medium_risk_accounts": med_risk,
            "low_risk_accounts": low_risk,
            "open_cases": open_cases,
            "closed_cases": closed_cases,
            "total_complaints": total_complaints,
            "total_complaint_amount": round(total_complaint_amount, 2),
            "risk_distribution": risk_distribution,
            "top_suspicious_patterns": pattern_counts,
            "recent_suspicious_accounts": recent_list,
            "transaction_volume_by_day": volume_by_day
        }

    @staticmethod
    def generate_case_dossier(db: Session, case_id: str) -> Dict[str, Any]:
        """
        Builds a comprehensive investigation dossier for export / report generation.
        """
        case = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        evidence = db.query(CaseEvidence).filter(CaseEvidence.case_id == case_id).all()
        account = None
        if case.primary_account_id:
            account = db.query(Account).filter(Account.account_id == case.primary_account_id).first()

        # Related transactions
        related_txns = []
        if account:
            txns = db.query(Transaction).filter(
                (Transaction.sender_account == account.account_id) | 
                (Transaction.receiver_account == account.account_id)
            ).order_by(Transaction.timestamp.desc()).limit(50).all()
            for t in txns:
                related_txns.append({
                    "id": t.transaction_id,
                    "sender": t.sender_account,
                    "receiver": t.receiver_account,
                    "amount": t.amount,
                    "timestamp": t.timestamp.isoformat(),
                    "type": t.transaction_type,
                    "suspicious": t.is_suspicious,
                    "reason": t.flag_reason
                })

        # Related complaints
        complaints = []
        if account:
            cmps = db.query(Complaint).filter(Complaint.reported_account_id == account.account_id).all()
            for c in cmps:
                complaints.append({
                    "id": c.complaint_id,
                    "complainant": c.complainant_name,
                    "amount_lost": c.amount_lost,
                    "date": c.date_reported.isoformat(),
                    "description": c.description,
                    "source": c.source
                })

        return {
            "case_id": case.case_id,
            "title": case.title,
            "priority": case.priority,
            "status": case.status,
            "assigned_investigator": case.assigned_investigator,
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat(),
            "summary": case.summary,
            "findings": case.findings,
            "primary_account": {
                "account_id": account.account_id if account else None,
                "customer_name": account.customer_name if account else None,
                "risk_score": account.risk_score if account else None,
                "risk_level": account.risk_level if account else None,
                "inflow": account.total_incoming if account else None,
                "outflow": account.total_outgoing if account else None,
            } if account else None,
            "evidence_count": len(evidence),
            "evidence_items": [
                {
                    "type": e.evidence_type,
                    "reference": e.reference_id,
                    "description": e.description,
                    "added_at": e.created_at.isoformat()
                } for e in evidence
            ],
            "related_transactions": related_txns,
            "related_complaints": complaints,
            "generated_at": datetime.utcnow().isoformat(),
            "classification_notice": "CONFIDENTIAL - LAW ENFORCEMENT & FINANCIAL CRIME INVESTIGATION DOSSIER"
        }
