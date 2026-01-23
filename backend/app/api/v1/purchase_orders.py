import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    PurchaseOrder,
    PurchaseOrderLine,
    Supplier,
    Warehouse,
    Material,
)
from app.schemas.purchase_order import (
    POCreate,
    POUpdate,
    POResponse,
    POLineResponse,
    POListResponse,
    POApproval,
    PO_STATUSES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/purchase-orders", tags=["purchase-orders"])


def generate_po_number(db: Session) -> str:
    """Generate PO number in format PO-YYYY-NNNN."""
    year = date.today().year
    prefix = f"PO-{year}-"

    # Get the latest PO number for this year
    latest_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.po_number.like(f"{prefix}%")
    ).order_by(PurchaseOrder.po_number.desc()).first()

    if latest_po:
        try:
            last_num = int(latest_po.po_number.split("-")[-1])
            next_num = last_num + 1
        except ValueError:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{next_num:04d}"


def build_po_response(po: PurchaseOrder) -> POResponse:
    """Build POResponse from PurchaseOrder model."""
    lines = []
    for line in po.lines:
        remaining = line.remaining_quantity()
        lines.append(POLineResponse(
            id=line.id,
            material_id=line.material_id,
            material_name=line.material.name,
            material_code=line.material.code,
            quantity_ordered=Decimal(str(line.quantity_ordered)),
            unit_of_measure=line.unit_of_measure,
            unit_price=Decimal(str(line.unit_price)) if line.unit_price else None,
            quantity_received=Decimal(str(line.quantity_received)),
            remaining_quantity=remaining,
            status=line.status,
        ))

    return POResponse(
        id=po.id,
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        supplier_name=po.supplier.name,
        warehouse_id=po.warehouse_id,
        warehouse_name=po.warehouse.name,
        order_date=po.order_date,
        expected_delivery_date=po.expected_delivery_date,
        status=po.status,
        total_amount=Decimal(str(po.total_amount)) if po.total_amount else None,
        lines=lines,
        notes=po.notes,
        created_by=po.created_by,
        approved_by=po.approved_by,
        approved_at=po.approved_at,
        created_at=po.created_at,
    )


@router.post("", response_model=POResponse, status_code=201)
def create_purchase_order(po_data: POCreate, db: Session = Depends(get_db)):
    """Create a new purchase order."""
    # Validate supplier
    supplier = db.query(Supplier).filter(Supplier.id == po_data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if not supplier.is_active:
        raise HTTPException(status_code=400, detail="Supplier is not active")

    # Validate warehouse
    warehouse = db.query(Warehouse).filter(Warehouse.id == po_data.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    if not warehouse.is_active:
        raise HTTPException(status_code=400, detail="Warehouse is not active")

    # Validate materials
    material_ids = [line.material_id for line in po_data.lines]
    materials = db.query(Material).filter(Material.id.in_(material_ids)).all()
    material_map = {m.id: m for m in materials}

    missing_materials = set(material_ids) - set(material_map.keys())
    if missing_materials:
        raise HTTPException(
            status_code=404,
            detail=f"Materials not found: {list(missing_materials)}"
        )

    # Generate PO number
    po_number = generate_po_number(db)

    # Calculate total amount
    total_amount = Decimal(0)
    for line in po_data.lines:
        if line.unit_price is not None:
            total_amount += line.quantity_ordered * line.unit_price

    # Create PO
    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=po_data.supplier_id,
        warehouse_id=po_data.warehouse_id,
        order_date=date.today(),
        expected_delivery_date=po_data.expected_delivery_date,
        status="DRAFT",
        total_amount=total_amount if total_amount > 0 else None,
        notes=po_data.notes,
    )
    db.add(po)
    db.flush()  # Get PO ID

    # Create PO lines
    for line_data in po_data.lines:
        po_line = PurchaseOrderLine(
            purchase_order_id=po.id,
            material_id=line_data.material_id,
            quantity_ordered=line_data.quantity_ordered,
            unit_of_measure=line_data.unit_of_measure,
            unit_price=line_data.unit_price,
            quantity_received=Decimal(0),
            status="PENDING",
        )
        db.add(po_line)

    db.commit()
    db.refresh(po)

    logger.info(f"Created purchase order: {po.po_number}")
    return build_po_response(po)


@router.get("", response_model=list[POResponse])
def list_purchase_orders(
    supplier_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """List purchase orders with optional filters."""
    query = db.query(PurchaseOrder)

    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    if warehouse_id:
        query = query.filter(PurchaseOrder.warehouse_id == warehouse_id)
    if status:
        if status not in PO_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(PO_STATUSES)}"
            )
        query = query.filter(PurchaseOrder.status == status)
    if date_from:
        query = query.filter(PurchaseOrder.order_date >= date_from)
    if date_to:
        query = query.filter(PurchaseOrder.order_date <= date_to)

    pos = query.order_by(PurchaseOrder.created_at.desc()).all()
    return [build_po_response(po) for po in pos]


@router.get("/{po_id}", response_model=POResponse)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    """Get a single purchase order with all lines."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return build_po_response(po)


@router.put("/{po_id}/submit", response_model=POResponse)
def submit_purchase_order(po_id: int, db: Session = Depends(get_db)):
    """Submit a purchase order for approval. DRAFT -> SUBMITTED."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail=f"Only DRAFT orders can be submitted. Current status: {po.status}"
        )

    po.status = "SUBMITTED"
    db.commit()
    db.refresh(po)

    logger.info(f"Submitted purchase order: {po.po_number}")
    return build_po_response(po)


@router.put("/{po_id}/approve", response_model=POResponse)
def approve_purchase_order(
    po_id: int,
    approval: POApproval,
    db: Session = Depends(get_db),
):
    """Approve a purchase order. SUBMITTED -> APPROVED."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status != "SUBMITTED":
        raise HTTPException(
            status_code=400,
            detail=f"Only SUBMITTED orders can be approved. Current status: {po.status}"
        )

    po.status = "APPROVED"
    po.approved_by = approval.approved_by
    po.approved_at = datetime.now()
    if approval.notes:
        po.notes = (po.notes or "") + f"\n[Approval note]: {approval.notes}"

    db.commit()
    db.refresh(po)

    logger.info(f"Approved purchase order: {po.po_number} by {approval.approved_by}")
    return build_po_response(po)


@router.put("/{po_id}/cancel", response_model=POResponse)
def cancel_purchase_order(
    po_id: int,
    reason: str = Query(..., min_length=1, description="Cancellation reason"),
    db: Session = Depends(get_db),
):
    """Cancel a purchase order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status == "RECEIVED":
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel a fully received order"
        )

    if po.status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Order is already cancelled"
        )

    # Check if any materials have been received
    received_lines = [line for line in po.lines if line.quantity_received > 0]
    if received_lines:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel order with {len(received_lines)} lines already received. "
                   "Create a return instead."
        )

    po.status = "CANCELLED"
    po.notes = (po.notes or "") + f"\n[Cancelled]: {reason}"

    # Cancel all lines
    for line in po.lines:
        line.status = "CANCELLED"

    db.commit()
    db.refresh(po)

    logger.info(f"Cancelled purchase order: {po.po_number}, reason: {reason}")
    return build_po_response(po)
