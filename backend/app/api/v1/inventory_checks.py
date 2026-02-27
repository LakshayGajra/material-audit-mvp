import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    Contractor,
    ContractorInventory,
    Material,
)
from app.models.inventory_check import InventoryCheck, InventoryCheckLine
from app.schemas.inventory_check import (
    InventoryCheckCreate,
    InventoryCheckResponse,
    InventoryCheckListResponse,
    InventoryCheckLineResponse,
    EnterCountsRequest,
    ResolveRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/inventory-checks", tags=["inventory-checks"])


def generate_check_number(db: Session) -> str:
    """Generate check number in format IC-YYYY-NNNN."""
    year = date.today().year
    prefix = f"IC-{year}-"

    latest = db.query(InventoryCheck).filter(
        InventoryCheck.check_number.like(f"{prefix}%")
    ).order_by(InventoryCheck.check_number.desc()).first()

    if latest:
        try:
            last_num = int(latest.check_number.split("-")[-1])
            next_num = last_num + 1
        except ValueError:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{next_num:04d}"


def build_line_response(line: InventoryCheckLine) -> InventoryCheckLineResponse:
    """Build line response from model."""
    return InventoryCheckLineResponse(
        id=line.id,
        check_id=line.check_id,
        material_id=line.material_id,
        material_code=line.material.code,
        material_name=line.material.name,
        material_unit=line.material.unit,
        expected_quantity=Decimal(str(line.expected_quantity)) if line.expected_quantity else Decimal(0),
        actual_quantity=Decimal(str(line.actual_quantity)) if line.actual_quantity is not None else None,
        variance=Decimal(str(line.variance)) if line.variance is not None else None,
        variance_percent=Decimal(str(line.variance_percent)) if line.variance_percent is not None else None,
        resolution=line.resolution,
        adjustment_quantity=Decimal(str(line.adjustment_quantity)) if line.adjustment_quantity is not None else None,
        resolution_notes=line.resolution_notes,
    )


def build_check_response(check: InventoryCheck) -> InventoryCheckResponse:
    """Build check response from model."""
    lines = [build_line_response(line) for line in check.lines]

    # Calculate summary
    lines_with_variance = sum(1 for line in check.lines if line.variance and abs(float(line.variance)) > 0.001)
    total_variance_value = sum(
        abs(float(line.variance)) for line in check.lines
        if line.variance is not None
    )

    return InventoryCheckResponse(
        id=check.id,
        check_number=check.check_number,
        contractor_id=check.contractor_id,
        contractor_name=check.contractor.name,
        contractor_code=check.contractor.code,
        check_type=check.check_type,
        is_blind=check.is_blind,
        status=check.status,
        initiated_by=check.initiated_by,
        counted_by=check.counted_by,
        reviewed_by=check.reviewed_by,
        check_date=check.check_date,
        submitted_at=check.submitted_at,
        resolved_at=check.resolved_at,
        notes=check.notes,
        lines=lines,
        created_at=check.created_at,
        updated_at=check.updated_at,
        total_lines=len(check.lines),
        lines_with_variance=lines_with_variance,
        total_variance_value=Decimal(str(total_variance_value)),
    )


@router.post("", response_model=InventoryCheckResponse, status_code=201)
def create_inventory_check(data: InventoryCheckCreate, db: Session = Depends(get_db)):
    """
    Create a new inventory check.

    Automatically populates line items from contractor's current inventory.
    """
    try:
        # Validate contractor exists
        contractor = db.query(Contractor).filter(Contractor.id == data.contractor_id).first()
        if not contractor:
            raise HTTPException(status_code=404, detail="Contractor not found")

        # Get contractor's current inventory
        inventory_items = db.query(ContractorInventory).filter(
            ContractorInventory.contractor_id == data.contractor_id,
            ContractorInventory.quantity > 0
        ).all()

        if not inventory_items:
            raise HTTPException(
                status_code=400,
                detail="Contractor has no inventory to check"
            )

        # Generate check number
        check_number = generate_check_number(db)

        # Create check record
        check = InventoryCheck(
            check_number=check_number,
            contractor_id=data.contractor_id,
            check_type=data.check_type,
            is_blind=data.is_blind,
            check_date=data.check_date,
            initiated_by=data.initiated_by,
            status="counting",
            notes=data.notes,
        )
        db.add(check)
        db.flush()

        # Create line items for each inventory item
        for inv in inventory_items:
            line = InventoryCheckLine(
                check_id=check.id,
                material_id=inv.material_id,
                expected_quantity=Decimal(str(inv.quantity)),
            )
            db.add(line)

        db.commit()
        db.refresh(check)

        logger.info(f"Created inventory check: {check.check_number} for contractor: {contractor.code}")
        return build_check_response(check)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating inventory check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create inventory check: {str(e)}")


@router.get("", response_model=list[InventoryCheckListResponse])
def list_inventory_checks(
    contractor_id: Optional[int] = Query(None),
    check_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """List inventory checks with optional filters."""
    query = db.query(InventoryCheck)

    if contractor_id:
        query = query.filter(InventoryCheck.contractor_id == contractor_id)
    if check_type:
        query = query.filter(InventoryCheck.check_type == check_type)
    if status:
        query = query.filter(InventoryCheck.status == status)
    if date_from:
        query = query.filter(InventoryCheck.check_date >= date_from)
    if date_to:
        query = query.filter(InventoryCheck.check_date <= date_to)

    checks = query.order_by(InventoryCheck.created_at.desc()).all()

    result = []
    for check in checks:
        lines_with_variance = sum(
            1 for line in check.lines
            if line.variance is not None and abs(float(line.variance)) > 0.001
        )

        result.append(InventoryCheckListResponse(
            id=check.id,
            check_number=check.check_number,
            contractor_name=check.contractor.name,
            contractor_code=check.contractor.code,
            check_type=check.check_type,
            status=check.status,
            check_date=check.check_date,
            initiated_by=check.initiated_by,
            counted_by=check.counted_by,
            total_lines=len(check.lines),
            lines_with_variance=lines_with_variance,
            created_at=check.created_at,
        ))

    return result


@router.get("/{check_id}", response_model=InventoryCheckResponse)
def get_inventory_check(check_id: int, db: Session = Depends(get_db)):
    """Get a single inventory check with all lines."""
    check = db.query(InventoryCheck).filter(InventoryCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Inventory check not found")
    return build_check_response(check)


@router.get("/{check_id}/counting-view")
def get_counting_view(check_id: int, db: Session = Depends(get_db)):
    """
    Get inventory check for counting - respects blind audit setting.

    If is_blind=True, expected quantities are hidden.
    """
    check = db.query(InventoryCheck).filter(InventoryCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Inventory check not found")

    lines = []
    for line in check.lines:
        line_data = {
            "id": line.id,
            "material_id": line.material_id,
            "material_code": line.material.code,
            "material_name": line.material.name,
            "material_unit": line.material.unit,
            "actual_quantity": float(line.actual_quantity) if line.actual_quantity is not None else None,
        }
        # Only show expected if not blind
        if not check.is_blind:
            line_data["expected_quantity"] = float(line.expected_quantity)

        lines.append(line_data)

    return {
        "id": check.id,
        "check_number": check.check_number,
        "contractor_name": check.contractor.name,
        "contractor_code": check.contractor.code,
        "check_type": check.check_type,
        "is_blind": check.is_blind,
        "status": check.status,
        "check_date": check.check_date.isoformat(),
        "counted_by": check.counted_by,
        "lines": lines,
    }


@router.put("/{check_id}/counts", response_model=InventoryCheckResponse)
def enter_counts(check_id: int, data: EnterCountsRequest, db: Session = Depends(get_db)):
    """Enter physical counts for an inventory check."""
    try:
        check = db.query(InventoryCheck).filter(InventoryCheck.id == check_id).first()
        if not check:
            raise HTTPException(status_code=404, detail="Inventory check not found")

        if check.status not in ["counting", "draft"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot enter counts for check with status '{check.status}'"
            )

        # Build line map
        line_map = {line.id: line for line in check.lines}

        # Update counts
        for count in data.counts:
            if count.line_id not in line_map:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line ID {count.line_id} not found in this check"
                )

            line = line_map[count.line_id]
            line.actual_quantity = count.actual_quantity

            # Calculate variance
            expected = Decimal(str(line.expected_quantity))
            actual = count.actual_quantity
            variance = actual - expected
            line.variance = variance

            # Calculate variance percent
            if expected > 0:
                line.variance_percent = (variance / expected) * 100
            else:
                line.variance_percent = Decimal(100) if actual > 0 else Decimal(0)

        check.counted_by = data.counted_by
        check.status = "review"
        check.submitted_at = datetime.utcnow()

        db.commit()
        db.refresh(check)

        logger.info(f"Counts entered for inventory check: {check.check_number}")
        return build_check_response(check)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error entering counts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to enter counts: {str(e)}")


@router.put("/{check_id}/resolve", response_model=InventoryCheckResponse)
def resolve_variances(check_id: int, data: ResolveRequest, db: Session = Depends(get_db)):
    """
    Resolve variances and close the inventory check.

    Resolution options:
    - 'accept': Adjust contractor inventory to match actual count
    - 'keep_system': Keep system value, flag as loss/anomaly
    - 'investigate': Mark for follow-up investigation
    """
    try:
        check = db.query(InventoryCheck).filter(InventoryCheck.id == check_id).first()
        if not check:
            raise HTTPException(status_code=404, detail="Inventory check not found")

        if check.status != "review":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot resolve check with status '{check.status}'. Must be 'review'."
            )

        # Build line map
        line_map = {line.id: line for line in check.lines}

        # Process resolutions
        for res in data.resolutions:
            if res.line_id not in line_map:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line ID {res.line_id} not found in this check"
                )

            line = line_map[res.line_id]
            line.resolution = res.resolution
            line.resolution_notes = res.resolution_notes

            if res.resolution == 'accept' and line.actual_quantity is not None:
                # Adjust contractor inventory to match actual count
                line.adjustment_quantity = line.variance

                contractor_inv = db.query(ContractorInventory).filter(
                    ContractorInventory.contractor_id == check.contractor_id,
                    ContractorInventory.material_id == line.material_id,
                ).first()

                if contractor_inv:
                    contractor_inv.quantity = float(line.actual_quantity)
                    logger.info(
                        f"Adjusted contractor inventory for material {line.material.code}: "
                        f"was {line.expected_quantity}, now {line.actual_quantity}"
                    )

        check.reviewed_by = data.reviewed_by
        check.status = "resolved"
        check.resolved_at = datetime.utcnow()

        db.commit()
        db.refresh(check)

        logger.info(f"Resolved inventory check: {check.check_number}")
        return build_check_response(check)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving inventory check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve inventory check: {str(e)}")


@router.post("/{check_id}/save-counts")
def save_counts_draft(check_id: int, data: EnterCountsRequest, db: Session = Depends(get_db)):
    """Save counts as draft without submitting for review."""
    try:
        check = db.query(InventoryCheck).filter(InventoryCheck.id == check_id).first()
        if not check:
            raise HTTPException(status_code=404, detail="Inventory check not found")

        if check.status not in ["counting", "draft"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot save counts for check with status '{check.status}'"
            )

        # Build line map
        line_map = {line.id: line for line in check.lines}

        # Update counts
        for count in data.counts:
            if count.line_id not in line_map:
                continue

            line = line_map[count.line_id]
            line.actual_quantity = count.actual_quantity

        check.counted_by = data.counted_by

        db.commit()

        return {"message": "Counts saved as draft"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save counts: {str(e)}")
