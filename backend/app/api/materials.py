from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Material, Contractor, ContractorInventory
from app.schemas import MaterialCreate, MaterialResponse, MaterialIssue

router = APIRouter(prefix="/api/materials", tags=["materials"])


@router.get("", response_model=list[MaterialResponse])
def list_materials(db: Session = Depends(get_db)):
    return db.query(Material).all()


@router.post("", response_model=MaterialResponse)
def create_material(material: MaterialCreate, db: Session = Depends(get_db)):
    db_material = Material(**material.model_dump())
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material


@router.post("/issue")
def issue_material(issue: MaterialIssue, db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.id == issue.contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    material = db.query(Material).filter(Material.id == issue.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    inventory = db.query(ContractorInventory).filter(
        ContractorInventory.contractor_id == issue.contractor_id,
        ContractorInventory.material_id == issue.material_id,
    ).first()

    if inventory:
        inventory.quantity += issue.quantity
    else:
        inventory = ContractorInventory(
            contractor_id=issue.contractor_id,
            material_id=issue.material_id,
            quantity=issue.quantity,
        )
        db.add(inventory)

    db.commit()
    return {"message": "Material issued successfully"}
