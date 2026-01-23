import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    GoodsReceipt,
    GoodsReceiptLine,
    PurchaseOrder,
    PurchaseOrderLine,
    Warehouse,
    WarehouseInventory,
    Material,
)
from app.schemas.goods_receipt import (
    GRNCreate,
    GRNResponse,
    GRNLineResponse,
    GRNListResponse,
)
from app.services.unit_conversion_service import convert_quantity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/goods-receipts", tags=["goods-receipts"])


def generate_grn_number(db: Session) -> str:
    """Generate GRN number in format GRN-YYYY-NNNN."""
    year = date.today().year
    prefix = f"GRN-{year}-"

    latest_grn = db.query(GoodsReceipt).filter(
        GoodsReceipt.grn_number.like(f"{prefix}%")
    ).order_by(GoodsReceipt.grn_number.desc()).first()

    if latest_grn:
        try:
            last_num = int(latest_grn.grn_number.split("-")[-1])
            next_num = last_num + 1
        except ValueError:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{next_num:04d}"


def build_grn_response(grn: GoodsReceipt) -> GRNResponse:
    """Build GRNResponse from GoodsReceipt model."""
    lines = []
    for line in grn.lines:
        lines.append(GRNLineResponse(
            id=line.id,
            po_line_id=line.po_line_id,
            material_id=line.material_id,
            material_name=line.material.name,
            material_code=line.material.code,
            quantity_received=Decimal(str(line.quantity_received)),
            unit_of_measure=line.unit_of_measure,
            batch_number=line.batch_number,
            remarks=line.remarks,
        ))

    return GRNResponse(
        id=grn.id,
        grn_number=grn.grn_number,
        purchase_order_id=grn.purchase_order_id,
        po_number=grn.purchase_order.po_number,
        warehouse_id=grn.warehouse_id,
        warehouse_name=grn.warehouse.name,
        receipt_date=grn.receipt_date,
        received_by=grn.received_by,
        vehicle_number=grn.vehicle_number,
        supplier_challan_number=grn.supplier_challan_number,
        lines=lines,
        notes=grn.notes,
        created_at=grn.created_at,
    )


@router.post("", response_model=GRNResponse, status_code=201)
def create_goods_receipt(grn_data: GRNCreate, db: Session = Depends(get_db)):
    """
    Create a goods receipt note (GRN) and update warehouse inventory.

    This is a CRITICAL transaction that:
    1. Validates PO and lines
    2. Updates warehouse inventory
    3. Updates PO line quantities
    4. Updates PO status
    """
    try:
        # 1. Validate PO exists and has correct status
        po = db.query(PurchaseOrder).filter(
            PurchaseOrder.id == grn_data.purchase_order_id
        ).first()

        if not po:
            raise HTTPException(status_code=404, detail="Purchase order not found")

        if po.status not in ["APPROVED", "PARTIALLY_RECEIVED"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot receive goods for PO with status '{po.status}'. "
                       "PO must be APPROVED or PARTIALLY_RECEIVED."
            )

        # Get warehouse from PO
        warehouse = po.warehouse
        if not warehouse.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"Warehouse '{warehouse.name}' is not active"
            )

        # 2. Validate all po_line_ids belong to this PO
        po_line_ids = [line.po_line_id for line in grn_data.lines]
        po_lines = db.query(PurchaseOrderLine).filter(
            PurchaseOrderLine.id.in_(po_line_ids),
            PurchaseOrderLine.purchase_order_id == po.id,
        ).all()

        po_line_map = {pl.id: pl for pl in po_lines}

        invalid_lines = set(po_line_ids) - set(po_line_map.keys())
        if invalid_lines:
            raise HTTPException(
                status_code=400,
                detail=f"PO line IDs {list(invalid_lines)} do not belong to PO {po.po_number}"
            )

        # Generate GRN number
        grn_number = generate_grn_number(db)

        # Create GRN record
        grn = GoodsReceipt(
            grn_number=grn_number,
            purchase_order_id=po.id,
            warehouse_id=warehouse.id,
            receipt_date=grn_data.receipt_date,
            received_by=grn_data.received_by,
            vehicle_number=grn_data.vehicle_number,
            supplier_challan_number=grn_data.supplier_challan_number,
            notes=grn_data.notes,
        )
        db.add(grn)
        db.flush()  # Get GRN ID

        # 4. Process each line
        for line_data in grn_data.lines:
            po_line = po_line_map[line_data.po_line_id]
            material = po_line.material

            # a. Check quantity doesn't exceed remaining
            remaining = po_line.remaining_quantity()
            if line_data.quantity_received > remaining:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot receive {line_data.quantity_received} {po_line.unit_of_measure} "
                           f"for material '{material.code}'. "
                           f"Only {remaining} {po_line.unit_of_measure} remaining on PO line."
                )

            # b. Get or create warehouse inventory
            inventory = db.query(WarehouseInventory).filter(
                WarehouseInventory.warehouse_id == warehouse.id,
                WarehouseInventory.material_id == material.id,
            ).first()

            if inventory:
                storage_unit = inventory.unit_of_measure
            else:
                # Create new inventory record with PO unit as storage unit
                storage_unit = po_line.unit_of_measure
                inventory = WarehouseInventory(
                    warehouse_id=warehouse.id,
                    material_id=material.id,
                    current_quantity=Decimal(0),
                    unit_of_measure=storage_unit,
                    reorder_point=Decimal(0),
                    reorder_quantity=Decimal(0),
                )
                db.add(inventory)
                db.flush()

            # c. Convert quantity if units differ
            received_qty = line_data.quantity_received
            if po_line.unit_of_measure.lower() != storage_unit.lower():
                try:
                    converted_qty = convert_quantity(
                        material_id=material.id,
                        quantity=received_qty,
                        from_unit=po_line.unit_of_measure,
                        to_unit=storage_unit,
                        db=db,
                    )
                    logger.info(
                        f"Converted {received_qty} {po_line.unit_of_measure} to "
                        f"{converted_qty} {storage_unit} for material {material.code}"
                    )
                except HTTPException as e:
                    # Re-raise with more context
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unit conversion failed for material '{material.code}': {e.detail}"
                    )
            else:
                converted_qty = Decimal(str(received_qty))

            # d. Update warehouse inventory
            current_qty = Decimal(str(inventory.current_quantity))
            inventory.current_quantity = current_qty + converted_qty

            # e. Update PO line
            po_line_received = Decimal(str(po_line.quantity_received))
            po_line.quantity_received = po_line_received + Decimal(str(received_qty))

            # Update PO line status
            if po_line.quantity_received >= po_line.quantity_ordered:
                po_line.status = "RECEIVED"
            else:
                po_line.status = "PARTIALLY_RECEIVED"

            # f. Create GRN line
            grn_line = GoodsReceiptLine(
                goods_receipt_id=grn.id,
                po_line_id=po_line.id,
                material_id=material.id,
                quantity_received=received_qty,
                unit_of_measure=po_line.unit_of_measure,
                batch_number=line_data.batch_number,
                remarks=line_data.remarks,
            )
            db.add(grn_line)

            logger.info(
                f"Received {received_qty} {po_line.unit_of_measure} of {material.code} "
                f"({converted_qty} {storage_unit} added to inventory)"
            )

        # 5. Update PO status
        all_lines_received = all(
            line.status == "RECEIVED" for line in po.lines
        )
        if all_lines_received:
            po.status = "RECEIVED"
            logger.info(f"PO {po.po_number} fully received")
        else:
            po.status = "PARTIALLY_RECEIVED"
            logger.info(f"PO {po.po_number} partially received")

        # 6. Commit transaction
        db.commit()
        db.refresh(grn)

        logger.info(f"Created goods receipt: {grn.grn_number} for PO: {po.po_number}")
        return build_grn_response(grn)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating goods receipt: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create goods receipt: {str(e)}"
        )


@router.get("", response_model=list[GRNResponse])
def list_goods_receipts(
    purchase_order_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """List goods receipts with optional filters."""
    query = db.query(GoodsReceipt)

    if purchase_order_id:
        query = query.filter(GoodsReceipt.purchase_order_id == purchase_order_id)
    if warehouse_id:
        query = query.filter(GoodsReceipt.warehouse_id == warehouse_id)
    if date_from:
        query = query.filter(GoodsReceipt.receipt_date >= date_from)
    if date_to:
        query = query.filter(GoodsReceipt.receipt_date <= date_to)

    grns = query.order_by(GoodsReceipt.created_at.desc()).all()
    return [build_grn_response(grn) for grn in grns]


@router.get("/{grn_id}", response_model=GRNResponse)
def get_goods_receipt(grn_id: int, db: Session = Depends(get_db)):
    """Get a single goods receipt with all lines."""
    grn = db.query(GoodsReceipt).filter(GoodsReceipt.id == grn_id).first()
    if not grn:
        raise HTTPException(status_code=404, detail="Goods receipt not found")
    return build_grn_response(grn)


# Add endpoint to purchase_orders router for getting receipts by PO
# This is defined here but should be added to purchase_orders.py
# For now, we add a route that works with the GRN router

@router.get("/by-po/{po_id}", response_model=list[GRNResponse])
def get_receipts_for_po(po_id: int, db: Session = Depends(get_db)):
    """Get all goods receipts for a specific purchase order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    grns = db.query(GoodsReceipt).filter(
        GoodsReceipt.purchase_order_id == po_id
    ).order_by(GoodsReceipt.created_at.desc()).all()

    return [build_grn_response(grn) for grn in grns]
