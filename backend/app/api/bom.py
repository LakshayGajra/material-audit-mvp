from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BOM, FinishedGood, Material
from app.schemas import BOMItemCreate, BOMItemResponse, BOMForFinishedGood

router = APIRouter(prefix="/api/bom", tags=["bom"])


@router.get("/{finished_good_id}", response_model=BOMForFinishedGood)
def get_bom(finished_good_id: int, db: Session = Depends(get_db)):
    fg = db.query(FinishedGood).filter(FinishedGood.id == finished_good_id).first()
    if not fg:
        raise HTTPException(status_code=404, detail="Finished good not found")

    bom_items = db.query(BOM).filter(BOM.finished_good_id == finished_good_id).all()

    return BOMForFinishedGood(
        finished_good_id=fg.id,
        finished_good_code=fg.code,
        finished_good_name=fg.name,
        items=[
            BOMItemResponse(
                id=item.id,
                finished_good_id=item.finished_good_id,
                material_id=item.material_id,
                material_code=item.material.code,
                material_name=item.material.name,
                material_unit=item.material.unit,
                quantity_per_unit=item.quantity_per_unit,
            )
            for item in bom_items
        ],
    )


@router.post("", response_model=BOMItemResponse)
def add_bom_item(item: BOMItemCreate, db: Session = Depends(get_db)):
    fg = db.query(FinishedGood).filter(FinishedGood.id == item.finished_good_id).first()
    if not fg:
        raise HTTPException(status_code=404, detail="Finished good not found")

    material = db.query(Material).filter(Material.id == item.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    existing = db.query(BOM).filter(
        BOM.finished_good_id == item.finished_good_id,
        BOM.material_id == item.material_id,
    ).first()

    if existing:
        existing.quantity_per_unit = item.quantity_per_unit
        db.commit()
        db.refresh(existing)
        bom_item = existing
    else:
        bom_item = BOM(**item.model_dump())
        db.add(bom_item)
        db.commit()
        db.refresh(bom_item)

    return BOMItemResponse(
        id=bom_item.id,
        finished_good_id=bom_item.finished_good_id,
        material_id=bom_item.material_id,
        material_code=material.code,
        material_name=material.name,
        material_unit=material.unit,
        quantity_per_unit=bom_item.quantity_per_unit,
    )


@router.delete("/{bom_id}")
def delete_bom_item(bom_id: int, db: Session = Depends(get_db)):
    bom_item = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom_item:
        raise HTTPException(status_code=404, detail="BOM item not found")

    db.delete(bom_item)
    db.commit()
    return {"message": "BOM item deleted"}
