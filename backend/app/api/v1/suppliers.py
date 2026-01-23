import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Supplier, PurchaseOrder
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/suppliers", tags=["suppliers"])


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    """Create a new supplier."""
    # Check for duplicate code
    existing = db.query(Supplier).filter(Supplier.code == supplier.code).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Supplier with code '{supplier.code}' already exists"
        )

    db_supplier = Supplier(
        code=supplier.code,
        name=supplier.name,
        contact_person=supplier.contact_person,
        phone=supplier.phone,
        email=supplier.email,
        address=supplier.address,
        payment_terms=supplier.payment_terms,
    )
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)

    logger.info(f"Created supplier: {db_supplier.code} - {db_supplier.name}")
    return db_supplier


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    """List all suppliers, optionally filtered by active status."""
    query = db.query(Supplier)

    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)

    suppliers = query.order_by(Supplier.name).all()
    return suppliers


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Get a single supplier by ID."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    supplier_update: SupplierUpdate,
    db: Session = Depends(get_db),
):
    """Update a supplier."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Check for duplicate code if code is being updated
    if supplier_update.code and supplier_update.code != supplier.code:
        existing = db.query(Supplier).filter(
            Supplier.code == supplier_update.code,
            Supplier.id != supplier_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Supplier with code '{supplier_update.code}' already exists"
            )

    # Update only provided fields
    update_data = supplier_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)

    db.commit()
    db.refresh(supplier)

    logger.info(f"Updated supplier: {supplier.code}")
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Soft delete a supplier (set is_active = False)."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Check if supplier has active purchase orders
    active_po_count = db.query(PurchaseOrder).filter(
        PurchaseOrder.supplier_id == supplier_id,
        PurchaseOrder.status.in_(["DRAFT", "SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED"]),
    ).count()

    if active_po_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot deactivate supplier with {active_po_count} active purchase orders"
        )

    supplier.is_active = False
    db.commit()

    logger.info(f"Deactivated supplier: {supplier.code}")
    return None
