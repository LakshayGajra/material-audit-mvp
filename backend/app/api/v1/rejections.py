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
    MaterialRejection,
)
from app.schemas.rejection import (
    RejectionReportRequest,
    RejectionApprovalRequest,
    RejectionReceiveRequest,
    RejectionDisputeRequest,
    RejectionResponse,
    RejectionListResponse,
)
from app.services.unit_conversion_service import convert_quantity, get_conversion_factor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rejections", tags=["rejections"])


def build_rejection_response(rejection: MaterialRejection) -> RejectionResponse:
    """Build RejectionResponse from MaterialRejection model."""
    return RejectionResponse(
        id=rejection.id,
        rejection_number=rejection.rejection_number,
        contractor_id=rejection.contractor_id,
        contractor_name=rejection.contractor.name,
        material_id=rejection.material_id,
        material_name=rejection.material.name,
        material_code=rejection.material.code,
        quantity_rejected=Decimal(str(rejection.quantity_rejected)),
        unit_of_measure=rejection.unit_of_measure,
        rejection_date=rejection.rejection_date,
        rejection_reason=rejection.rejection_reason,
        reported_by=rejection.reported_by,
        original_issuance_id=rejection.original_issuance_id,
        original_issuance_number=rejection.original_issuance.issuance_number if rejection.original_issuance else None,
        status=rejection.status,
        return_warehouse_id=rejection.return_warehouse_id,
        return_warehouse_name=rejection.return_warehouse.name if rejection.return_warehouse else None,
        approved_by=rejection.approved_by,
        approved_at=rejection.approved_at,
        received_by=rejection.received_by,
        received_at=rejection.received_at,
        warehouse_grn_number=rejection.warehouse_grn_number,
        notes=rejection.notes,
        created_at=rejection.created_at,
    )


@router.post("/report", response_model=RejectionResponse, status_code=201)
def report_rejection(
    request: RejectionReportRequest,
    db: Session = Depends(get_db),
):
    """
    Contractor reports rejected material.

    This creates a rejection record with status = REPORTED.
    Inventory is NOT updated at this stage - only when material is received back at warehouse.
    """
    # Validate contractor
    contractor = db.query(Contractor).filter(Contractor.id == request.contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    # Validate material
    material = db.query(Material).filter(Material.id == request.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    # Check contractor has this material in inventory
    contractor_inv = db.query(ContractorInventory).filter(
        ContractorInventory.contractor_id == request.contractor_id,
        ContractorInventory.material_id == request.material_id,
    ).first()

    if not contractor_inv or contractor_inv.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Contractor does not have '{material.name}' in inventory"
        )

    # Convert quantity to contractor's unit (material's base unit)
    base_unit = material.unit.strip().lower()
    rejection_unit = request.unit_of_measure.strip().lower()

    if rejection_unit == base_unit:
        quantity_in_base = request.quantity_rejected
    else:
        factor = get_conversion_factor(
            material_id=request.material_id,
            from_unit=rejection_unit,
            to_unit=base_unit,
            db=db,
        )
        if factor is None:
            raise HTTPException(
                status_code=400,
                detail=f"No conversion defined for {material.name} from {rejection_unit} to {base_unit}"
            )
        quantity_in_base = convert_quantity(
            material_id=request.material_id,
            quantity=request.quantity_rejected,
            from_unit=rejection_unit,
            to_unit=base_unit,
            db=db,
        )

    # Validate quantity doesn't exceed contractor's inventory
    if float(quantity_in_base) > float(contractor_inv.quantity):
        raise HTTPException(
            status_code=400,
            detail=f"Rejection quantity ({request.quantity_rejected} {rejection_unit}) exceeds "
                   f"contractor's inventory ({contractor_inv.quantity} {base_unit})"
        )

    # Validate original_issuance_id if provided
    if request.original_issuance_id:
        issuance = db.query(MaterialIssuance).filter(
            MaterialIssuance.id == request.original_issuance_id,
            MaterialIssuance.contractor_id == request.contractor_id,
            MaterialIssuance.material_id == request.material_id,
        ).first()
        if not issuance:
            raise HTTPException(
                status_code=400,
                detail="Invalid original issuance ID - must match contractor and material"
            )

    # Generate rejection number
    rejection_number = MaterialRejection.generate_rejection_number(db)

    # Create rejection record
    rejection = MaterialRejection(
        rejection_number=rejection_number,
        contractor_id=request.contractor_id,
        material_id=request.material_id,
        original_issuance_id=request.original_issuance_id,
        quantity_rejected=request.quantity_rejected,
        unit_of_measure=rejection_unit,
        rejection_date=request.rejection_date,
        rejection_reason=request.rejection_reason,
        reported_by=request.reported_by,
        status=MaterialRejection.STATUS_REPORTED,
        notes=request.notes,
    )
    db.add(rejection)
    db.commit()
    db.refresh(rejection)

    logger.info(
        f"Rejection reported {rejection_number}: {request.quantity_rejected} {rejection_unit} "
        f"of {material.code} by contractor {contractor.name}"
    )

    # TODO: Send email notification to warehouse manager
    logger.info(f"[EMAIL] Notification sent to warehouse manager about rejection {rejection_number}")

    return build_rejection_response(rejection)


@router.put("/{rejection_id}/approve", response_model=RejectionResponse)
def approve_rejection(
    rejection_id: int,
    request: RejectionApprovalRequest,
    db: Session = Depends(get_db),
):
    """
    Manager approves a rejection and specifies the return warehouse.

    Status changes: REPORTED -> APPROVED
    Inventory is still NOT updated at this stage.
    """
    rejection = db.query(MaterialRejection).filter(MaterialRejection.id == rejection_id).first()
    if not rejection:
        raise HTTPException(status_code=404, detail="Rejection not found")

    if rejection.status != MaterialRejection.STATUS_REPORTED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve rejection with status '{rejection.status}'. "
                   f"Only REPORTED rejections can be approved."
        )

    # Validate return warehouse
    warehouse = db.query(Warehouse).filter(Warehouse.id == request.return_warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Return warehouse not found")
    if not warehouse.is_active:
        raise HTTPException(status_code=400, detail="Return warehouse is not active")

    # Update rejection
    rejection.status = MaterialRejection.STATUS_APPROVED
    rejection.return_warehouse_id = request.return_warehouse_id
    rejection.approved_by = request.approved_by
    rejection.approved_at = datetime.utcnow()
    if request.notes:
        rejection.notes = (rejection.notes or "") + f"\n[Approval] {request.notes}"

    db.commit()
    db.refresh(rejection)

    logger.info(
        f"Rejection {rejection.rejection_number} approved by {request.approved_by}, "
        f"return to warehouse {warehouse.name}"
    )

    # TODO: Send email to contractor
    logger.info(
        f"[EMAIL] Notification sent to contractor: Please return material to {warehouse.name}"
    )

    return build_rejection_response(rejection)


@router.put("/{rejection_id}/receive", response_model=RejectionResponse)
def receive_rejection(
    rejection_id: int,
    request: RejectionReceiveRequest,
    db: Session = Depends(get_db),
):
    """
    Warehouse receives returned material.

    This is when inventory actually changes:
    - Contractor inventory is reduced
    - Warehouse inventory is increased

    Status changes: APPROVED -> RECEIVED_AT_WAREHOUSE
    """
    rejection = db.query(MaterialRejection).filter(MaterialRejection.id == rejection_id).first()
    if not rejection:
        raise HTTPException(status_code=404, detail="Rejection not found")

    if rejection.status != MaterialRejection.STATUS_APPROVED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot receive rejection with status '{rejection.status}'. "
                   f"Only APPROVED rejections can be received."
        )

    material = rejection.material
    # Explicitly query for warehouse to ensure it's loaded
    warehouse = db.query(Warehouse).filter(Warehouse.id == rejection.return_warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=400, detail="Return warehouse not found")
    base_unit = material.unit.strip().lower()
    rejection_unit = rejection.unit_of_measure.strip().lower()

    # Convert quantity to base unit
    if rejection_unit == base_unit:
        quantity_in_base = Decimal(str(rejection.quantity_rejected))
    else:
        quantity_in_base = convert_quantity(
            material_id=rejection.material_id,
            quantity=rejection.quantity_rejected,
            from_unit=rejection_unit,
            to_unit=base_unit,
            db=db,
        )

    # DEDUCT from contractor inventory (with row lock)
    contractor_inv = db.query(ContractorInventory).filter(
        ContractorInventory.contractor_id == rejection.contractor_id,
        ContractorInventory.material_id == rejection.material_id,
    ).with_for_update().first()

    if not contractor_inv:
        raise HTTPException(
            status_code=400,
            detail="Contractor no longer has this material in inventory"
        )

    if float(contractor_inv.quantity) < float(quantity_in_base):
        raise HTTPException(
            status_code=400,
            detail=f"Contractor's current inventory ({contractor_inv.quantity} {base_unit}) "
                   f"is less than rejection quantity ({quantity_in_base} {base_unit})"
        )

    contractor_inv.quantity = float(Decimal(str(contractor_inv.quantity)) - quantity_in_base)
    contractor_inv.last_updated = datetime.utcnow()

    # ADD to warehouse inventory (with row lock)
    warehouse_inv = db.query(WarehouseInventory).filter(
        WarehouseInventory.warehouse_id == warehouse.id,
        WarehouseInventory.material_id == rejection.material_id,
    ).with_for_update().first()

    # Convert to warehouse unit
    if warehouse_inv:
        warehouse_unit = warehouse_inv.unit_of_measure.strip().lower()
        if warehouse_unit == base_unit:
            quantity_in_warehouse_unit = quantity_in_base
        else:
            quantity_in_warehouse_unit = convert_quantity(
                material_id=rejection.material_id,
                quantity=quantity_in_base,
                from_unit=base_unit,
                to_unit=warehouse_unit,
                db=db,
            )
        warehouse_inv.current_quantity = Decimal(str(warehouse_inv.current_quantity)) + quantity_in_warehouse_unit
        warehouse_inv.last_updated = datetime.utcnow()
    else:
        # Create new warehouse inventory record
        warehouse_inv = WarehouseInventory(
            warehouse_id=warehouse.id,
            material_id=rejection.material_id,
            current_quantity=quantity_in_base,
            unit_of_measure=base_unit,
            reorder_point=0,
            reorder_quantity=0,
        )
        db.add(warehouse_inv)

    # Generate return GRN number
    grn_number = MaterialRejection.generate_return_grn_number(db)

    # Update rejection record
    rejection.status = MaterialRejection.STATUS_RECEIVED_AT_WAREHOUSE
    rejection.received_by = request.received_by
    rejection.received_at = datetime.utcnow()
    rejection.warehouse_grn_number = grn_number
    if request.notes:
        rejection.notes = (rejection.notes or "") + f"\n[Receipt] {request.notes}"

    db.commit()
    db.refresh(rejection)

    logger.info(
        f"Rejection {rejection.rejection_number} received at {warehouse.name}. "
        f"GRN: {grn_number}. Contractor inventory reduced, warehouse inventory increased."
    )

    # TODO: Send confirmation email
    logger.info(f"[EMAIL] Confirmation sent for rejection receipt {grn_number}")

    return build_rejection_response(rejection)


@router.put("/{rejection_id}/dispute", response_model=RejectionResponse)
def dispute_rejection(
    rejection_id: int,
    request: RejectionDisputeRequest,
    db: Session = Depends(get_db),
):
    """
    Manager disputes a rejection claim.

    Status changes: REPORTED -> DISPUTED
    No inventory changes occur.
    """
    rejection = db.query(MaterialRejection).filter(MaterialRejection.id == rejection_id).first()
    if not rejection:
        raise HTTPException(status_code=404, detail="Rejection not found")

    if rejection.status != MaterialRejection.STATUS_REPORTED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot dispute rejection with status '{rejection.status}'. "
                   f"Only REPORTED rejections can be disputed."
        )

    # Update rejection
    rejection.status = MaterialRejection.STATUS_DISPUTED
    rejection.notes = (rejection.notes or "") + f"\n[Disputed by {request.disputed_by}] {request.reason}"

    db.commit()
    db.refresh(rejection)

    logger.info(
        f"Rejection {rejection.rejection_number} disputed by {request.disputed_by}: {request.reason}"
    )

    # TODO: Send notification to contractor
    logger.info(f"[EMAIL] Notification sent to contractor about dispute")

    return build_rejection_response(rejection)


@router.get("", response_model=RejectionListResponse)
def list_rejections(
    contractor_id: Optional[int] = Query(None, description="Filter by contractor"),
    material_id: Optional[int] = Query(None, description="Filter by material"),
    status: Optional[str] = Query(None, description="Filter by status"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """List all rejections with optional filters."""
    from datetime import datetime as dt

    query = db.query(MaterialRejection)

    if contractor_id is not None:
        query = query.filter(MaterialRejection.contractor_id == contractor_id)
    if material_id is not None:
        query = query.filter(MaterialRejection.material_id == material_id)
    if status:
        query = query.filter(MaterialRejection.status == status)
    if date_from:
        try:
            from_date = dt.strptime(date_from, "%Y-%m-%d").date()
            query = query.filter(MaterialRejection.rejection_date >= from_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
    if date_to:
        try:
            to_date = dt.strptime(date_to, "%Y-%m-%d").date()
            query = query.filter(MaterialRejection.rejection_date <= to_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")

    total = query.count()
    offset = (page - 1) * page_size
    rejections = query.order_by(MaterialRejection.rejection_date.desc(), MaterialRejection.id.desc()) \
        .offset(offset).limit(page_size).all()

    return RejectionListResponse(
        items=[build_rejection_response(r) for r in rejections],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/pending-approval", response_model=RejectionListResponse)
def list_pending_approval(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List rejections pending approval (status = REPORTED)."""
    query = db.query(MaterialRejection).filter(
        MaterialRejection.status == MaterialRejection.STATUS_REPORTED
    )

    total = query.count()
    offset = (page - 1) * page_size
    rejections = query.order_by(MaterialRejection.rejection_date.desc()) \
        .offset(offset).limit(page_size).all()

    return RejectionListResponse(
        items=[build_rejection_response(r) for r in rejections],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/pending-receipt", response_model=RejectionListResponse)
def list_pending_receipt(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List rejections pending receipt at warehouse (status = APPROVED)."""
    query = db.query(MaterialRejection).filter(
        MaterialRejection.status == MaterialRejection.STATUS_APPROVED
    )

    total = query.count()
    offset = (page - 1) * page_size
    rejections = query.order_by(MaterialRejection.approved_at.desc()) \
        .offset(offset).limit(page_size).all()

    return RejectionListResponse(
        items=[build_rejection_response(r) for r in rejections],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{rejection_id}", response_model=RejectionResponse)
def get_rejection(rejection_id: int, db: Session = Depends(get_db)):
    """Get a single rejection by ID."""
    rejection = db.query(MaterialRejection).filter(MaterialRejection.id == rejection_id).first()
    if not rejection:
        raise HTTPException(status_code=404, detail="Rejection not found")
    return build_rejection_response(rejection)
