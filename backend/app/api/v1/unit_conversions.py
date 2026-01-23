import logging
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UnitConversion, Material
from app.schemas.unit_conversion import (
    UnitConversionCreate,
    UnitConversionUpdate,
    UnitConversionResponse,
    ConvertQuantityRequest,
    ConvertQuantityResponse,
)
from app.services.unit_conversion_service import (
    convert_quantity,
    get_conversion_factor,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/unit-conversions", tags=["unit-conversions"])


def build_conversion_response(conversion: UnitConversion) -> UnitConversionResponse:
    """Build UnitConversionResponse from UnitConversion model."""
    return UnitConversionResponse(
        id=conversion.id,
        material_id=conversion.material_id,
        material_code=conversion.material.code,
        material_name=conversion.material.name,
        from_unit=conversion.from_unit,
        to_unit=conversion.to_unit,
        conversion_factor=Decimal(str(conversion.conversion_factor)),
        is_active=conversion.is_active,
        created_at=conversion.created_at,
    )


@router.post("", response_model=UnitConversionResponse, status_code=201)
def create_unit_conversion(
    conversion_data: UnitConversionCreate,
    db: Session = Depends(get_db),
):
    """Create a new unit conversion for a material."""
    # Validate material exists
    material = db.query(Material).filter(Material.id == conversion_data.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    # Check for duplicate conversion
    existing = db.query(UnitConversion).filter(
        UnitConversion.material_id == conversion_data.material_id,
        UnitConversion.from_unit == conversion_data.from_unit,
        UnitConversion.to_unit == conversion_data.to_unit,
    ).first()

    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"Conversion from '{conversion_data.from_unit}' to '{conversion_data.to_unit}' "
                       f"already exists for material '{material.code}'"
            )
        else:
            # Reactivate existing conversion with new factor
            existing.conversion_factor = conversion_data.conversion_factor
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            logger.info(
                f"Reactivated unit conversion for {material.code}: "
                f"{conversion_data.from_unit} -> {conversion_data.to_unit}"
            )
            return build_conversion_response(existing)

    # Create new conversion
    conversion = UnitConversion(
        material_id=conversion_data.material_id,
        from_unit=conversion_data.from_unit,
        to_unit=conversion_data.to_unit,
        conversion_factor=conversion_data.conversion_factor,
        is_active=True,
    )
    db.add(conversion)
    db.commit()
    db.refresh(conversion)

    logger.info(
        f"Created unit conversion for {material.code}: "
        f"{conversion.from_unit} -> {conversion.to_unit} (factor: {conversion.conversion_factor})"
    )
    return build_conversion_response(conversion)


@router.get("", response_model=list[UnitConversionResponse])
def list_unit_conversions(
    material_id: Optional[int] = Query(None, description="Filter by material ID"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    """List all unit conversions, optionally filtered by material."""
    query = db.query(UnitConversion)

    if material_id is not None:
        query = query.filter(UnitConversion.material_id == material_id)
    if is_active is not None:
        query = query.filter(UnitConversion.is_active == is_active)

    conversions = query.order_by(UnitConversion.material_id, UnitConversion.from_unit).all()
    return [build_conversion_response(c) for c in conversions]


@router.get("/{conversion_id}", response_model=UnitConversionResponse)
def get_unit_conversion(conversion_id: int, db: Session = Depends(get_db)):
    """Get a single unit conversion by ID."""
    conversion = db.query(UnitConversion).filter(UnitConversion.id == conversion_id).first()
    if not conversion:
        raise HTTPException(status_code=404, detail="Unit conversion not found")
    return build_conversion_response(conversion)


@router.put("/{conversion_id}", response_model=UnitConversionResponse)
def update_unit_conversion(
    conversion_id: int,
    update_data: UnitConversionUpdate,
    db: Session = Depends(get_db),
):
    """Update a unit conversion."""
    conversion = db.query(UnitConversion).filter(UnitConversion.id == conversion_id).first()
    if not conversion:
        raise HTTPException(status_code=404, detail="Unit conversion not found")

    if update_data.conversion_factor is not None:
        conversion.conversion_factor = update_data.conversion_factor
    if update_data.is_active is not None:
        conversion.is_active = update_data.is_active

    db.commit()
    db.refresh(conversion)

    logger.info(f"Updated unit conversion {conversion_id}")
    return build_conversion_response(conversion)


@router.delete("/{conversion_id}", status_code=204)
def delete_unit_conversion(conversion_id: int, db: Session = Depends(get_db)):
    """Soft delete a unit conversion (set is_active = False)."""
    conversion = db.query(UnitConversion).filter(UnitConversion.id == conversion_id).first()
    if not conversion:
        raise HTTPException(status_code=404, detail="Unit conversion not found")

    conversion.is_active = False
    db.commit()

    logger.info(f"Deactivated unit conversion {conversion_id}")
    return None


@router.post("/convert", response_model=ConvertQuantityResponse)
def convert_quantity_endpoint(
    request: ConvertQuantityRequest,
    db: Session = Depends(get_db),
):
    """
    Utility endpoint to convert a quantity between units for a material.
    Returns the converted quantity and the conversion factor used.
    """
    # Get the conversion factor
    factor = get_conversion_factor(
        material_id=request.material_id,
        from_unit=request.from_unit,
        to_unit=request.to_unit,
        db=db,
    )

    if factor is None:
        # Get material name for error message
        material = db.query(Material).filter(Material.id == request.material_id).first()
        if not material:
            raise HTTPException(status_code=404, detail="Material not found")
        raise HTTPException(
            status_code=400,
            detail=f"No conversion defined for {material.name} ({material.code}) "
                   f"from {request.from_unit} to {request.to_unit}"
        )

    # Convert the quantity
    converted = convert_quantity(
        material_id=request.material_id,
        quantity=request.quantity,
        from_unit=request.from_unit,
        to_unit=request.to_unit,
        db=db,
    )

    return ConvertQuantityResponse(
        original_quantity=request.quantity,
        from_unit=request.from_unit,
        converted_quantity=converted,
        to_unit=request.to_unit,
        conversion_factor_used=factor,
    )


# Additional endpoint under materials path
materials_router = APIRouter(prefix="/api/v1/materials", tags=["materials"])


@materials_router.get("/{material_id}/conversions", response_model=list[UnitConversionResponse])
def get_material_conversions(
    material_id: int,
    is_active: Optional[bool] = Query(True),
    db: Session = Depends(get_db),
):
    """Get all unit conversions for a specific material."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    query = db.query(UnitConversion).filter(UnitConversion.material_id == material_id)
    if is_active is not None:
        query = query.filter(UnitConversion.is_active == is_active)

    conversions = query.order_by(UnitConversion.from_unit).all()
    return [build_conversion_response(c) for c in conversions]
