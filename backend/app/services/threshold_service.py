"""
Variance Threshold Service

Retrieves variance thresholds with priority lookup:
1. Contractor-specific threshold
2. Material default threshold
3. System default (2.0%)
"""
import logging
from decimal import Decimal
from typing import Literal, TypedDict

from sqlalchemy.orm import Session

from app.models.variance_threshold import VarianceThreshold

logger = logging.getLogger(__name__)

# System default threshold percentage
SYSTEM_DEFAULT_THRESHOLD = Decimal("2.0")


class ThresholdResult(TypedDict):
    """Result of threshold lookup with source information."""
    threshold_percentage: Decimal
    source: Literal["contractor", "material", "system"]


def get_threshold(
    contractor_id: int,
    material_id: int,
    db: Session
) -> Decimal:
    """
    Get the variance threshold for a contractor-material pair.

    Lookup priority:
    1. Contractor-specific threshold
    2. Material default threshold (contractor_id IS NULL)
    3. System default (2.0%)

    Args:
        contractor_id: The contractor ID
        material_id: The material ID
        db: Database session

    Returns:
        Decimal threshold percentage
    """
    result = get_threshold_with_source(contractor_id, material_id, db)
    return result["threshold_percentage"]


def get_threshold_with_source(
    contractor_id: int,
    material_id: int,
    db: Session
) -> ThresholdResult:
    """
    Get the variance threshold with source information.

    Lookup priority:
    1. Contractor-specific threshold
    2. Material default threshold (contractor_id IS NULL)
    3. System default (2.0%)

    Args:
        contractor_id: The contractor ID
        material_id: The material ID
        db: Database session

    Returns:
        ThresholdResult with threshold_percentage and source
    """
    # 1. Try contractor-specific threshold
    contractor_threshold = db.query(VarianceThreshold).filter(
        VarianceThreshold.contractor_id == contractor_id,
        VarianceThreshold.material_id == material_id,
        VarianceThreshold.is_active == True,
    ).first()

    if contractor_threshold:
        threshold_pct = Decimal(str(contractor_threshold.threshold_percentage))
        logger.debug(
            f"Found contractor-specific threshold for contractor={contractor_id}, "
            f"material={material_id}: {threshold_pct}%"
        )
        return {
            "threshold_percentage": threshold_pct,
            "source": "contractor"
        }

    # 2. Try material default threshold (contractor_id IS NULL)
    material_threshold = db.query(VarianceThreshold).filter(
        VarianceThreshold.contractor_id.is_(None),
        VarianceThreshold.material_id == material_id,
        VarianceThreshold.is_active == True,
    ).first()

    if material_threshold:
        threshold_pct = Decimal(str(material_threshold.threshold_percentage))
        logger.debug(
            f"Found material default threshold for material={material_id}: {threshold_pct}%"
        )
        return {
            "threshold_percentage": threshold_pct,
            "source": "material"
        }

    # 3. Return system default
    logger.debug(
        f"No threshold found for contractor={contractor_id}, material={material_id}. "
        f"Using system default: {SYSTEM_DEFAULT_THRESHOLD}%"
    )
    return {
        "threshold_percentage": SYSTEM_DEFAULT_THRESHOLD,
        "source": "system"
    }


def create_threshold(
    material_id: int,
    threshold_percentage: Decimal,
    db: Session,
    contractor_id: int | None = None,
    created_by: str | None = None,
    notes: str | None = None
) -> VarianceThreshold:
    """
    Create a new variance threshold.

    Args:
        material_id: The material ID
        threshold_percentage: The threshold percentage
        db: Database session
        contractor_id: Optional contractor ID (None for material default)
        created_by: Optional creator name
        notes: Optional notes

    Returns:
        Created VarianceThreshold record
    """
    threshold = VarianceThreshold(
        contractor_id=contractor_id,
        material_id=material_id,
        threshold_percentage=threshold_percentage,
        created_by=created_by,
        notes=notes,
        is_active=True,
    )
    db.add(threshold)
    db.flush()

    source = "contractor-specific" if contractor_id else "material default"
    logger.info(
        f"Created {source} threshold for material={material_id}: {threshold_percentage}%"
    )

    return threshold


def update_threshold(
    threshold_id: int,
    db: Session,
    threshold_percentage: Decimal | None = None,
    is_active: bool | None = None,
    notes: str | None = None
) -> VarianceThreshold | None:
    """
    Update an existing variance threshold.

    Args:
        threshold_id: The threshold ID
        db: Database session
        threshold_percentage: Optional new threshold percentage
        is_active: Optional new active status
        notes: Optional new notes

    Returns:
        Updated VarianceThreshold record, or None if not found
    """
    threshold = db.query(VarianceThreshold).filter(
        VarianceThreshold.id == threshold_id
    ).first()

    if not threshold:
        return None

    if threshold_percentage is not None:
        threshold.threshold_percentage = threshold_percentage
    if is_active is not None:
        threshold.is_active = is_active
    if notes is not None:
        threshold.notes = notes

    db.flush()
    logger.info(f"Updated threshold id={threshold_id}")

    return threshold
