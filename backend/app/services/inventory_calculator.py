"""
Expected Inventory Calculation Service

Calculates what inventory SHOULD be for a contractor based on:
- Opening balance (from last resolved inventory check or 0)
- + Material issuances
- - Production consumption
- - Material rejections (returned to warehouse)
"""
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.inventory_check import InventoryCheck, InventoryCheckLine
from app.models.consumption import Consumption
from app.models.material_issuance import MaterialIssuance
from app.models.material_rejection import MaterialRejection

logger = logging.getLogger(__name__)


class InventoryCalculationError(Exception):
    """Raised when inventory calculation fails."""
    pass


class InventoryCalculationResult:
    """Result of an inventory calculation with breakdown."""

    def __init__(
        self,
        expected: Decimal,
        opening_balance: Decimal,
        issued: Decimal,
        consumed: Decimal,
        rejected: Decimal,
        start_date: date,
        end_date: date,
        last_check_id: Optional[int] = None
    ):
        self.expected = expected
        self.opening_balance = opening_balance
        self.issued = issued
        self.consumed = consumed
        self.rejected = rejected
        self.start_date = start_date
        self.end_date = end_date
        self.last_check_id = last_check_id

    def to_dict(self) -> dict:
        return {
            "expected": float(self.expected),
            "opening_balance": float(self.opening_balance),
            "issued": float(self.issued),
            "consumed": float(self.consumed),
            "rejected": float(self.rejected),
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "last_check_id": self.last_check_id,
        }


def calculate_expected_inventory(
    contractor_id: int,
    material_id: int,
    as_of_date: date,
    db: Session
) -> Decimal:
    """
    Calculate what inventory SHOULD be for a contractor-material pair.

    Formula: Expected = Opening + Issued - Consumed - Rejected

    Args:
        contractor_id: The contractor ID
        material_id: The material ID
        as_of_date: Calculate expected inventory as of this date
        db: Database session

    Returns:
        Expected inventory quantity (Decimal)

    Raises:
        InventoryCalculationError: If calculation fails
    """
    result = calculate_expected_inventory_detailed(
        contractor_id=contractor_id,
        material_id=material_id,
        as_of_date=as_of_date,
        db=db
    )
    return result.expected


def calculate_expected_inventory_detailed(
    contractor_id: int,
    material_id: int,
    as_of_date: date,
    db: Session
) -> InventoryCalculationResult:
    """
    Calculate expected inventory with full breakdown.

    Args:
        contractor_id: The contractor ID
        material_id: The material ID
        as_of_date: Calculate expected inventory as of this date
        db: Database session

    Returns:
        InventoryCalculationResult with full breakdown

    Raises:
        InventoryCalculationError: If calculation fails
    """
    try:
        # Step 1: Find last resolved inventory check for this contractor-material BEFORE as_of_date
        opening_balance, start_date, last_check_id = _get_opening_balance(
            contractor_id=contractor_id,
            material_id=material_id,
            as_of_date=as_of_date,
            db=db
        )

        # Step 2: Sum all ISSUANCES in the period
        issued = _get_total_issued(
            contractor_id=contractor_id,
            material_id=material_id,
            start_date=start_date,
            end_date=as_of_date,
            db=db
        )

        # Step 3: Sum all CONSUMPTION (from production) in the period
        consumed = _get_total_consumed(
            contractor_id=contractor_id,
            material_id=material_id,
            start_date=start_date,
            end_date=as_of_date,
            db=db
        )

        # Step 4: Sum all REJECTIONS (RECEIVED_AT_WAREHOUSE status) in the period
        rejected = _get_total_rejected(
            contractor_id=contractor_id,
            material_id=material_id,
            start_date=start_date,
            end_date=as_of_date,
            db=db
        )

        # Step 5: Calculate expected
        expected = opening_balance + issued - consumed - rejected

        # Step 6: Log calculation for debugging
        logger.info(
            f"Expected inventory calculation for contractor={contractor_id}, "
            f"material={material_id}, as_of={as_of_date}:"
        )
        logger.info(f"  Period: {start_date} to {as_of_date}")
        logger.info(f"  Opening balance: {opening_balance}")
        logger.info(f"  + Issued: {issued}")
        logger.info(f"  - Consumed: {consumed}")
        logger.info(f"  - Rejected: {rejected}")
        logger.info(f"  = Expected: {expected}")

        return InventoryCalculationResult(
            expected=expected,
            opening_balance=opening_balance,
            issued=issued,
            consumed=consumed,
            rejected=rejected,
            start_date=start_date,
            end_date=as_of_date,
            last_check_id=last_check_id
        )

    except Exception as e:
        logger.error(
            f"Error calculating expected inventory for contractor={contractor_id}, "
            f"material={material_id}: {str(e)}"
        )
        raise InventoryCalculationError(f"Failed to calculate expected inventory: {str(e)}")


def _get_opening_balance(
    contractor_id: int,
    material_id: int,
    as_of_date: date,
    db: Session
) -> Tuple[Decimal, date, Optional[int]]:
    """
    Get opening balance from last resolved inventory check.

    Returns:
        Tuple of (opening_balance, start_date, last_check_id)
    """
    # Find last resolved inventory check for this contractor-material BEFORE as_of_date
    last_check_line = db.query(InventoryCheckLine).join(InventoryCheck).filter(
        InventoryCheck.contractor_id == contractor_id,
        InventoryCheck.status == "resolved",
        InventoryCheckLine.material_id == material_id,
        InventoryCheck.check_date < as_of_date
    ).order_by(InventoryCheck.check_date.desc()).first()

    if last_check_line and last_check_line.actual_quantity is not None:
        # Use actual count from last check as opening balance
        opening_balance = Decimal(str(last_check_line.actual_quantity))
        # Start counting from day AFTER the check
        start_date = last_check_line.check.check_date + timedelta(days=1)
        last_check_id = last_check_line.check.id

        logger.debug(
            f"Found previous inventory check {last_check_id} on {last_check_line.check.check_date} "
            f"with actual_quantity={opening_balance}"
        )
    else:
        # No previous check found - start from zero
        opening_balance = Decimal("0")
        # Use earliest possible date (practical minimum)
        start_date = date(2000, 1, 1)
        last_check_id = None

        logger.debug("No previous inventory check found, using opening balance of 0")

    return opening_balance, start_date, last_check_id


def _get_total_issued(
    contractor_id: int,
    material_id: int,
    start_date: date,
    end_date: date,
    db: Session
) -> Decimal:
    """Sum all material issuances in the period."""
    result = db.query(
        func.coalesce(func.sum(MaterialIssuance.quantity_in_base_unit), 0)
    ).filter(
        MaterialIssuance.contractor_id == contractor_id,
        MaterialIssuance.material_id == material_id,
        MaterialIssuance.issued_date >= start_date,
        MaterialIssuance.issued_date <= end_date
    ).scalar()

    return Decimal(str(result)) if result else Decimal("0")


def _get_total_consumed(
    contractor_id: int,
    material_id: int,
    start_date: date,
    end_date: date,
    db: Session
) -> Decimal:
    """Sum all consumption (from production) in the period."""
    # Consumption uses consumed_at (DateTime), so we need to handle date comparison
    from datetime import datetime, time

    start_datetime = datetime.combine(start_date, time.min)
    end_datetime = datetime.combine(end_date, time.max)

    result = db.query(
        func.coalesce(func.sum(Consumption.quantity), 0)
    ).filter(
        Consumption.contractor_id == contractor_id,
        Consumption.material_id == material_id,
        Consumption.consumed_at >= start_datetime,
        Consumption.consumed_at <= end_datetime
    ).scalar()

    return Decimal(str(result)) if result else Decimal("0")


def _get_total_rejected(
    contractor_id: int,
    material_id: int,
    start_date: date,
    end_date: date,
    db: Session
) -> Decimal:
    """Sum all rejections that were received at warehouse in the period."""
    result = db.query(
        func.coalesce(func.sum(MaterialRejection.quantity_rejected), 0)
    ).filter(
        MaterialRejection.contractor_id == contractor_id,
        MaterialRejection.material_id == material_id,
        MaterialRejection.status == MaterialRejection.STATUS_RECEIVED_AT_WAREHOUSE,
        MaterialRejection.rejection_date >= start_date,
        MaterialRejection.rejection_date <= end_date
    ).scalar()

    return Decimal(str(result)) if result else Decimal("0")


def calculate_variance(
    physical_count: Decimal,
    expected_quantity: Decimal
) -> Tuple[Decimal, Optional[Decimal]]:
    """
    Calculate variance and variance percentage.

    Args:
        physical_count: Actual counted quantity
        expected_quantity: Expected quantity from calculation

    Returns:
        Tuple of (variance, variance_percentage)
        variance = physical - expected (negative means shortage)
        variance_percentage = (variance / expected) * 100 (None if expected is 0)
    """
    variance = physical_count - expected_quantity

    if expected_quantity == 0:
        # Cannot calculate percentage if expected is 0
        # If physical > 0, it's an anomaly by definition
        variance_percentage = None
    else:
        variance_percentage = (variance / expected_quantity) * Decimal("100")

    return variance, variance_percentage


def is_anomaly(
    variance_percentage: Optional[Decimal],
    threshold_percentage: Decimal,
    physical_count: Decimal,
    expected_quantity: Decimal
) -> bool:
    """
    Determine if a variance constitutes an anomaly.

    Args:
        variance_percentage: Calculated variance percentage (can be None if expected is 0)
        threshold_percentage: Threshold for acceptable variance
        physical_count: Actual counted quantity
        expected_quantity: Expected quantity

    Returns:
        True if this is an anomaly, False otherwise
    """
    # Special case: expected is 0 but we found material
    if expected_quantity == 0 and physical_count > 0:
        return True

    # Special case: expected > 0 but nothing found
    if expected_quantity > 0 and physical_count == 0:
        return True

    # Normal case: check if variance percentage exceeds threshold
    if variance_percentage is not None:
        return abs(variance_percentage) > threshold_percentage

    return False
