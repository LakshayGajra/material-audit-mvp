import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Warehouse, WarehouseInventory, Material
from app.schemas.warehouse import (
    WarehouseCreate,
    WarehouseUpdate,
    WarehouseResponse,
    WarehouseInventoryResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/warehouses", tags=["warehouses"])


@router.post("", response_model=WarehouseResponse, status_code=201)
def create_warehouse(warehouse: WarehouseCreate, db: Session = Depends(get_db)):
    """Create a new warehouse."""
    # Check for duplicate code
    existing = db.query(Warehouse).filter(Warehouse.code == warehouse.code).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Warehouse with code '{warehouse.code}' already exists"
        )

    db_warehouse = Warehouse(
        code=warehouse.code,
        name=warehouse.name,
        location=warehouse.location,
        address=warehouse.address,
        contact_person=warehouse.contact_person,
        phone=warehouse.phone,
    )
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)

    logger.info(f"Created warehouse: {db_warehouse.code} - {db_warehouse.name}")
    return db_warehouse


@router.get("", response_model=list[WarehouseResponse])
def list_warehouses(
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    """List all warehouses, optionally filtered by active status."""
    query = db.query(Warehouse)

    if is_active is not None:
        query = query.filter(Warehouse.is_active == is_active)

    warehouses = query.order_by(Warehouse.name).all()
    return warehouses


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
def get_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    """Get a single warehouse by ID."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_id: int,
    warehouse_update: WarehouseUpdate,
    db: Session = Depends(get_db),
):
    """Update a warehouse."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Check for duplicate code if code is being updated
    if warehouse_update.code and warehouse_update.code != warehouse.code:
        existing = db.query(Warehouse).filter(
            Warehouse.code == warehouse_update.code,
            Warehouse.id != warehouse_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Warehouse with code '{warehouse_update.code}' already exists"
            )

    # Update only provided fields
    update_data = warehouse_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(warehouse, field, value)

    db.commit()
    db.refresh(warehouse)

    logger.info(f"Updated warehouse: {warehouse.code}")
    return warehouse


@router.delete("/{warehouse_id}", status_code=204)
def delete_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    """Soft delete a warehouse (set is_active = False)."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Check if warehouse has inventory
    inventory_count = db.query(WarehouseInventory).filter(
        WarehouseInventory.warehouse_id == warehouse_id,
        WarehouseInventory.current_quantity > 0,
    ).count()

    if inventory_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot deactivate warehouse with {inventory_count} materials in stock. "
                   "Please transfer or zero out inventory first."
        )

    warehouse.is_active = False
    db.commit()

    logger.info(f"Deactivated warehouse: {warehouse.code}")
    return None


@router.get("/{warehouse_id}/inventory", response_model=list[WarehouseInventoryResponse])
def get_warehouse_inventory(warehouse_id: int, db: Session = Depends(get_db)):
    """Get all materials in this warehouse."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    inventory_items = db.query(WarehouseInventory).filter(
        WarehouseInventory.warehouse_id == warehouse_id
    ).all()

    result = []
    for item in inventory_items:
        result.append(WarehouseInventoryResponse(
            id=item.id,
            warehouse_id=item.warehouse_id,
            warehouse_name=warehouse.name,
            material_id=item.material_id,
            material_name=item.material.name,
            material_code=item.material.code,
            current_quantity=item.current_quantity,
            unit_of_measure=item.unit_of_measure,
            reorder_point=item.reorder_point,
            reorder_quantity=item.reorder_quantity,
            is_below_reorder=item.is_below_reorder_point(),
            last_updated=item.last_updated,
        ))

    return result


@router.get("/{warehouse_id}/low-stock", response_model=list[WarehouseInventoryResponse])
def get_low_stock_items(warehouse_id: int, db: Session = Depends(get_db)):
    """Get materials below reorder point in this warehouse."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Get items where current_quantity < reorder_point
    inventory_items = db.query(WarehouseInventory).filter(
        WarehouseInventory.warehouse_id == warehouse_id,
        WarehouseInventory.current_quantity < WarehouseInventory.reorder_point,
    ).all()

    result = []
    for item in inventory_items:
        result.append(WarehouseInventoryResponse(
            id=item.id,
            warehouse_id=item.warehouse_id,
            warehouse_name=warehouse.name,
            material_id=item.material_id,
            material_name=item.material.name,
            material_code=item.material.code,
            current_quantity=item.current_quantity,
            unit_of_measure=item.unit_of_measure,
            reorder_point=item.reorder_point,
            reorder_quantity=item.reorder_quantity,
            is_below_reorder=True,
            last_updated=item.last_updated,
        ))

    return result
