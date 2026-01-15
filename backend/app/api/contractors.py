from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Contractor, ContractorInventory
from app.schemas import ContractorCreate, ContractorResponse, InventoryItem

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


@router.get("/{contractor_id}/inventory", response_model=list[InventoryItem])
def get_contractor_inventory(contractor_id: int, db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    inventory = db.query(ContractorInventory).filter(
        ContractorInventory.contractor_id == contractor_id
    ).all()

    return [
        InventoryItem(
            id=item.id,
            material_id=item.material_id,
            material_code=item.material.code,
            material_name=item.material.name,
            quantity=item.quantity,
            last_updated=item.last_updated,
        )
        for item in inventory
    ]
