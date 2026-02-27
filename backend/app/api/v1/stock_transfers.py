import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Warehouse,
    Material,
    WarehouseInventory,
)
from app.models.finished_good import FinishedGood
from app.models.finished_goods_receipt import FinishedGoodsInventory
from app.models.stock_transfer import StockTransfer, StockTransferLine
from app.schemas.stock_transfer import (
    StockTransferCreate,
    StockTransferResponse,
    StockTransferListResponse,
    StockTransferLineResponse,
    StockTransferComplete,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stock-transfers", tags=["stock-transfers"])


def build_transfer_response(transfer: StockTransfer) -> StockTransferResponse:
    """Build StockTransferResponse from StockTransfer model."""
    lines = []
    for line in transfer.lines:
        line_resp = StockTransferLineResponse(
            id=line.id,
            transfer_id=line.transfer_id,
            material_id=line.material_id,
            material_code=line.material.code if line.material else None,
            material_name=line.material.name if line.material else None,
            finished_good_id=line.finished_good_id,
            finished_good_code=line.finished_good.code if line.finished_good else None,
            finished_good_name=line.finished_good.name if line.finished_good else None,
            quantity=Decimal(str(line.quantity)) if line.quantity else Decimal(0),
            unit_of_measure=line.unit_of_measure,
        )
        lines.append(line_resp)

    return StockTransferResponse(
        id=transfer.id,
        transfer_number=transfer.transfer_number,
        source_warehouse_id=transfer.source_warehouse_id,
        source_warehouse_name=transfer.source_warehouse.name,
        source_warehouse_code=transfer.source_warehouse.code,
        source_owner_type=transfer.source_warehouse.owner_type,
        destination_warehouse_id=transfer.destination_warehouse_id,
        destination_warehouse_name=transfer.destination_warehouse.name,
        destination_warehouse_code=transfer.destination_warehouse.code,
        destination_owner_type=transfer.destination_warehouse.owner_type,
        transfer_type=transfer.transfer_type,
        status=transfer.status,
        transfer_date=transfer.transfer_date,
        requested_by=transfer.requested_by,
        approved_by=transfer.approved_by,
        completed_by=transfer.completed_by,
        completed_at=transfer.completed_at,
        notes=transfer.notes,
        lines=lines,
        created_at=transfer.created_at,
        updated_at=transfer.updated_at,
    )


@router.post("", response_model=StockTransferResponse, status_code=201)
def create_stock_transfer(
    request: StockTransferCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new stock transfer between warehouses.

    Validates:
    - Source and destination warehouses exist and are active
    - Source and destination are different
    - Warehouse can hold the transfer type (materials or finished goods)
    - Items exist and have sufficient stock in source warehouse
    """
    # 1. Validate warehouses
    source = db.query(Warehouse).filter(Warehouse.id == request.source_warehouse_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source warehouse not found")
    if not source.is_active:
        raise HTTPException(status_code=400, detail="Source warehouse is not active")

    destination = db.query(Warehouse).filter(Warehouse.id == request.destination_warehouse_id).first()
    if not destination:
        raise HTTPException(status_code=404, detail="Destination warehouse not found")
    if not destination.is_active:
        raise HTTPException(status_code=400, detail="Destination warehouse is not active")

    if source.id == destination.id:
        raise HTTPException(status_code=400, detail="Source and destination must be different warehouses")

    # 2. Validate warehouse capabilities for transfer type
    if request.transfer_type == 'material':
        if not source.can_hold_materials:
            raise HTTPException(status_code=400, detail="Source warehouse cannot hold materials")
        if not destination.can_hold_materials:
            raise HTTPException(status_code=400, detail="Destination warehouse cannot hold materials")
    else:  # finished_good
        if not source.can_hold_finished_goods:
            raise HTTPException(status_code=400, detail="Source warehouse cannot hold finished goods")
        if not destination.can_hold_finished_goods:
            raise HTTPException(status_code=400, detail="Destination warehouse cannot hold finished goods")

    # 3. Validate line items and check stock
    for line in request.lines:
        if request.transfer_type == 'material':
            if not line.material_id:
                raise HTTPException(status_code=400, detail="Material ID required for material transfers")
            material = db.query(Material).filter(Material.id == line.material_id).first()
            if not material:
                raise HTTPException(status_code=404, detail=f"Material {line.material_id} not found")

            # Check stock in source warehouse
            inv = db.query(WarehouseInventory).filter(
                WarehouseInventory.warehouse_id == source.id,
                WarehouseInventory.material_id == line.material_id,
            ).first()
            if not inv or Decimal(str(inv.current_quantity)) < line.quantity:
                available = Decimal(str(inv.current_quantity)) if inv else Decimal(0)
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {material.name}. Available: {available}, Requested: {line.quantity}"
                )
        else:  # finished_good
            if not line.finished_good_id:
                raise HTTPException(status_code=400, detail="Finished Good ID required for finished good transfers")
            fg = db.query(FinishedGood).filter(FinishedGood.id == line.finished_good_id).first()
            if not fg:
                raise HTTPException(status_code=404, detail=f"Finished Good {line.finished_good_id} not found")

            # Check stock in source warehouse
            inv = db.query(FinishedGoodsInventory).filter(
                FinishedGoodsInventory.warehouse_id == source.id,
                FinishedGoodsInventory.finished_good_id == line.finished_good_id,
            ).first()
            if not inv or Decimal(str(inv.current_quantity)) < line.quantity:
                available = Decimal(str(inv.current_quantity)) if inv else Decimal(0)
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {fg.name}. Available: {available}, Requested: {line.quantity}"
                )

    # 4. Generate transfer number
    transfer_number = StockTransfer.generate_transfer_number(db)

    # 5. Create transfer record
    transfer = StockTransfer(
        transfer_number=transfer_number,
        source_warehouse_id=request.source_warehouse_id,
        destination_warehouse_id=request.destination_warehouse_id,
        transfer_type=request.transfer_type,
        status="draft",
        transfer_date=request.transfer_date,
        requested_by=request.requested_by,
        notes=request.notes,
    )
    db.add(transfer)
    db.flush()  # Get the ID

    # 6. Create line items
    for line in request.lines:
        transfer_line = StockTransferLine(
            transfer_id=transfer.id,
            material_id=line.material_id if request.transfer_type == 'material' else None,
            finished_good_id=line.finished_good_id if request.transfer_type == 'finished_good' else None,
            quantity=line.quantity,
            unit_of_measure=line.unit_of_measure,
        )
        db.add(transfer_line)

    db.commit()
    db.refresh(transfer)

    logger.info(f"Created stock transfer {transfer_number} from {source.name} to {destination.name}")

    return build_transfer_response(transfer)


@router.get("", response_model=StockTransferListResponse)
def list_stock_transfers(
    status: Optional[str] = Query(None, description="Filter by status"),
    transfer_type: Optional[str] = Query(None, description="Filter by type (material/finished_good)"),
    source_warehouse_id: Optional[int] = Query(None, description="Filter by source warehouse"),
    destination_warehouse_id: Optional[int] = Query(None, description="Filter by destination warehouse"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List stock transfers with optional filters."""
    query = db.query(StockTransfer)

    if status:
        query = query.filter(StockTransfer.status == status)
    if transfer_type:
        query = query.filter(StockTransfer.transfer_type == transfer_type)
    if source_warehouse_id:
        query = query.filter(StockTransfer.source_warehouse_id == source_warehouse_id)
    if destination_warehouse_id:
        query = query.filter(StockTransfer.destination_warehouse_id == destination_warehouse_id)

    total = query.count()
    offset = (page - 1) * page_size
    transfers = query.order_by(StockTransfer.created_at.desc()).offset(offset).limit(page_size).all()

    return StockTransferListResponse(
        items=[build_transfer_response(t) for t in transfers],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{transfer_id}", response_model=StockTransferResponse)
def get_stock_transfer(transfer_id: int, db: Session = Depends(get_db)):
    """Get a single stock transfer by ID."""
    transfer = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")
    return build_transfer_response(transfer)


@router.post("/{transfer_id}/submit", response_model=StockTransferResponse)
def submit_stock_transfer(transfer_id: int, db: Session = Depends(get_db)):
    """Submit a stock transfer for processing."""
    transfer = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")

    if transfer.status != "draft":
        raise HTTPException(status_code=400, detail=f"Cannot submit transfer in {transfer.status} status")

    transfer.status = "submitted"
    db.commit()
    db.refresh(transfer)

    logger.info(f"Submitted stock transfer {transfer.transfer_number}")

    return build_transfer_response(transfer)


@router.post("/{transfer_id}/complete", response_model=StockTransferResponse)
def complete_stock_transfer(
    transfer_id: int,
    request: StockTransferComplete,
    db: Session = Depends(get_db),
):
    """
    Complete a stock transfer - moves inventory from source to destination.

    This is a transactional operation that:
    1. Deducts quantities from source warehouse
    2. Adds quantities to destination warehouse
    3. Marks transfer as completed
    """
    transfer = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")

    if transfer.status not in ["draft", "submitted"]:
        raise HTTPException(status_code=400, detail=f"Cannot complete transfer in {transfer.status} status")

    # Process each line
    for line in transfer.lines:
        if transfer.transfer_type == 'material':
            # Deduct from source
            source_inv = db.query(WarehouseInventory).filter(
                WarehouseInventory.warehouse_id == transfer.source_warehouse_id,
                WarehouseInventory.material_id == line.material_id,
            ).with_for_update().first()

            if not source_inv or Decimal(str(source_inv.current_quantity)) < Decimal(str(line.quantity)):
                material = db.query(Material).filter(Material.id == line.material_id).first()
                available = Decimal(str(source_inv.current_quantity)) if source_inv else Decimal(0)
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {material.name}. Available: {available}, Required: {line.quantity}"
                )

            source_inv.current_quantity = Decimal(str(source_inv.current_quantity)) - Decimal(str(line.quantity))
            source_inv.last_updated = datetime.utcnow()

            # Add to destination
            dest_inv = db.query(WarehouseInventory).filter(
                WarehouseInventory.warehouse_id == transfer.destination_warehouse_id,
                WarehouseInventory.material_id == line.material_id,
            ).with_for_update().first()

            if dest_inv:
                dest_inv.current_quantity = Decimal(str(dest_inv.current_quantity)) + Decimal(str(line.quantity))
                dest_inv.last_updated = datetime.utcnow()
            else:
                # Create new inventory record
                dest_inv = WarehouseInventory(
                    warehouse_id=transfer.destination_warehouse_id,
                    material_id=line.material_id,
                    current_quantity=line.quantity,
                    unit_of_measure=line.unit_of_measure or source_inv.unit_of_measure,
                    reorder_point=Decimal(0),
                    reorder_quantity=Decimal(0),
                )
                db.add(dest_inv)

        else:  # finished_good
            # Deduct from source
            source_inv = db.query(FinishedGoodsInventory).filter(
                FinishedGoodsInventory.warehouse_id == transfer.source_warehouse_id,
                FinishedGoodsInventory.finished_good_id == line.finished_good_id,
            ).with_for_update().first()

            if not source_inv or Decimal(str(source_inv.current_quantity)) < Decimal(str(line.quantity)):
                fg = db.query(FinishedGood).filter(FinishedGood.id == line.finished_good_id).first()
                available = Decimal(str(source_inv.current_quantity)) if source_inv else Decimal(0)
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {fg.name}. Available: {available}, Required: {line.quantity}"
                )

            source_inv.current_quantity = Decimal(str(source_inv.current_quantity)) - Decimal(str(line.quantity))
            source_inv.updated_at = datetime.utcnow()

            # Add to destination
            dest_inv = db.query(FinishedGoodsInventory).filter(
                FinishedGoodsInventory.warehouse_id == transfer.destination_warehouse_id,
                FinishedGoodsInventory.finished_good_id == line.finished_good_id,
            ).with_for_update().first()

            if dest_inv:
                dest_inv.current_quantity = Decimal(str(dest_inv.current_quantity)) + Decimal(str(line.quantity))
                dest_inv.updated_at = datetime.utcnow()
            else:
                # Create new inventory record
                dest_inv = FinishedGoodsInventory(
                    warehouse_id=transfer.destination_warehouse_id,
                    finished_good_id=line.finished_good_id,
                    current_quantity=line.quantity,
                    unit_of_measure=line.unit_of_measure or source_inv.unit_of_measure,
                )
                db.add(dest_inv)

    # Update transfer status
    transfer.status = "completed"
    transfer.completed_by = request.completed_by
    transfer.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(transfer)

    logger.info(f"Completed stock transfer {transfer.transfer_number}")

    return build_transfer_response(transfer)


@router.post("/{transfer_id}/cancel", response_model=StockTransferResponse)
def cancel_stock_transfer(transfer_id: int, db: Session = Depends(get_db)):
    """Cancel a stock transfer."""
    transfer = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")

    if transfer.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed transfer")

    if transfer.status == "cancelled":
        raise HTTPException(status_code=400, detail="Transfer is already cancelled")

    transfer.status = "cancelled"
    db.commit()
    db.refresh(transfer)

    logger.info(f"Cancelled stock transfer {transfer.transfer_number}")

    return build_transfer_response(transfer)
