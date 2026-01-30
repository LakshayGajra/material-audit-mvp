import logging
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    Contractor,
    ContractorInventory,
    FinishedGood,
    Warehouse,
    BOM,
    ProductionRecord,
)
from app.models.finished_goods_receipt import (
    FinishedGoodsInventory,
    FinishedGoodsReceipt,
    FinishedGoodsReceiptLine,
)
from app.schemas.finished_goods_receipt import (
    FGRCreate,
    FGRResponse,
    FGRLineResponse,
    FGRListResponse,
    FGRInspect,
    FinishedGoodsInventoryResponse,
    PendingDeliveryResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/fgr", tags=["finished-goods-receipts"])


def generate_fgr_number(db: Session) -> str:
    """Generate FGR number in format FGR-YYYY-NNNN."""
    year = date.today().year
    prefix = f"FGR-{year}-"

    latest_fgr = db.query(FinishedGoodsReceipt).filter(
        FinishedGoodsReceipt.fgr_number.like(f"{prefix}%")
    ).order_by(FinishedGoodsReceipt.fgr_number.desc()).first()

    if latest_fgr:
        try:
            last_num = int(latest_fgr.fgr_number.split("-")[-1])
            next_num = last_num + 1
        except ValueError:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{next_num:04d}"


def build_fgr_line_response(line: FinishedGoodsReceiptLine) -> FGRLineResponse:
    """Build FGRLineResponse from model."""
    return FGRLineResponse(
        id=line.id,
        fgr_id=line.fgr_id,
        finished_good_id=line.finished_good_id,
        finished_good_name=line.finished_good.name,
        finished_good_code=line.finished_good.code,
        quantity_delivered=Decimal(str(line.quantity_delivered)),
        quantity_accepted=Decimal(str(line.quantity_accepted)) if line.quantity_accepted is not None else None,
        quantity_rejected=Decimal(str(line.quantity_rejected)) if line.quantity_rejected else Decimal(0),
        rejection_reason=line.rejection_reason,
        unit_of_measure=line.unit_of_measure,
        bom_deducted=line.bom_deducted,
    )


def build_fgr_response(fgr: FinishedGoodsReceipt) -> FGRResponse:
    """Build FGRResponse from FinishedGoodsReceipt model."""
    lines = [build_fgr_line_response(line) for line in fgr.lines]

    return FGRResponse(
        id=fgr.id,
        fgr_number=fgr.fgr_number,
        contractor_id=fgr.contractor_id,
        contractor_name=fgr.contractor.name,
        contractor_code=fgr.contractor.code,
        warehouse_id=fgr.warehouse_id,
        warehouse_name=fgr.warehouse.name,
        receipt_date=fgr.receipt_date,
        status=fgr.status,
        received_by=fgr.received_by,
        inspected_by=fgr.inspected_by,
        inspection_date=fgr.inspection_date,
        inspection_notes=fgr.inspection_notes,
        notes=fgr.notes,
        lines=lines,
        created_at=fgr.created_at,
        updated_at=fgr.updated_at,
    )


@router.post("", response_model=FGRResponse, status_code=201)
def create_fgr(fgr_data: FGRCreate, db: Session = Depends(get_db)):
    """
    Create a finished goods receipt (FGR).

    This creates a draft FGR that needs to be inspected and completed.
    """
    try:
        # Validate contractor exists
        contractor = db.query(Contractor).filter(
            Contractor.id == fgr_data.contractor_id
        ).first()
        if not contractor:
            raise HTTPException(status_code=404, detail="Contractor not found")

        # Validate warehouse exists and is active
        warehouse = db.query(Warehouse).filter(
            Warehouse.id == fgr_data.warehouse_id
        ).first()
        if not warehouse:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        if not warehouse.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"Warehouse '{warehouse.name}' is not active"
            )

        # Validate finished goods exist
        fg_ids = [line.finished_good_id for line in fgr_data.lines]
        finished_goods = db.query(FinishedGood).filter(
            FinishedGood.id.in_(fg_ids)
        ).all()
        fg_map = {fg.id: fg for fg in finished_goods}

        invalid_fgs = set(fg_ids) - set(fg_map.keys())
        if invalid_fgs:
            raise HTTPException(
                status_code=400,
                detail=f"Finished goods with IDs {list(invalid_fgs)} not found"
            )

        # Generate FGR number
        fgr_number = generate_fgr_number(db)

        # Create FGR record
        fgr = FinishedGoodsReceipt(
            fgr_number=fgr_number,
            contractor_id=contractor.id,
            warehouse_id=warehouse.id,
            receipt_date=fgr_data.receipt_date,
            status="draft",
            received_by=fgr_data.received_by,
            notes=fgr_data.notes,
        )
        db.add(fgr)
        db.flush()

        # Create line items
        for line_data in fgr_data.lines:
            fg = fg_map[line_data.finished_good_id]
            fgr_line = FinishedGoodsReceiptLine(
                fgr_id=fgr.id,
                finished_good_id=fg.id,
                quantity_delivered=line_data.quantity_delivered,
                unit_of_measure=line_data.unit_of_measure or fg.unit if hasattr(fg, 'unit') else 'pcs',
                bom_deducted=False,
            )
            db.add(fgr_line)

        db.commit()
        db.refresh(fgr)

        logger.info(f"Created FGR: {fgr.fgr_number} for contractor: {contractor.code}")
        return build_fgr_response(fgr)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating FGR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create FGR: {str(e)}"
        )


@router.get("", response_model=list[FGRListResponse])
def list_fgrs(
    contractor_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """List FGRs with optional filters."""
    query = db.query(FinishedGoodsReceipt)

    if contractor_id:
        query = query.filter(FinishedGoodsReceipt.contractor_id == contractor_id)
    if warehouse_id:
        query = query.filter(FinishedGoodsReceipt.warehouse_id == warehouse_id)
    if status:
        query = query.filter(FinishedGoodsReceipt.status == status)
    if date_from:
        query = query.filter(FinishedGoodsReceipt.receipt_date >= date_from)
    if date_to:
        query = query.filter(FinishedGoodsReceipt.receipt_date <= date_to)

    fgrs = query.order_by(FinishedGoodsReceipt.created_at.desc()).all()

    result = []
    for fgr in fgrs:
        total_delivered = sum(
            Decimal(str(line.quantity_delivered)) for line in fgr.lines
        )
        total_accepted = sum(
            Decimal(str(line.quantity_accepted)) for line in fgr.lines
            if line.quantity_accepted is not None
        ) if any(line.quantity_accepted is not None for line in fgr.lines) else None

        result.append(FGRListResponse(
            id=fgr.id,
            fgr_number=fgr.fgr_number,
            contractor_name=fgr.contractor.name,
            contractor_code=fgr.contractor.code,
            warehouse_name=fgr.warehouse.name,
            receipt_date=fgr.receipt_date,
            status=fgr.status,
            received_by=fgr.received_by,
            line_count=len(fgr.lines),
            total_quantity_delivered=total_delivered,
            total_quantity_accepted=total_accepted,
            created_at=fgr.created_at,
        ))

    return result


@router.get("/{fgr_id}", response_model=FGRResponse)
def get_fgr(fgr_id: int, db: Session = Depends(get_db)):
    """Get a single FGR with all lines."""
    fgr = db.query(FinishedGoodsReceipt).filter(
        FinishedGoodsReceipt.id == fgr_id
    ).first()
    if not fgr:
        raise HTTPException(status_code=404, detail="FGR not found")
    return build_fgr_response(fgr)


@router.put("/{fgr_id}/inspect", response_model=FGRResponse)
def inspect_fgr(fgr_id: int, inspect_data: FGRInspect, db: Session = Depends(get_db)):
    """
    Submit inspection results for an FGR.

    Updates accepted/rejected quantities for each line.
    """
    try:
        fgr = db.query(FinishedGoodsReceipt).filter(
            FinishedGoodsReceipt.id == fgr_id
        ).first()
        if not fgr:
            raise HTTPException(status_code=404, detail="FGR not found")

        if fgr.status not in ["draft", "submitted"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot inspect FGR with status '{fgr.status}'. Must be 'draft' or 'submitted'."
            )

        # Build line map
        line_map = {line.id: line for line in fgr.lines}

        # Validate all line_ids belong to this FGR
        for line_data in inspect_data.lines:
            if line_data.line_id not in line_map:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line ID {line_data.line_id} does not belong to FGR {fgr.fgr_number}"
                )

        # Update inspection results
        for line_data in inspect_data.lines:
            line = line_map[line_data.line_id]

            # Validate quantities
            total = line_data.quantity_accepted + line_data.quantity_rejected
            if total > Decimal(str(line.quantity_delivered)):
                raise HTTPException(
                    status_code=400,
                    detail=f"Accepted + Rejected ({total}) exceeds delivered ({line.quantity_delivered}) "
                           f"for finished good '{line.finished_good.code}'"
                )

            line.quantity_accepted = line_data.quantity_accepted
            line.quantity_rejected = line_data.quantity_rejected
            line.rejection_reason = line_data.rejection_reason

        # Update FGR header
        fgr.status = "inspected"
        fgr.inspected_by = inspect_data.inspected_by
        fgr.inspection_date = date.today()
        fgr.inspection_notes = inspect_data.inspection_notes

        db.commit()
        db.refresh(fgr)

        logger.info(f"Inspected FGR: {fgr.fgr_number}")
        return build_fgr_response(fgr)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error inspecting FGR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to inspect FGR: {str(e)}"
        )


@router.post("/{fgr_id}/complete", response_model=FGRResponse)
def complete_fgr(fgr_id: int, db: Session = Depends(get_db)):
    """
    Complete an FGR, triggering BOM deduction from contractor inventory
    and adding finished goods to warehouse inventory.

    This is a CRITICAL transaction that:
    1. Deducts BOM materials from contractor inventory
    2. Adds accepted finished goods to warehouse finished goods inventory
    3. Marks the FGR as completed
    """
    try:
        fgr = db.query(FinishedGoodsReceipt).filter(
            FinishedGoodsReceipt.id == fgr_id
        ).first()
        if not fgr:
            raise HTTPException(status_code=404, detail="FGR not found")

        if fgr.status != "inspected":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot complete FGR with status '{fgr.status}'. Must be 'inspected'."
            )

        # Verify all lines have been inspected
        for line in fgr.lines:
            if line.quantity_accepted is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line for '{line.finished_good.code}' has not been inspected"
                )

        # Process each line
        for line in fgr.lines:
            if line.quantity_accepted > 0 and not line.bom_deducted:
                # Get BOM for this finished good
                bom_items = db.query(BOM).filter(
                    BOM.finished_good_id == line.finished_good_id
                ).all()

                # Deduct BOM materials from contractor inventory
                for bom_item in bom_items:
                    qty_to_deduct = Decimal(str(bom_item.quantity_per_unit)) * Decimal(str(line.quantity_accepted))

                    # Get or warn about contractor inventory
                    contractor_inv = db.query(ContractorInventory).filter(
                        ContractorInventory.contractor_id == fgr.contractor_id,
                        ContractorInventory.material_id == bom_item.material_id,
                    ).first()

                    if contractor_inv:
                        current_qty = Decimal(str(contractor_inv.quantity))
                        new_qty = current_qty - qty_to_deduct
                        # Allow negative inventory (will be flagged as anomaly)
                        contractor_inv.quantity = float(new_qty)
                        logger.info(
                            f"Deducted {qty_to_deduct} of material {bom_item.material.code} "
                            f"from contractor {fgr.contractor.code} inventory "
                            f"(was {current_qty}, now {new_qty})"
                        )
                    else:
                        # Create negative inventory record
                        contractor_inv = ContractorInventory(
                            contractor_id=fgr.contractor_id,
                            material_id=bom_item.material_id,
                            quantity=float(-qty_to_deduct),
                        )
                        db.add(contractor_inv)
                        logger.warning(
                            f"Created negative inventory for contractor {fgr.contractor.code}, "
                            f"material {bom_item.material.code}: -{qty_to_deduct}"
                        )

                # Add to finished goods inventory
                fg_inv = db.query(FinishedGoodsInventory).filter(
                    FinishedGoodsInventory.finished_good_id == line.finished_good_id,
                    FinishedGoodsInventory.warehouse_id == fgr.warehouse_id,
                ).first()

                if fg_inv:
                    current_qty = Decimal(str(fg_inv.current_quantity))
                    fg_inv.current_quantity = current_qty + Decimal(str(line.quantity_accepted))
                    fg_inv.last_receipt_date = fgr.receipt_date
                else:
                    fg_inv = FinishedGoodsInventory(
                        finished_good_id=line.finished_good_id,
                        warehouse_id=fgr.warehouse_id,
                        current_quantity=Decimal(str(line.quantity_accepted)),
                        unit_of_measure=line.unit_of_measure,
                        last_receipt_date=fgr.receipt_date,
                    )
                    db.add(fg_inv)

                logger.info(
                    f"Added {line.quantity_accepted} of finished good {line.finished_good.code} "
                    f"to warehouse {fgr.warehouse.name}"
                )

                # Mark line as processed
                line.bom_deducted = True

        # Update FGR status
        fgr.status = "completed"

        db.commit()
        db.refresh(fgr)

        logger.info(f"Completed FGR: {fgr.fgr_number}")
        return build_fgr_response(fgr)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error completing FGR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to complete FGR: {str(e)}"
        )


@router.post("/{fgr_id}/submit", response_model=FGRResponse)
def submit_fgr(fgr_id: int, db: Session = Depends(get_db)):
    """Submit a draft FGR for inspection."""
    fgr = db.query(FinishedGoodsReceipt).filter(
        FinishedGoodsReceipt.id == fgr_id
    ).first()
    if not fgr:
        raise HTTPException(status_code=404, detail="FGR not found")

    if fgr.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit FGR with status '{fgr.status}'. Must be 'draft'."
        )

    fgr.status = "submitted"
    db.commit()
    db.refresh(fgr)

    logger.info(f"Submitted FGR: {fgr.fgr_number} for inspection")
    return build_fgr_response(fgr)


# ============================================================================
# Finished Goods Inventory Endpoints
# ============================================================================

fg_inventory_router = APIRouter(prefix="/api/v1/finished-goods-inventory", tags=["finished-goods-inventory"])


@fg_inventory_router.get("", response_model=list[FinishedGoodsInventoryResponse])
def list_finished_goods_inventory(
    warehouse_id: Optional[int] = Query(None),
    finished_good_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """List finished goods inventory with optional filters."""
    query = db.query(FinishedGoodsInventory)

    if warehouse_id:
        query = query.filter(FinishedGoodsInventory.warehouse_id == warehouse_id)
    if finished_good_id:
        query = query.filter(FinishedGoodsInventory.finished_good_id == finished_good_id)

    items = query.all()

    return [
        FinishedGoodsInventoryResponse(
            id=item.id,
            finished_good_id=item.finished_good_id,
            finished_good_name=item.finished_good.name,
            finished_good_code=item.finished_good.code,
            warehouse_id=item.warehouse_id,
            warehouse_name=item.warehouse.name,
            current_quantity=Decimal(str(item.current_quantity)),
            unit_of_measure=item.unit_of_measure,
            last_receipt_date=item.last_receipt_date,
        )
        for item in items
    ]


# ============================================================================
# Pending Deliveries Endpoint
# ============================================================================

@router.get("/pending-deliveries/{contractor_id}", response_model=list[PendingDeliveryResponse])
def get_pending_deliveries(contractor_id: int, db: Session = Depends(get_db)):
    """
    Get pending deliveries for a contractor.

    Calculates the difference between production reported and goods received.
    """
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    # Get total production per finished good
    production_totals = db.query(
        ProductionRecord.finished_good_id,
        func.sum(ProductionRecord.quantity_produced).label('total_produced')
    ).filter(
        ProductionRecord.contractor_id == contractor_id
    ).group_by(ProductionRecord.finished_good_id).all()

    # Get total received per finished good from completed FGRs
    received_totals = db.query(
        FinishedGoodsReceiptLine.finished_good_id,
        func.sum(FinishedGoodsReceiptLine.quantity_accepted).label('total_received')
    ).join(FinishedGoodsReceipt).filter(
        FinishedGoodsReceipt.contractor_id == contractor_id,
        FinishedGoodsReceipt.status == "completed",
        FinishedGoodsReceiptLine.quantity_accepted.isnot(None),
    ).group_by(FinishedGoodsReceiptLine.finished_good_id).all()

    # Build received map
    received_map = {r.finished_good_id: Decimal(str(r.total_received)) for r in received_totals}

    result = []
    for prod in production_totals:
        total_produced = Decimal(str(prod.total_produced))
        total_received = received_map.get(prod.finished_good_id, Decimal(0))
        pending = total_produced - total_received

        if pending > 0:
            fg = db.query(FinishedGood).filter(FinishedGood.id == prod.finished_good_id).first()
            result.append(PendingDeliveryResponse(
                contractor_id=contractor_id,
                contractor_name=contractor.name,
                finished_good_id=prod.finished_good_id,
                finished_good_name=fg.name,
                finished_good_code=fg.code,
                total_produced=total_produced,
                total_received=total_received,
                pending_quantity=pending,
            ))

    return result
