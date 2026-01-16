from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Contractor, FinishedGood, ProductionRecord, BOM, ContractorInventory, Consumption, Anomaly
from app.schemas import (
    ProductionReport,
    ProductionReportResult,
    ProductionHistoryItem,
    MaterialShortage,
    ConsumptionDetail,
    AnomalyBrief,
)

router = APIRouter(prefix="/api/production", tags=["production"])

VARIANCE_THRESHOLD = 0.02  # 2%


def check_inventory_anomaly(
    db: Session,
    contractor_id: int,
    material_id: int,
    material_code: str,
    material_name: str,
    required_qty: float,
    available_qty: float,
    production_record_id: int,
) -> AnomalyBrief | None:
    """
    Check if there's an inventory anomaly after production.
    Returns an AnomalyBrief if variance > 2%, otherwise None.
    """
    # Expected: inventory should cover the required quantity
    # Actual: what they actually have
    # Variance: if they don't have enough, that's a negative variance

    if required_qty == 0:
        return None

    # Calculate variance as percentage of required
    shortage = required_qty - available_qty

    if shortage <= 0:
        # They have enough, no anomaly
        return None

    variance_percent = (shortage / required_qty) * 100

    if variance_percent > (VARIANCE_THRESHOLD * 100):
        # Create anomaly record
        anomaly = Anomaly(
            contractor_id=contractor_id,
            material_id=material_id,
            production_record_id=production_record_id,
            expected_quantity=required_qty,
            actual_quantity=available_qty,
            variance=shortage,
            variance_percent=variance_percent,
            anomaly_type="shortage",
            notes=f"Contractor had {available_qty:.2f} but needed {required_qty:.2f} for production",
        )
        db.add(anomaly)

        return AnomalyBrief(
            material_code=material_code,
            material_name=material_name,
            variance_percent=round(variance_percent, 2),
            anomaly_type="shortage",
        )

    return None


@router.post("/report", response_model=ProductionReportResult)
def report_production(report: ProductionReport, db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.id == report.contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    finished_good = db.query(FinishedGood).filter(FinishedGood.id == report.finished_good_id).first()
    if not finished_good:
        raise HTTPException(status_code=404, detail="Finished good not found")

    # Get BOM for the finished good
    bom_items = db.query(BOM).filter(BOM.finished_good_id == report.finished_good_id).all()

    if not bom_items:
        raise HTTPException(status_code=400, detail="No BOM defined for this finished good")

    # Calculate expected consumption and check inventory
    warnings = []
    consumption_details = []

    for bom_item in bom_items:
        required_qty = bom_item.quantity_per_unit * report.quantity

        # Get contractor's inventory for this material
        inventory = db.query(ContractorInventory).filter(
            ContractorInventory.contractor_id == report.contractor_id,
            ContractorInventory.material_id == bom_item.material_id,
        ).first()

        available_qty = inventory.quantity if inventory else 0

        if available_qty < required_qty:
            warnings.append(MaterialShortage(
                material_code=bom_item.material.code,
                material_name=bom_item.material.name,
                required=required_qty,
                available=available_qty,
                shortage=required_qty - available_qty,
            ))

        consumption_details.append({
            "bom_item": bom_item,
            "required_qty": required_qty,
            "available_qty": available_qty,
            "inventory": inventory,
        })

    # Create production record
    record = ProductionRecord(
        contractor_id=report.contractor_id,
        finished_good_id=report.finished_good_id,
        quantity=report.quantity,
        production_date=report.production_date or date.today(),
    )
    db.add(record)
    db.flush()  # Get the record ID

    # Create consumption records, update inventory, and check for anomalies
    consumptions = []
    anomalies = []

    for detail in consumption_details:
        bom_item = detail["bom_item"]
        required_qty = detail["required_qty"]
        available_qty = detail["available_qty"]
        inventory = detail["inventory"]

        # Check for anomaly BEFORE updating inventory
        anomaly = check_inventory_anomaly(
            db=db,
            contractor_id=report.contractor_id,
            material_id=bom_item.material_id,
            material_code=bom_item.material.code,
            material_name=bom_item.material.name,
            required_qty=required_qty,
            available_qty=available_qty,
            production_record_id=record.id,
        )
        if anomaly:
            anomalies.append(anomaly)

        # Create consumption record
        consumption = Consumption(
            production_record_id=record.id,
            contractor_id=report.contractor_id,
            material_id=bom_item.material_id,
            quantity=required_qty,
        )
        db.add(consumption)

        # Update inventory (deduct materials)
        if inventory:
            inventory.quantity -= required_qty
        else:
            # Create negative inventory if none exists
            new_inventory = ContractorInventory(
                contractor_id=report.contractor_id,
                material_id=bom_item.material_id,
                quantity=-required_qty,
            )
            db.add(new_inventory)

        consumptions.append(ConsumptionDetail(
            material_code=bom_item.material.code,
            material_name=bom_item.material.name,
            quantity_consumed=required_qty,
        ))

    db.commit()
    db.refresh(record)

    return ProductionReportResult(
        id=record.id,
        contractor_id=record.contractor_id,
        finished_good_id=record.finished_good_id,
        quantity=record.quantity,
        production_date=record.production_date,
        consumptions=consumptions,
        warnings=warnings,
        anomalies=anomalies,
    )


@router.get("/history/{contractor_id}", response_model=list[ProductionHistoryItem])
def get_production_history(contractor_id: int, db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    records = db.query(ProductionRecord).filter(
        ProductionRecord.contractor_id == contractor_id
    ).order_by(ProductionRecord.production_date.desc()).all()

    return [
        ProductionHistoryItem(
            id=r.id,
            finished_good_code=r.finished_good.code,
            finished_good_name=r.finished_good.name,
            quantity=r.quantity,
            production_date=r.production_date,
        )
        for r in records
    ]
