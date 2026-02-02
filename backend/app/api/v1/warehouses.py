import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Warehouse, WarehouseInventory, Material, Contractor
from app.models.finished_goods_receipt import FinishedGoodsInventory
from app.models.finished_good import FinishedGood
from app.schemas.warehouse import (
    WarehouseCreate,
    WarehouseUpdate,
    WarehouseResponse,
    WarehouseListResponse,
    WarehouseInventoryResponse,
    WarehouseInventoryCreate,
    WarehouseInventoryUpdate,
    WarehouseFGInventoryResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/warehouses", tags=["warehouses"])


def build_warehouse_response(warehouse: Warehouse) -> dict:
    """Build warehouse response dict."""
    return {
        "id": warehouse.id,
        "code": warehouse.code,
        "name": warehouse.name,
        "location": warehouse.location,
        "address": warehouse.address,
        "contact_person": warehouse.contact_person,
        "phone": warehouse.phone,
        "owner_type": warehouse.owner_type,
        "contractor_id": warehouse.contractor_id,
        "contractor_name": warehouse.contractor.name if warehouse.contractor else None,
        "contractor_code": warehouse.contractor.code if warehouse.contractor else None,
        "can_hold_materials": warehouse.can_hold_materials,
        "can_hold_finished_goods": warehouse.can_hold_finished_goods,
        "is_active": warehouse.is_active,
        "created_at": warehouse.created_at,
        "updated_at": warehouse.updated_at,
    }


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

    # Validate contractor if contractor-owned
    if warehouse.owner_type == 'contractor':
        if not warehouse.contractor_id:
            raise HTTPException(
                status_code=400,
                detail="Contractor ID is required for contractor-owned warehouses"
            )
        contractor = db.query(Contractor).filter(Contractor.id == warehouse.contractor_id).first()
        if not contractor:
            raise HTTPException(status_code=404, detail="Contractor not found")

    db_warehouse = Warehouse(
        code=warehouse.code,
        name=warehouse.name,
        location=warehouse.location,
        address=warehouse.address,
        contact_person=warehouse.contact_person,
        phone=warehouse.phone,
        owner_type=warehouse.owner_type,
        contractor_id=warehouse.contractor_id if warehouse.owner_type == 'contractor' else None,
        can_hold_materials=warehouse.can_hold_materials,
        can_hold_finished_goods=warehouse.can_hold_finished_goods,
    )
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)

    # If contractor-owned and contractor doesn't have a default warehouse, set this as default
    if db_warehouse.contractor_id:
        contractor = db.query(Contractor).filter(Contractor.id == db_warehouse.contractor_id).first()
        if contractor and not contractor.default_warehouse_id:
            contractor.default_warehouse_id = db_warehouse.id
            db.commit()

    logger.info(f"Created warehouse: {db_warehouse.code} - {db_warehouse.name} (owner: {db_warehouse.owner_type})")
    return build_warehouse_response(db_warehouse)


@router.get("", response_model=list[WarehouseListResponse])
def list_warehouses(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    owner_type: Optional[str] = Query(None, description="Filter by owner type (company/contractor)"),
    contractor_id: Optional[int] = Query(None, description="Filter by contractor ID"),
    can_hold_materials: Optional[bool] = Query(None, description="Filter by can hold materials"),
    can_hold_finished_goods: Optional[bool] = Query(None, description="Filter by can hold FG"),
    db: Session = Depends(get_db),
):
    """List all warehouses with optional filters."""
    query = db.query(Warehouse)

    if is_active is not None:
        query = query.filter(Warehouse.is_active == is_active)
    if owner_type:
        query = query.filter(Warehouse.owner_type == owner_type)
    if contractor_id:
        query = query.filter(Warehouse.contractor_id == contractor_id)
    if can_hold_materials is not None:
        query = query.filter(Warehouse.can_hold_materials == can_hold_materials)
    if can_hold_finished_goods is not None:
        query = query.filter(Warehouse.can_hold_finished_goods == can_hold_finished_goods)

    warehouses = query.order_by(Warehouse.owner_type, Warehouse.name).all()

    result = []
    for wh in warehouses:
        # Count materials
        material_count = db.query(WarehouseInventory).filter(
            WarehouseInventory.warehouse_id == wh.id,
            WarehouseInventory.current_quantity > 0
        ).count()

        # Count finished goods
        fg_count = db.query(FinishedGoodsInventory).filter(
            FinishedGoodsInventory.warehouse_id == wh.id,
            FinishedGoodsInventory.current_quantity > 0
        ).count()

        # Count items below reorder
        below_reorder = db.query(WarehouseInventory).filter(
            WarehouseInventory.warehouse_id == wh.id,
            WarehouseInventory.current_quantity < WarehouseInventory.reorder_point
        ).count()

        result.append(WarehouseListResponse(
            id=wh.id,
            code=wh.code,
            name=wh.name,
            location=wh.location,
            owner_type=wh.owner_type,
            contractor_id=wh.contractor_id,
            contractor_name=wh.contractor.name if wh.contractor else None,
            contractor_code=wh.contractor.code if wh.contractor else None,
            can_hold_materials=wh.can_hold_materials,
            can_hold_finished_goods=wh.can_hold_finished_goods,
            is_active=wh.is_active,
            material_count=material_count,
            fg_count=fg_count,
            total_items_below_reorder=below_reorder,
        ))

    return result


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
def get_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    """Get a single warehouse by ID."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return build_warehouse_response(warehouse)


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

    # Validate contractor if changing to contractor-owned
    if warehouse_update.owner_type == 'contractor' and warehouse_update.contractor_id:
        contractor = db.query(Contractor).filter(Contractor.id == warehouse_update.contractor_id).first()
        if not contractor:
            raise HTTPException(status_code=404, detail="Contractor not found")

    # Update only provided fields
    update_data = warehouse_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(warehouse, field, value)

    # Clear contractor_id if switching to company-owned
    if warehouse.owner_type == 'company':
        warehouse.contractor_id = None

    db.commit()
    db.refresh(warehouse)

    logger.info(f"Updated warehouse: {warehouse.code}")
    return build_warehouse_response(warehouse)


@router.delete("/{warehouse_id}", status_code=204)
def delete_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    """Soft delete a warehouse (set is_active = False)."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Check if warehouse has material inventory
    material_count = db.query(WarehouseInventory).filter(
        WarehouseInventory.warehouse_id == warehouse_id,
        WarehouseInventory.current_quantity > 0,
    ).count()

    # Check if warehouse has FG inventory
    fg_count = db.query(FinishedGoodsInventory).filter(
        FinishedGoodsInventory.warehouse_id == warehouse_id,
        FinishedGoodsInventory.current_quantity > 0,
    ).count()

    if material_count > 0 or fg_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot deactivate warehouse with inventory. "
                   f"Materials: {material_count}, Finished Goods: {fg_count}. "
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


@router.get("/{warehouse_id}/fg-inventory", response_model=list[WarehouseFGInventoryResponse])
def get_warehouse_fg_inventory(warehouse_id: int, db: Session = Depends(get_db)):
    """Get all finished goods in this warehouse."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    if not warehouse.can_hold_finished_goods:
        raise HTTPException(
            status_code=400,
            detail="This warehouse is not configured to hold finished goods"
        )

    fg_items = db.query(FinishedGoodsInventory).filter(
        FinishedGoodsInventory.warehouse_id == warehouse_id
    ).all()

    result = []
    for item in fg_items:
        result.append(WarehouseFGInventoryResponse(
            id=item.id,
            warehouse_id=item.warehouse_id,
            warehouse_name=warehouse.name,
            finished_good_id=item.finished_good_id,
            finished_good_name=item.finished_good.name,
            finished_good_code=item.finished_good.code,
            current_quantity=item.current_quantity,
            unit_of_measure=item.unit_of_measure,
            last_receipt_date=item.last_receipt_date,
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


@router.post("/{warehouse_id}/inventory", response_model=WarehouseInventoryResponse, status_code=201)
def add_warehouse_inventory(
    warehouse_id: int,
    inventory: WarehouseInventoryCreate,
    db: Session = Depends(get_db),
):
    """Add a material to warehouse inventory."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    if not warehouse.can_hold_materials:
        raise HTTPException(
            status_code=400,
            detail="This warehouse is not configured to hold materials"
        )

    material = db.query(Material).filter(Material.id == inventory.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    # Check if already exists
    existing = db.query(WarehouseInventory).filter(
        WarehouseInventory.warehouse_id == warehouse_id,
        WarehouseInventory.material_id == inventory.material_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Inventory for material '{material.code}' already exists in this warehouse"
        )

    db_inventory = WarehouseInventory(
        warehouse_id=warehouse_id,
        material_id=inventory.material_id,
        current_quantity=inventory.current_quantity,
        unit_of_measure=inventory.unit_of_measure,
        reorder_point=inventory.reorder_point,
        reorder_quantity=inventory.reorder_quantity,
    )
    db.add(db_inventory)
    db.commit()
    db.refresh(db_inventory)

    logger.info(f"Added {db_inventory.current_quantity} {db_inventory.unit_of_measure} of {material.code} to warehouse {warehouse.code}")

    return WarehouseInventoryResponse(
        id=db_inventory.id,
        warehouse_id=db_inventory.warehouse_id,
        warehouse_name=warehouse.name,
        material_id=db_inventory.material_id,
        material_name=material.name,
        material_code=material.code,
        current_quantity=db_inventory.current_quantity,
        unit_of_measure=db_inventory.unit_of_measure,
        reorder_point=db_inventory.reorder_point,
        reorder_quantity=db_inventory.reorder_quantity,
        is_below_reorder=db_inventory.is_below_reorder_point(),
        last_updated=db_inventory.last_updated,
    )


@router.put("/{warehouse_id}/inventory/{inventory_id}", response_model=WarehouseInventoryResponse)
def update_warehouse_inventory(
    warehouse_id: int,
    inventory_id: int,
    update: WarehouseInventoryUpdate,
    db: Session = Depends(get_db),
):
    """Update warehouse inventory (for adjustments/corrections)."""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    inventory = db.query(WarehouseInventory).filter(
        WarehouseInventory.id == inventory_id,
        WarehouseInventory.warehouse_id == warehouse_id,
    ).first()

    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory record not found")

    material = db.query(Material).filter(Material.id == inventory.material_id).first()

    # Update fields
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(inventory, field, value)

    db.commit()
    db.refresh(inventory)

    logger.info(f"Updated inventory for {material.code} in warehouse {warehouse.code}")

    return WarehouseInventoryResponse(
        id=inventory.id,
        warehouse_id=inventory.warehouse_id,
        warehouse_name=warehouse.name,
        material_id=inventory.material_id,
        material_name=material.name,
        material_code=material.code,
        current_quantity=inventory.current_quantity,
        unit_of_measure=inventory.unit_of_measure,
        reorder_point=inventory.reorder_point,
        reorder_quantity=inventory.reorder_quantity,
        is_below_reorder=inventory.is_below_reorder_point(),
        last_updated=inventory.last_updated,
    )
