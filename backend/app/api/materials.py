import logging
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Material, Contractor, ContractorInventory, Warehouse, WarehouseInventory, MaterialIssuance
from app.schemas import MaterialCreate, MaterialResponse, MaterialIssue
from app.schemas.issuance import IssuanceRequest, IssuanceResponse
from app.services.unit_conversion_service import convert_quantity, get_conversion_factor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/materials", tags=["materials"])

# Default warehouse code for backward compatibility
DEFAULT_WAREHOUSE_CODE = "WH-DEFAULT"


def get_or_create_default_warehouse(db: Session) -> Warehouse:
    """Get or create the default warehouse for legacy API compatibility."""
    warehouse = db.query(Warehouse).filter(Warehouse.code == DEFAULT_WAREHOUSE_CODE).first()
    if not warehouse:
        # Try to find any active warehouse
        warehouse = db.query(Warehouse).filter(Warehouse.is_active == True).first()
    if not warehouse:
        # Create default warehouse
        warehouse = Warehouse(
            code=DEFAULT_WAREHOUSE_CODE,
            name="Default Warehouse",
            location="Default Location",
            is_active=True,
        )
        db.add(warehouse)
        db.commit()
        db.refresh(warehouse)
        logger.info(f"Created default warehouse: {warehouse.code}")
    return warehouse


@router.get("", response_model=list[MaterialResponse])
def list_materials(db: Session = Depends(get_db)):
    return db.query(Material).all()


@router.post("", response_model=MaterialResponse)
def create_material(material: MaterialCreate, db: Session = Depends(get_db)):
    db_material = Material(**material.model_dump())
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material


@router.post("/issue")
def issue_material(
    issue: MaterialIssue,
    warehouse_id: Optional[int] = Query(None, description="Warehouse to issue from (uses default if not specified)"),
    db: Session = Depends(get_db),
):
    """
    Issue material to a contractor.

    This endpoint maintains backward compatibility with the legacy API while using
    the new enhanced issuance system internally. It:
    - Creates a proper transaction log
    - Deducts from warehouse inventory
    - Adds to contractor inventory

    If warehouse_id is not specified, uses the default warehouse.
    """
    # Validate contractor
    contractor = db.query(Contractor).filter(Contractor.id == issue.contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    # Validate material
    material = db.query(Material).filter(Material.id == issue.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    # Get warehouse
    if warehouse_id:
        warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
        if not warehouse:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        if not warehouse.is_active:
            raise HTTPException(status_code=400, detail="Warehouse is not active")
    else:
        warehouse = get_or_create_default_warehouse(db)

    # Use material's default unit
    base_unit = material.unit.strip().lower()
    quantity = Decimal(str(issue.quantity))

    # Check warehouse has sufficient stock (with row lock)
    warehouse_inv = db.query(WarehouseInventory).filter(
        WarehouseInventory.warehouse_id == warehouse.id,
        WarehouseInventory.material_id == issue.material_id,
    ).with_for_update().first()

    if not warehouse_inv:
        raise HTTPException(
            status_code=400,
            detail=f"Material '{material.name}' not found in warehouse '{warehouse.name}'. "
                   f"Please add stock to the warehouse first."
        )

    # Convert warehouse quantity to base unit for comparison
    warehouse_unit = warehouse_inv.unit_of_measure.strip().lower()
    if warehouse_unit == base_unit:
        warehouse_qty_in_base = Decimal(str(warehouse_inv.current_quantity))
    else:
        warehouse_qty_in_base = convert_quantity(
            material_id=issue.material_id,
            quantity=warehouse_inv.current_quantity,
            from_unit=warehouse_unit,
            to_unit=base_unit,
            db=db,
        )

    if warehouse_qty_in_base < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient warehouse stock. Available: {warehouse_inv.current_quantity} "
                   f"{warehouse_inv.unit_of_measure}, Requested: {issue.quantity} {base_unit}"
        )

    # Deduct from warehouse inventory (in warehouse's unit)
    from datetime import datetime
    if warehouse_unit == base_unit:
        deduction_qty = quantity
    else:
        deduction_qty = convert_quantity(
            material_id=issue.material_id,
            quantity=quantity,
            from_unit=base_unit,
            to_unit=warehouse_unit,
            db=db,
        )

    warehouse_inv.current_quantity = Decimal(str(warehouse_inv.current_quantity)) - deduction_qty
    warehouse_inv.last_updated = datetime.utcnow()

    # Add to contractor inventory (with row lock)
    contractor_inv = db.query(ContractorInventory).filter(
        ContractorInventory.contractor_id == issue.contractor_id,
        ContractorInventory.material_id == issue.material_id,
    ).with_for_update().first()

    if contractor_inv:
        contractor_inv.quantity = float(Decimal(str(contractor_inv.quantity)) + quantity)
        contractor_inv.last_updated = datetime.utcnow()
    else:
        contractor_inv = ContractorInventory(
            contractor_id=issue.contractor_id,
            material_id=issue.material_id,
            quantity=float(quantity),
        )
        db.add(contractor_inv)

    # Generate issuance number and create transaction log
    issuance_number = MaterialIssuance.generate_issuance_number(db)
    issuance = MaterialIssuance(
        issuance_number=issuance_number,
        warehouse_id=warehouse.id,
        contractor_id=issue.contractor_id,
        material_id=issue.material_id,
        quantity=quantity,
        unit_of_measure=base_unit,
        quantity_in_base_unit=quantity,
        base_unit=base_unit,
        issued_date=date.today(),
        issued_by="System (Legacy API)",
        notes="Issued via legacy /api/materials/issue endpoint",
    )
    db.add(issuance)

    db.commit()

    logger.info(
        f"Legacy API issuance {issuance_number}: {quantity} {base_unit} of {material.code} "
        f"from {warehouse.name} to {contractor.name}"
    )

    # Check if warehouse stock fell below reorder point
    if warehouse_inv.is_below_reorder_point():
        logger.warning(
            f"Stock for {material.name} ({material.code}) at {warehouse.name} "
            f"is below reorder point."
        )

    return {
        "message": "Material issued successfully",
        "issuance_number": issuance_number,
        "warehouse": warehouse.name,
        "quantity_issued": float(quantity),
        "unit": base_unit,
    }
