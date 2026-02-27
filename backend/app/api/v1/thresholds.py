"""
Variance Threshold Management APIs

Manage variance thresholds for audit anomaly detection.
Thresholds can be set per material (default) or per contractor-material pair.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Contractor, Material, VarianceThreshold
from app.schemas.threshold import (
    ThresholdCreate,
    ThresholdUpdate,
    ThresholdResponse,
    ThresholdListResponse,
)
from app.services.threshold_service import get_threshold_with_source

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/thresholds", tags=["Variance Thresholds"])


@router.post("", response_model=ThresholdResponse)
def create_threshold(
    request: ThresholdCreate,
    created_by: Optional[str] = Query(None, description="User creating the threshold"),
    db: Session = Depends(get_db)
):
    """
    Create a new variance threshold.

    - If contractor_id is NULL, this is the default threshold for the material
    - If contractor_id is provided, this overrides the default for that specific contractor
    """
    # Validate material exists
    material = db.query(Material).filter(Material.id == request.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail=f"Material with id {request.material_id} not found")

    # Validate contractor if provided
    contractor = None
    if request.contractor_id:
        contractor = db.query(Contractor).filter(Contractor.id == request.contractor_id).first()
        if not contractor:
            raise HTTPException(status_code=404, detail=f"Contractor with id {request.contractor_id} not found")

    # Check for duplicate
    existing = db.query(VarianceThreshold).filter(
        VarianceThreshold.contractor_id == request.contractor_id,
        VarianceThreshold.material_id == request.material_id,
    ).first()

    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=400,
                detail="A threshold already exists for this contractor-material pair. Use PUT to update."
            )
        else:
            # Reactivate the existing threshold
            existing.threshold_percentage = request.threshold_percentage
            existing.is_active = True
            existing.notes = request.notes
            existing.created_by = created_by
            db.commit()
            db.refresh(existing)

            threshold_type = "contractor-specific" if request.contractor_id else "material default"
            logger.info(f"Reactivated {threshold_type} threshold for material {material.code}: {request.threshold_percentage}%")

            return ThresholdResponse(
                id=existing.id,
                contractor_id=existing.contractor_id,
                contractor_name=contractor.name if contractor else None,
                material_id=existing.material_id,
                material_name=material.name,
                threshold_percentage=existing.threshold_percentage,
                is_active=existing.is_active,
                notes=existing.notes,
                created_by=existing.created_by,
                created_at=existing.created_at,
                updated_at=existing.updated_at,
            )

    # Create new threshold
    threshold = VarianceThreshold(
        contractor_id=request.contractor_id,
        material_id=request.material_id,
        threshold_percentage=request.threshold_percentage,
        is_active=True,
        created_by=created_by,
        notes=request.notes,
    )
    db.add(threshold)
    db.commit()
    db.refresh(threshold)

    threshold_type = "contractor-specific" if request.contractor_id else "material default"
    logger.info(f"Created {threshold_type} threshold for material {material.code}: {request.threshold_percentage}%")

    return ThresholdResponse(
        id=threshold.id,
        contractor_id=threshold.contractor_id,
        contractor_name=contractor.name if contractor else None,
        material_id=threshold.material_id,
        material_name=material.name,
        threshold_percentage=threshold.threshold_percentage,
        is_active=threshold.is_active,
        notes=threshold.notes,
        created_by=threshold.created_by,
        created_at=threshold.created_at,
        updated_at=threshold.updated_at,
    )


@router.get("", response_model=ThresholdListResponse)
def list_thresholds(
    contractor_id: Optional[int] = Query(None, description="Filter by contractor"),
    material_id: Optional[int] = Query(None, description="Filter by material"),
    include_inactive: bool = Query(False, description="Include inactive thresholds"),
    db: Session = Depends(get_db)
):
    """
    List all variance thresholds.

    Supports filtering by contractor and/or material.
    """
    query = db.query(VarianceThreshold)

    if not include_inactive:
        query = query.filter(VarianceThreshold.is_active == True)

    if contractor_id is not None:
        # Include both contractor-specific and material defaults (contractor_id IS NULL)
        query = query.filter(
            (VarianceThreshold.contractor_id == contractor_id) |
            (VarianceThreshold.contractor_id.is_(None))
        )

    if material_id is not None:
        query = query.filter(VarianceThreshold.material_id == material_id)

    thresholds = query.order_by(
        VarianceThreshold.material_id,
        VarianceThreshold.contractor_id.nullsfirst()
    ).all()

    items = []
    for t in thresholds:
        material = db.query(Material).filter(Material.id == t.material_id).first()
        contractor = None
        if t.contractor_id:
            contractor = db.query(Contractor).filter(Contractor.id == t.contractor_id).first()

        items.append(ThresholdResponse(
            id=t.id,
            contractor_id=t.contractor_id,
            contractor_name=contractor.name if contractor else None,
            material_id=t.material_id,
            material_name=material.name if material else "Unknown",
            threshold_percentage=t.threshold_percentage,
            is_active=t.is_active,
            notes=t.notes,
            created_by=t.created_by,
            created_at=t.created_at,
            updated_at=t.updated_at,
        ))

    return ThresholdListResponse(
        items=items,
        total=len(items),
    )


@router.get("/effective/{contractor_id}/{material_id}")
def get_effective_threshold(
    contractor_id: int,
    material_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the effective threshold for a specific contractor-material pair.

    Returns the threshold and its source:
    - "contractor": Contractor-specific threshold
    - "material": Material default threshold
    - "system": System default (2.0%)
    """
    # Validate contractor and material exist
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail=f"Contractor with id {contractor_id} not found")

    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail=f"Material with id {material_id} not found")

    result = get_threshold_with_source(contractor_id, material_id, db)

    return {
        "contractor_id": contractor_id,
        "contractor_name": contractor.name,
        "material_id": material_id,
        "material_name": material.name,
        "threshold_percentage": float(result["threshold_percentage"]),
        "source": result["source"],
    }


@router.get("/{threshold_id}", response_model=ThresholdResponse)
def get_threshold(
    threshold_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific threshold by ID.
    """
    threshold = db.query(VarianceThreshold).filter(
        VarianceThreshold.id == threshold_id
    ).first()

    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold not found")

    material = db.query(Material).filter(Material.id == threshold.material_id).first()
    contractor = None
    if threshold.contractor_id:
        contractor = db.query(Contractor).filter(Contractor.id == threshold.contractor_id).first()

    return ThresholdResponse(
        id=threshold.id,
        contractor_id=threshold.contractor_id,
        contractor_name=contractor.name if contractor else None,
        material_id=threshold.material_id,
        material_name=material.name if material else "Unknown",
        threshold_percentage=threshold.threshold_percentage,
        is_active=threshold.is_active,
        notes=threshold.notes,
        created_by=threshold.created_by,
        created_at=threshold.created_at,
        updated_at=threshold.updated_at,
    )


@router.put("/{threshold_id}", response_model=ThresholdResponse)
def update_threshold(
    threshold_id: int,
    request: ThresholdUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing threshold.
    """
    threshold = db.query(VarianceThreshold).filter(
        VarianceThreshold.id == threshold_id
    ).first()

    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold not found")

    if request.threshold_percentage is not None:
        threshold.threshold_percentage = request.threshold_percentage
    if request.is_active is not None:
        threshold.is_active = request.is_active
    if request.notes is not None:
        threshold.notes = request.notes

    db.commit()
    db.refresh(threshold)

    material = db.query(Material).filter(Material.id == threshold.material_id).first()
    contractor = None
    if threshold.contractor_id:
        contractor = db.query(Contractor).filter(Contractor.id == threshold.contractor_id).first()

    logger.info(f"Updated threshold {threshold_id}: {threshold.threshold_percentage}%")

    return ThresholdResponse(
        id=threshold.id,
        contractor_id=threshold.contractor_id,
        contractor_name=contractor.name if contractor else None,
        material_id=threshold.material_id,
        material_name=material.name if material else "Unknown",
        threshold_percentage=threshold.threshold_percentage,
        is_active=threshold.is_active,
        notes=threshold.notes,
        created_by=threshold.created_by,
        created_at=threshold.created_at,
        updated_at=threshold.updated_at,
    )


@router.delete("/{threshold_id}")
def delete_threshold(
    threshold_id: int,
    db: Session = Depends(get_db)
):
    """
    Soft delete a threshold (sets is_active = False).
    """
    threshold = db.query(VarianceThreshold).filter(
        VarianceThreshold.id == threshold_id
    ).first()

    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold not found")

    threshold.is_active = False
    db.commit()

    logger.info(f"Deactivated threshold {threshold_id}")

    return {
        "message": "Threshold deactivated",
        "threshold_id": threshold_id,
    }
