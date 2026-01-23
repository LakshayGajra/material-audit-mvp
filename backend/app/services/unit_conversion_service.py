import logging
from decimal import Decimal, InvalidOperation
from typing import Union

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import UnitConversion, Material

logger = logging.getLogger(__name__)


def get_conversion_factor(
    material_id: int,
    from_unit: str,
    to_unit: str,
    db: Session,
) -> Decimal | None:
    """
    Get the conversion factor for converting between units for a specific material.

    Args:
        material_id: The ID of the material
        from_unit: The source unit (e.g., "tons")
        to_unit: The target unit (e.g., "kg")
        db: Database session

    Returns:
        Decimal conversion factor if found, None otherwise.
        For reverse conversions, returns 1/factor.
    """
    from_unit_normalized = from_unit.strip().lower()
    to_unit_normalized = to_unit.strip().lower()

    # Same unit - factor is 1
    if from_unit_normalized == to_unit_normalized:
        logger.debug(
            f"Same unit conversion requested for material_id={material_id}: "
            f"{from_unit} -> {to_unit}, factor=1"
        )
        return Decimal(1)

    # Try direct conversion
    direct_conversion = db.query(UnitConversion).filter(
        UnitConversion.material_id == material_id,
        UnitConversion.from_unit.ilike(from_unit_normalized),
        UnitConversion.to_unit.ilike(to_unit_normalized),
        UnitConversion.is_active == True,
    ).first()

    if direct_conversion:
        factor = Decimal(str(direct_conversion.conversion_factor))
        logger.debug(
            f"Direct conversion found for material_id={material_id}: "
            f"{from_unit} -> {to_unit}, factor={factor}"
        )
        return factor

    # Try reverse conversion
    reverse_conversion = db.query(UnitConversion).filter(
        UnitConversion.material_id == material_id,
        UnitConversion.from_unit.ilike(to_unit_normalized),
        UnitConversion.to_unit.ilike(from_unit_normalized),
        UnitConversion.is_active == True,
    ).first()

    if reverse_conversion:
        original_factor = Decimal(str(reverse_conversion.conversion_factor))
        if original_factor == 0:
            logger.error(
                f"Reverse conversion factor is zero for material_id={material_id}: "
                f"{to_unit} -> {from_unit}"
            )
            return None
        factor = Decimal(1) / original_factor
        logger.debug(
            f"Reverse conversion found for material_id={material_id}: "
            f"{from_unit} -> {to_unit}, factor={factor} (1/{original_factor})"
        )
        return factor

    logger.debug(
        f"No conversion found for material_id={material_id}: {from_unit} -> {to_unit}"
    )
    return None


def convert_quantity(
    material_id: int,
    quantity: Union[int, float, Decimal, str],
    from_unit: str,
    to_unit: str,
    db: Session,
) -> Decimal:
    """
    Convert a quantity from one unit to another for a specific material.

    Args:
        material_id: The ID of the material
        quantity: The quantity to convert
        from_unit: The source unit (e.g., "tons")
        to_unit: The target unit (e.g., "kg")
        db: Database session

    Returns:
        Decimal: The converted quantity

    Raises:
        HTTPException 400: If quantity is invalid or no conversion is defined
        HTTPException 404: If material is not found
    """
    logger.info(
        f"Converting quantity for material_id={material_id}: "
        f"{quantity} {from_unit} -> {to_unit}"
    )

    # Validate and convert quantity to Decimal
    try:
        qty = Decimal(str(quantity))
    except (InvalidOperation, ValueError) as e:
        logger.error(f"Invalid quantity value: {quantity}, error: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid quantity value: {quantity}"
        )

    # Validate quantity is not negative
    if qty < 0:
        logger.error(f"Negative quantity not allowed: {quantity}")
        raise HTTPException(
            status_code=400,
            detail=f"Quantity cannot be negative: {quantity}"
        )

    # Normalize units
    from_unit_normalized = from_unit.strip().lower()
    to_unit_normalized = to_unit.strip().lower()

    # Same unit - no conversion needed
    if from_unit_normalized == to_unit_normalized:
        logger.info(
            f"No conversion needed (same unit): {qty} {from_unit}"
        )
        return qty

    # Get the conversion factor
    factor = get_conversion_factor(material_id, from_unit, to_unit, db)

    if factor is not None:
        converted = qty * factor
        logger.info(
            f"Conversion successful: {qty} {from_unit} = {converted} {to_unit} "
            f"(factor: {factor})"
        )
        return converted

    # No conversion found - get material name for error message
    material = db.query(Material).filter(Material.id == material_id).first()

    if not material:
        logger.error(f"Material not found: id={material_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Material with id {material_id} not found"
        )

    error_msg = (
        f"No conversion defined for {material.name} ({material.code}) "
        f"from {from_unit} to {to_unit}"
    )
    logger.error(error_msg)
    raise HTTPException(status_code=400, detail=error_msg)


def get_all_conversions_for_material(
    material_id: int,
    db: Session,
) -> list[dict]:
    """
    Get all active unit conversions defined for a material.

    Args:
        material_id: The ID of the material
        db: Database session

    Returns:
        List of conversion dictionaries with from_unit, to_unit, and factor
    """
    conversions = db.query(UnitConversion).filter(
        UnitConversion.material_id == material_id,
        UnitConversion.is_active == True,
    ).all()

    result = []
    for conv in conversions:
        result.append({
            "id": conv.id,
            "from_unit": conv.from_unit,
            "to_unit": conv.to_unit,
            "conversion_factor": float(conv.conversion_factor),
        })

    logger.debug(
        f"Found {len(result)} conversions for material_id={material_id}"
    )
    return result
