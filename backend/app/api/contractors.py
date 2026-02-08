from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.database import get_db
from app.models import Contractor, Warehouse, WarehouseInventory, Material
from app.models.finished_goods_receipt import FinishedGoodsInventory
from app.models.finished_good import FinishedGood
from app.schemas import ContractorCreate, ContractorResponse, InventoryItem


class FinishedGoodInventoryItem(BaseModel):
    """Schema for finished good inventory item."""
    id: int
    finished_good_id: int
    finished_good_code: str
    finished_good_name: str
    quantity: float
    unit_of_measure: Optional[str]
    last_receipt_date: Optional[datetime]

    class Config:
        from_attributes = True


class ContractorFullInventory(BaseModel):
    """Schema for contractor's full inventory including materials and finished goods."""
    materials: list[InventoryItem]
    finished_goods: list[FinishedGoodInventoryItem]


router = APIRouter(prefix="/api/contractors", tags=["contractors"])


@router.get("", response_model=list[ContractorResponse])
def list_contractors(db: Session = Depends(get_db)):
    return db.query(Contractor).all()


@router.post("", response_model=ContractorResponse)
def create_contractor(contractor: ContractorCreate, db: Session = Depends(get_db)):
    db_contractor = Contractor(**contractor.model_dump())
    db.add(db_contractor)
    db.commit()
    db.refresh(db_contractor)
    return db_contractor


@router.get("/{contractor_id}/inventory", response_model=ContractorFullInventory)
def get_contractor_inventory(contractor_id: int, db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    # Get contractor's warehouses
    contractor_warehouses = db.query(Warehouse).filter(
        Warehouse.contractor_id == contractor_id,
        Warehouse.is_active == True
    ).all()

    warehouse_ids = [w.id for w in contractor_warehouses]

    materials = []
    finished_goods = []

    if warehouse_ids:
        # Get materials from warehouse inventory
        warehouse_inventory = db.query(WarehouseInventory).filter(
            WarehouseInventory.warehouse_id.in_(warehouse_ids)
        ).all()

        for item in warehouse_inventory:
            material = db.query(Material).filter(Material.id == item.material_id).first()
            if material:
                materials.append(InventoryItem(
                    id=item.id,
                    material_id=item.material_id,
                    material_code=material.code,
                    material_name=material.name,
                    quantity=float(item.current_quantity) if item.current_quantity else 0,
                    last_updated=item.last_updated,
                ))

        # Get finished goods from contractor's warehouses
        fg_inventory = db.query(FinishedGoodsInventory).filter(
            FinishedGoodsInventory.warehouse_id.in_(warehouse_ids)
        ).all()

        for item in fg_inventory:
            fg = db.query(FinishedGood).filter(FinishedGood.id == item.finished_good_id).first()
            if fg:
                finished_goods.append(FinishedGoodInventoryItem(
                    id=item.id,
                    finished_good_id=item.finished_good_id,
                    finished_good_code=fg.code,
                    finished_good_name=fg.name,
                    quantity=float(item.current_quantity) if item.current_quantity else 0,
                    unit_of_measure=item.unit_of_measure,
                    last_receipt_date=item.last_receipt_date,
                ))

    return ContractorFullInventory(
        materials=materials,
        finished_goods=finished_goods
    )
