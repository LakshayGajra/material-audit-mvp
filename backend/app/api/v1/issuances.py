import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Warehouse,
    Contractor,
    Material,
    WarehouseInventory,
    ContractorInventory,
    MaterialIssuance,
)
from app.schemas.issuance import (
    IssuanceRequest,
    IssuanceResponse,
    IssuanceListResponse,
)
from app.services.unit_conversion_service import convert_quantity, get_conversion_factor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/issuances", tags=["issuances"])


def build_issuance_response(issuance: MaterialIssuance) -> IssuanceResponse:
    """Build IssuanceResponse from MaterialIssuance model."""
    return IssuanceResponse(
        id=issuance.id,
        issuance_number=issuance.issuance_number,
        warehouse_id=issuance.warehouse_id,
        warehouse_name=issuance.warehouse.name,
        contractor_id=issuance.contractor_id,
        contractor_name=issuance.contractor.name,
        material_id=issuance.material_id,
        material_name=issuance.material.name,
        material_code=issuance.material.code,
        quantity=Decimal(str(issuance.quantity)),
        unit_of_measure=issuance.unit_of_measure,
        quantity_in_base_unit=Decimal(str(issuance.quantity_in_base_unit)),
        base_unit=issuance.base_unit,
        issued_date=issuance.issued_date,
        issued_by=issuance.issued_by,
        notes=issuance.notes,
        created_at=issuance.created_at,
    )


@router.post("", response_model=IssuanceResponse, status_code=201)
def create_issuance(
    request: IssuanceRequest,
    db: Session = Depends(get_db),
):
    """
    Create a material issuance from warehouse to contractor.

    This is a transactional operation that:
    1. Validates all entities exist and are active
    2. Converts quantity to base unit
    3. Deducts from warehouse inventory
    4. Adds to contractor inventory
    5. Creates permanent transaction log
    """
    # 1. Validate warehouse exists and is active
    warehouse = db.query(Warehouse).filter(Warehouse.id == request.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    if not warehouse.is_active:
        raise HTTPException(status_code=400, detail="Warehouse is not active")

    # 2. Validate contractor exists
    contractor = db.query(Contractor).filter(Contractor.id == request.contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    # 3. Validate material exists
    material = db.query(Material).filter(Material.id == request.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    # 4. Determine base unit for contractor inventory
    # Use material's default unit as the base unit
    base_unit = material.unit.strip().lower()

    # 5. Convert quantity to base unit
    issuance_unit = request.unit_of_measure.strip().lower()

    if issuance_unit == base_unit:
        quantity_in_base_unit = request.quantity
    else:
        # Check if conversion exists
        factor = get_conversion_factor(
            material_id=request.material_id,
            from_unit=issuance_unit,
            to_unit=base_unit,
            db=db,
        )
        if factor is None:
            raise HTTPException(
                status_code=400,
                detail=f"No conversion defined for {material.name} ({material.code}) "
                       f"from {issuance_unit} to {base_unit}"
            )
        quantity_in_base_unit = convert_quantity(
            material_id=request.material_id,
            quantity=request.quantity,
            from_unit=issuance_unit,
            to_unit=base_unit,
            db=db,
        )

    # 6. Check warehouse has sufficient stock (with row lock)
    warehouse_inv = db.query(WarehouseInventory).filter(
        WarehouseInventory.warehouse_id == request.warehouse_id,
        WarehouseInventory.material_id == request.material_id,
    ).with_for_update().first()

    if not warehouse_inv:
        raise HTTPException(
            status_code=400,
            detail=f"Material '{material.name}' not found in warehouse '{warehouse.name}'"
        )

    # Convert warehouse quantity to base unit for comparison
    warehouse_unit = warehouse_inv.unit_of_measure.strip().lower()
    if warehouse_unit == base_unit:
        warehouse_qty_in_base = Decimal(str(warehouse_inv.current_quantity))
    else:
        warehouse_qty_in_base = convert_quantity(
            material_id=request.material_id,
            quantity=warehouse_inv.current_quantity,
            from_unit=warehouse_unit,
            to_unit=base_unit,
            db=db,
        )

    if warehouse_qty_in_base < quantity_in_base_unit:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient warehouse stock. Available: {warehouse_inv.current_quantity} "
                   f"{warehouse_inv.unit_of_measure}, Requested: {request.quantity} {issuance_unit}"
        )

    # 7. Deduct from warehouse inventory (in warehouse's unit)
    if warehouse_unit == base_unit:
        deduction_qty = quantity_in_base_unit
    else:
        deduction_qty = convert_quantity(
            material_id=request.material_id,
            quantity=quantity_in_base_unit,
            from_unit=base_unit,
            to_unit=warehouse_unit,
            db=db,
        )

    warehouse_inv.current_quantity = Decimal(str(warehouse_inv.current_quantity)) - deduction_qty
    warehouse_inv.last_updated = datetime.utcnow()

    # 8. Add to contractor inventory (with row lock)
    contractor_inv = db.query(ContractorInventory).filter(
        ContractorInventory.contractor_id == request.contractor_id,
        ContractorInventory.material_id == request.material_id,
    ).with_for_update().first()

    if contractor_inv:
        # Add to existing inventory (contractor inventory uses Float, convert appropriately)
        contractor_inv.quantity = float(Decimal(str(contractor_inv.quantity)) + quantity_in_base_unit)
        contractor_inv.last_updated = datetime.utcnow()
    else:
        # Create new contractor inventory record
        contractor_inv = ContractorInventory(
            contractor_id=request.contractor_id,
            material_id=request.material_id,
            quantity=float(quantity_in_base_unit),
        )
        db.add(contractor_inv)

    # 9. Generate issuance number
    issuance_number = MaterialIssuance.generate_issuance_number(db)

    # 10. Create material issuance record (permanent transaction log)
    issuance = MaterialIssuance(
        issuance_number=issuance_number,
        warehouse_id=request.warehouse_id,
        contractor_id=request.contractor_id,
        material_id=request.material_id,
        quantity=request.quantity,
        unit_of_measure=issuance_unit,
        quantity_in_base_unit=quantity_in_base_unit,
        base_unit=base_unit,
        issued_date=request.issued_date,
        issued_by=request.issued_by,
        notes=request.notes,
    )
    db.add(issuance)

    # 11. Commit transaction
    db.commit()
    db.refresh(issuance)

    logger.info(
        f"Created issuance {issuance_number}: {request.quantity} {issuance_unit} "
        f"({quantity_in_base_unit} {base_unit}) of {material.code} "
        f"from {warehouse.name} to {contractor.name}"
    )

    # 12. Check if warehouse stock fell below reorder point
    if warehouse_inv.is_below_reorder_point():
        logger.warning(
            f"Stock for {material.name} ({material.code}) at {warehouse.name} "
            f"is below reorder point. Current: {warehouse_inv.current_quantity} "
            f"{warehouse_inv.unit_of_measure}, Reorder point: {warehouse_inv.reorder_point}"
        )

    return build_issuance_response(issuance)


@router.get("", response_model=IssuanceListResponse)
def list_issuances(
    contractor_id: Optional[int] = Query(None, description="Filter by contractor"),
    material_id: Optional[int] = Query(None, description="Filter by material"),
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """List all issuances with optional filters."""
    from datetime import datetime as dt

    query = db.query(MaterialIssuance)

    if contractor_id is not None:
        query = query.filter(MaterialIssuance.contractor_id == contractor_id)
    if material_id is not None:
        query = query.filter(MaterialIssuance.material_id == material_id)
    if warehouse_id is not None:
        query = query.filter(MaterialIssuance.warehouse_id == warehouse_id)
    if date_from:
        try:
            from_date = dt.strptime(date_from, "%Y-%m-%d").date()
            query = query.filter(MaterialIssuance.issued_date >= from_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
    if date_to:
        try:
            to_date = dt.strptime(date_to, "%Y-%m-%d").date()
            query = query.filter(MaterialIssuance.issued_date <= to_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    issuances = query.order_by(MaterialIssuance.issued_date.desc(), MaterialIssuance.id.desc()) \
        .offset(offset).limit(page_size).all()

    return IssuanceListResponse(
        items=[build_issuance_response(i) for i in issuances],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{issuance_id}", response_model=IssuanceResponse)
def get_issuance(issuance_id: int, db: Session = Depends(get_db)):
    """Get a single issuance by ID."""
    issuance = db.query(MaterialIssuance).filter(MaterialIssuance.id == issuance_id).first()
    if not issuance:
        raise HTTPException(status_code=404, detail="Issuance not found")
    return build_issuance_response(issuance)


# Additional routers for contractor and material history
contractor_router = APIRouter(prefix="/api/v1/contractors", tags=["contractors"])
material_router = APIRouter(prefix="/api/v1/materials", tags=["materials"])


@contractor_router.get("/{contractor_id}/issuance-history", response_model=IssuanceListResponse)
def get_contractor_issuance_history(
    contractor_id: int,
    material_id: Optional[int] = Query(None, description="Filter by material"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get issuance history for a specific contractor."""
    from datetime import datetime as dt

    # Verify contractor exists
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    query = db.query(MaterialIssuance).filter(MaterialIssuance.contractor_id == contractor_id)

    if material_id is not None:
        query = query.filter(MaterialIssuance.material_id == material_id)
    if date_from:
        try:
            from_date = dt.strptime(date_from, "%Y-%m-%d").date()
            query = query.filter(MaterialIssuance.issued_date >= from_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
    if date_to:
        try:
            to_date = dt.strptime(date_to, "%Y-%m-%d").date()
            query = query.filter(MaterialIssuance.issued_date <= to_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")

    total = query.count()
    offset = (page - 1) * page_size
    issuances = query.order_by(MaterialIssuance.issued_date.desc(), MaterialIssuance.id.desc()) \
        .offset(offset).limit(page_size).all()

    return IssuanceListResponse(
        items=[build_issuance_response(i) for i in issuances],
        total=total,
        page=page,
        page_size=page_size,
    )


@material_router.get("/{material_id}/issuance-history", response_model=IssuanceListResponse)
def get_material_issuance_history(
    material_id: int,
    contractor_id: Optional[int] = Query(None, description="Filter by contractor"),
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get issuance history for a specific material."""
    from datetime import datetime as dt

    # Verify material exists
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    query = db.query(MaterialIssuance).filter(MaterialIssuance.material_id == material_id)

    if contractor_id is not None:
        query = query.filter(MaterialIssuance.contractor_id == contractor_id)
    if warehouse_id is not None:
        query = query.filter(MaterialIssuance.warehouse_id == warehouse_id)
    if date_from:
        try:
            from_date = dt.strptime(date_from, "%Y-%m-%d").date()
            query = query.filter(MaterialIssuance.issued_date >= from_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
    if date_to:
        try:
            to_date = dt.strptime(date_to, "%Y-%m-%d").date()
            query = query.filter(MaterialIssuance.issued_date <= to_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")

    total = query.count()
    offset = (page - 1) * page_size
    issuances = query.order_by(MaterialIssuance.issued_date.desc(), MaterialIssuance.id.desc()) \
        .offset(offset).limit(page_size).all()

    return IssuanceListResponse(
        items=[build_issuance_response(i) for i in issuances],
        total=total,
        page=page,
        page_size=page_size,
    )
