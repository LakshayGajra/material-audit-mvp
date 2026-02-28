from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    Contractor,
    ContractorInventory,
    Material,
    MaterialIssuance,
    Consumption,
    Anomaly,
    InventoryCheck,
)

router = APIRouter(prefix="/api/contractor-portal", tags=["contractor-portal"])


@router.get("/{contractor_id}/inventory-summary")
def get_contractor_inventory_summary(contractor_id: int, db: Session = Depends(get_db)):
    """
    Get a contractor's inventory summary with issued, consumed, and current quantities per material.
    """
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    # Total issued per material
    issued_subq = (
        db.query(
            MaterialIssuance.material_id,
            func.sum(MaterialIssuance.quantity_in_base_unit).label("total_issued"),
        )
        .filter(MaterialIssuance.contractor_id == contractor_id)
        .group_by(MaterialIssuance.material_id)
        .subquery()
    )

    # Total consumed per material
    consumed_subq = (
        db.query(
            Consumption.material_id,
            func.sum(Consumption.quantity).label("total_consumed"),
        )
        .filter(Consumption.contractor_id == contractor_id)
        .group_by(Consumption.material_id)
        .subquery()
    )

    # Current inventory
    inventory_subq = (
        db.query(
            ContractorInventory.material_id,
            ContractorInventory.quantity.label("current_qty"),
        )
        .filter(ContractorInventory.contractor_id == contractor_id)
        .subquery()
    )

    # Join all together on material
    results = (
        db.query(
            Material.id.label("material_id"),
            Material.code.label("material_code"),
            Material.name.label("material_name"),
            Material.unit,
            func.coalesce(issued_subq.c.total_issued, 0).label("total_issued"),
            func.coalesce(consumed_subq.c.total_consumed, 0).label("total_consumed"),
            func.coalesce(inventory_subq.c.current_qty, 0).label("current_qty"),
        )
        .outerjoin(issued_subq, Material.id == issued_subq.c.material_id)
        .outerjoin(consumed_subq, Material.id == consumed_subq.c.material_id)
        .outerjoin(inventory_subq, Material.id == inventory_subq.c.material_id)
        .filter(
            # Only include materials that have some relationship to this contractor
            (issued_subq.c.total_issued.isnot(None))
            | (consumed_subq.c.total_consumed.isnot(None))
            | (inventory_subq.c.current_qty.isnot(None))
        )
        .all()
    )

    return [
        {
            "material_id": r.material_id,
            "material_code": r.material_code,
            "material_name": r.material_name,
            "unit": r.unit,
            "total_issued": float(r.total_issued),
            "total_consumed": float(r.total_consumed),
            "current_qty": float(r.current_qty),
        }
        for r in results
    ]


@router.get("/auditor/contractor-rankings")
def get_contractor_rankings(db: Session = Depends(get_db)):
    """
    Get contractor rankings for auditors, sorted by open anomaly count and max variance.
    """
    # Open anomaly count per contractor
    anomaly_subq = (
        db.query(
            Anomaly.contractor_id,
            func.count(Anomaly.id).label("open_anomaly_count"),
            func.max(func.abs(Anomaly.variance_percent)).label("max_variance_percent"),
        )
        .filter(Anomaly.resolved == False)
        .group_by(Anomaly.contractor_id)
        .subquery()
    )

    # Last check date per contractor
    check_subq = (
        db.query(
            InventoryCheck.contractor_id,
            func.max(InventoryCheck.check_date).label("last_check_date"),
        )
        .group_by(InventoryCheck.contractor_id)
        .subquery()
    )

    results = (
        db.query(
            Contractor.id.label("contractor_id"),
            Contractor.name.label("contractor_name"),
            Contractor.code.label("contractor_code"),
            func.coalesce(anomaly_subq.c.open_anomaly_count, 0).label("open_anomaly_count"),
            func.coalesce(anomaly_subq.c.max_variance_percent, 0).label("max_variance_percent"),
            check_subq.c.last_check_date,
        )
        .outerjoin(anomaly_subq, Contractor.id == anomaly_subq.c.contractor_id)
        .outerjoin(check_subq, Contractor.id == check_subq.c.contractor_id)
        .filter(Contractor.is_active == True)
        .order_by(
            func.coalesce(anomaly_subq.c.open_anomaly_count, 0).desc(),
            func.coalesce(anomaly_subq.c.max_variance_percent, 0).desc(),
        )
        .all()
    )

    return [
        {
            "contractor_id": r.contractor_id,
            "contractor_name": r.contractor_name,
            "contractor_code": r.contractor_code,
            "open_anomaly_count": int(r.open_anomaly_count),
            "max_variance_percent": float(r.max_variance_percent),
            "last_check_date": r.last_check_date.isoformat() if r.last_check_date else None,
        }
        for r in results
    ]
