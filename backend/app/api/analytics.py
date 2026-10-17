from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..schemas.analytics import DashboardOverview, AuditLogOut
from ..services.report_service import ReportService
from ..models.audit import AuditLog

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])

@router.get("/overview", response_model=DashboardOverview)
def get_analytics_overview(db: Session = Depends(get_db)):
    return ReportService.get_dashboard_overview(db)

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "user": log.user,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details
        } for log in logs
    ]
