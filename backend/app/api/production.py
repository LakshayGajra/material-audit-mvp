from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Contractor, FinishedGood, ProductionRecord, BOM, ContractorInventory, Consumption
from app.schemas import (
    ProductionReport,
    ProductionReportResult,
    ProductionHistoryItem,
    MaterialShortage,
    ConsumptionDetail,
)

router = APIRouter(prefix="/api/production", tags=["production"])


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

    # Create consumption records and update inventory
    consumptions = []
    for detail in consumption_details:
        bom_item = detail["bom_item"]
        required_qty = detail["required_qty"]
        inventory = detail["inventory"]

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
