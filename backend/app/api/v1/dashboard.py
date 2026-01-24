"""
Dashboard API Endpoints

Provides summary statistics and recent activity for the main dashboard.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Anomaly,
    Audit,
    Contractor,
    ContractorInventory,
    Material,
    MaterialIssuance,
    MaterialRejection,
    ProductionRecord,
    PurchaseOrder,
    Reconciliation,
    Warehouse,
    WarehouseInventory,
)

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


class WarehouseSummary(BaseModel):
    total: int
    low_stock_items: int


class ContractorSummary(BaseModel):
    total: int
    active: int


class MaterialSummary(BaseModel):
    total: int
    in_circulation: int


class PurchaseOrderSummary(BaseModel):
    pending_approval: int
    awaiting_receipt: int


class AnomalySeverity(BaseModel):
    CRITICAL: int = 0
    HIGH: int = 0
    MEDIUM: int = 0
    LOW: int = 0


class AnomalySummary(BaseModel):
    open: int
    by_severity: AnomalySeverity


class AuditSummary(BaseModel):
    in_progress: int
    pending_analysis: int


class ReconciliationSummary(BaseModel):
    pending_review: int


class RejectionSummary(BaseModel):
    pending_approval: int
    pending_receipt: int


class ActivityItem(BaseModel):
    type: str
    description: str
    timestamp: datetime


class DashboardSummary(BaseModel):
    warehouses: WarehouseSummary
    contractors: ContractorSummary
    materials: MaterialSummary
    purchase_orders: PurchaseOrderSummary
    anomalies: AnomalySummary
    audits: AuditSummary
    reconciliations: ReconciliationSummary
    rejections: RejectionSummary
    recent_activity: List[ActivityItem]


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Get dashboard summary statistics.
    """
    # Warehouse summary
    warehouse_count = db.query(func.count(Warehouse.id)).scalar() or 0
    low_stock_count = db.query(func.count(WarehouseInventory.id)).filter(
        WarehouseInventory.current_quantity <= WarehouseInventory.reorder_point
    ).scalar() or 0

    # Contractor summary
    contractor_count = db.query(func.count(Contractor.id)).scalar() or 0
    # Active = has inventory or activity in last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)
    active_contractors = db.query(func.count(func.distinct(ContractorInventory.contractor_id))).scalar() or 0

    # Material summary
    material_count = db.query(func.count(Material.id)).scalar() or 0
    materials_in_circulation = db.query(func.count(func.distinct(ContractorInventory.material_id))).filter(
        ContractorInventory.quantity > 0
    ).scalar() or 0

    # Purchase Order summary
    pending_approval = db.query(func.count(PurchaseOrder.id)).filter(
        PurchaseOrder.status == "SUBMITTED"
    ).scalar() or 0
    awaiting_receipt = db.query(func.count(PurchaseOrder.id)).filter(
        PurchaseOrder.status.in_(["APPROVED", "PARTIALLY_RECEIVED"])
    ).scalar() or 0

    # Anomaly summary
    open_anomalies = db.query(func.count(Anomaly.id)).filter(
        Anomaly.resolved == False
    ).scalar() or 0

    # Categorize anomalies by severity (based on variance percentage)
    critical = db.query(func.count(Anomaly.id)).filter(
        Anomaly.resolved == False,
        Anomaly.variance_percent > 20
    ).scalar() or 0
    high = db.query(func.count(Anomaly.id)).filter(
        Anomaly.resolved == False,
        Anomaly.variance_percent > 10,
        Anomaly.variance_percent <= 20
    ).scalar() or 0
    medium = db.query(func.count(Anomaly.id)).filter(
        Anomaly.resolved == False,
        Anomaly.variance_percent > 5,
        Anomaly.variance_percent <= 10
    ).scalar() or 0
    low = db.query(func.count(Anomaly.id)).filter(
        Anomaly.resolved == False,
        Anomaly.variance_percent <= 5
    ).scalar() or 0

    # Audit summary
    audits_in_progress = db.query(func.count(Audit.id)).filter(
        Audit.status == "IN_PROGRESS"
    ).scalar() or 0
    audits_pending_analysis = db.query(func.count(Audit.id)).filter(
        Audit.status.in_(["SUBMITTED", "UNDER_REVIEW"])
    ).scalar() or 0

    # Reconciliation summary
    recon_pending_review = db.query(func.count(Reconciliation.id)).filter(
        Reconciliation.status == "SUBMITTED"
    ).scalar() or 0

    # Rejection summary
    rejection_pending_approval = db.query(func.count(MaterialRejection.id)).filter(
        MaterialRejection.status == "REPORTED"
    ).scalar() or 0
    rejection_pending_receipt = db.query(func.count(MaterialRejection.id)).filter(
        MaterialRejection.status.in_(["APPROVED", "IN_TRANSIT"])
    ).scalar() or 0

    # Recent activity (last 10 items from various sources)
    recent_activity = []

    # Recent issuances
    recent_issuances = db.query(MaterialIssuance).order_by(
        MaterialIssuance.created_at.desc()
    ).limit(3).all()
    for iss in recent_issuances:
        recent_activity.append(ActivityItem(
            type="issuance",
            description=f"Issued {iss.quantity} to contractor #{iss.contractor_id}",
            timestamp=iss.created_at or datetime.now(),
        ))

    # Recent production
    recent_production = db.query(ProductionRecord).order_by(
        ProductionRecord.id.desc()
    ).limit(3).all()
    for prod in recent_production:
        recent_activity.append(ActivityItem(
            type="production",
            description=f"Produced {prod.quantity} units for contractor #{prod.contractor_id}",
            timestamp=datetime.combine(prod.production_date, datetime.min.time()) if prod.production_date else datetime.now(),
        ))

    # Recent anomalies
    recent_anomalies = db.query(Anomaly).order_by(
        Anomaly.created_at.desc()
    ).limit(3).all()
    for anom in recent_anomalies:
        recent_activity.append(ActivityItem(
            type="anomaly",
            description=f"Anomaly detected: {anom.anomaly_type} ({anom.variance_percent:.1f}% variance)",
            timestamp=anom.created_at or datetime.now(),
        ))

    # Sort by timestamp and limit
    recent_activity.sort(key=lambda x: x.timestamp, reverse=True)
    recent_activity = recent_activity[:10]

    return DashboardSummary(
        warehouses=WarehouseSummary(
            total=warehouse_count,
            low_stock_items=low_stock_count,
        ),
        contractors=ContractorSummary(
            total=contractor_count,
            active=active_contractors,
        ),
        materials=MaterialSummary(
            total=material_count,
            in_circulation=materials_in_circulation,
        ),
        purchase_orders=PurchaseOrderSummary(
            pending_approval=pending_approval,
            awaiting_receipt=awaiting_receipt,
        ),
        anomalies=AnomalySummary(
            open=open_anomalies,
            by_severity=AnomalySeverity(
                CRITICAL=critical,
                HIGH=high,
                MEDIUM=medium,
                LOW=low,
            ),
        ),
        audits=AuditSummary(
            in_progress=audits_in_progress,
            pending_analysis=audits_pending_analysis,
        ),
        reconciliations=ReconciliationSummary(
            pending_review=recon_pending_review,
        ),
        rejections=RejectionSummary(
            pending_approval=rejection_pending_approval,
            pending_receipt=rejection_pending_receipt,
        ),
        recent_activity=recent_activity,
    )
