"""
Reconciliation API Endpoints

Handles periodic contractor inventory reporting and reconciliation.
Unlike blind audits, reconciliation shows variances immediately after submission.
"""
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Anomaly,
    Contractor,
    ContractorInventory,
    InventoryAdjustment,
    Material,
    Reconciliation,
    ReconciliationLine,
)
from app.schemas.reconciliation import (
    ReconciliationSubmitRequest,
    ReconciliationResponse,
    ReconciliationLineResponse,
    ReconciliationListResponse,
    ReconciliationReviewRequest,
)
from app.services.threshold_service import get_threshold_with_source

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/reconciliations", tags=["Reconciliations"])


def _build_line_response(line: ReconciliationLine, material: Material) -> ReconciliationLineResponse:
    """Build a ReconciliationLineResponse from a line item and material."""
    return ReconciliationLineResponse(
        id=line.id,
        material_id=line.material_id,
        material_name=material.name if material else "Unknown",
        material_code=material.code if material else "Unknown",
        unit_of_measure=line.unit_of_measure,
        reported_quantity=Decimal(str(line.reported_quantity)) if line.reported_quantity else Decimal(0),
        contractor_notes=line.contractor_notes,
        system_quantity=Decimal(str(line.system_quantity)) if line.system_quantity else None,
        variance=Decimal(str(line.variance)) if line.variance else None,
        variance_percentage=Decimal(str(line.variance_percentage)) if line.variance_percentage else None,
        threshold_used=Decimal(str(line.threshold_used)) if line.threshold_used else None,
        is_anomaly=line.is_anomaly,
        anomaly_id=line.anomaly_id,
    )


def _build_reconciliation_response(
    recon: Reconciliation,
    contractor: Contractor,
    db: Session,
    include_lines: bool = True
) -> ReconciliationResponse:
    """Build a ReconciliationResponse from a reconciliation record."""
    line_items = []
    anomaly_count = 0

    if include_lines:
        lines = db.query(ReconciliationLine).filter(
            ReconciliationLine.reconciliation_id == recon.id
        ).all()

        for line in lines:
            material = db.query(Material).filter(Material.id == line.material_id).first()
            line_items.append(_build_line_response(line, material))
            if line.is_anomaly:
                anomaly_count += 1
    else:
        anomaly_count = db.query(ReconciliationLine).filter(
            ReconciliationLine.reconciliation_id == recon.id,
            ReconciliationLine.is_anomaly == True
        ).count()

    return ReconciliationResponse(
        id=recon.id,
        reconciliation_number=recon.reconciliation_number,
        contractor_id=recon.contractor_id,
        contractor_name=contractor.name if contractor else "Unknown",
        reconciliation_date=recon.reconciliation_date,
        period_type=recon.period_type,
        period_start=recon.period_start,
        period_end=recon.period_end,
        reported_by=recon.reported_by,
        status=recon.status,
        reviewed_by=recon.reviewed_by,
        reviewed_at=recon.reviewed_at,
        line_items=line_items,
        total_anomalies=anomaly_count,
        notes=recon.notes,
        created_at=recon.created_at,
    )


@router.post("/submit", response_model=ReconciliationResponse)
def submit_reconciliation(
    request: ReconciliationSubmitRequest,
    db: Session = Depends(get_db)
):
    """
    Contractor submits inventory counts for reconciliation.

    Unlike blind audits, variances are calculated and shown immediately.
    """
    # Validate contractor exists
    contractor = db.query(Contractor).filter(Contractor.id == request.contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail=f"Contractor with id {request.contractor_id} not found")

    # Generate reconciliation number and create record
    recon_number = Reconciliation.generate_reconciliation_number(db)
    reconciliation = Reconciliation(
        reconciliation_number=recon_number,
        contractor_id=request.contractor_id,
        reconciliation_date=request.reconciliation_date,
        period_type=request.period_type,
        period_start=request.period_start,
        period_end=request.period_end,
        reported_by=request.reported_by,
        status=Reconciliation.STATUS_SUBMITTED,
        notes=request.notes,
    )
    db.add(reconciliation)
    db.flush()

    logger.info(f"Created reconciliation {recon_number} for contractor {contractor.name}")

    anomaly_count = 0

    # Process each item
    for item in request.items:
        # Validate material exists
        material = db.query(Material).filter(Material.id == item.material_id).first()
        if not material:
            raise HTTPException(
                status_code=404,
                detail=f"Material with id {item.material_id} not found"
            )

        # Get system quantity from contractor inventory
        inventory = db.query(ContractorInventory).filter(
            ContractorInventory.contractor_id == request.contractor_id,
            ContractorInventory.material_id == item.material_id
        ).first()

        system_qty = Decimal(str(inventory.quantity)) if inventory else Decimal(0)
        reported_qty = item.reported_quantity

        # Calculate variance
        variance = reported_qty - system_qty
        if system_qty != 0:
            variance_pct = (variance / system_qty) * Decimal("100")
        else:
            variance_pct = Decimal("100") if reported_qty > 0 else Decimal("0")

        # Get threshold
        threshold_result = get_threshold_with_source(
            contractor_id=request.contractor_id,
            material_id=item.material_id,
            db=db
        )
        threshold = threshold_result["threshold_percentage"]

        # Determine if anomaly (any significant variance is an anomaly for reconciliation)
        is_anomaly = abs(variance_pct) > threshold

        anomaly_id = None
        if is_anomaly:
            # Determine anomaly type based on variance direction
            if variance < 0:
                anomaly_type = "reconciliation_shortage"
            else:
                anomaly_type = "reconciliation_excess"

            anomaly = Anomaly(
                contractor_id=request.contractor_id,
                material_id=item.material_id,
                production_record_id=None,
                expected_quantity=float(system_qty),
                actual_quantity=float(reported_qty),
                variance=float(variance),
                variance_percent=float(variance_pct),
                anomaly_type=anomaly_type,
                notes=f"Detected during reconciliation {recon_number}. Threshold: {threshold}%",
                resolved=False,
            )
            db.add(anomaly)
            db.flush()
            anomaly_id = anomaly.id
            anomaly_count += 1

            logger.warning(
                f"Anomaly detected in reconciliation {recon_number}: "
                f"material={material.code}, system={system_qty}, reported={reported_qty}, "
                f"variance={variance_pct:.2f}%, threshold={threshold}%"
            )

        # Create reconciliation line
        line = ReconciliationLine(
            reconciliation_id=reconciliation.id,
            material_id=item.material_id,
            reported_quantity=reported_qty,
            unit_of_measure=material.unit,
            contractor_notes=item.notes,
            system_quantity=system_qty,
            variance=variance,
            variance_percentage=variance_pct,
            threshold_used=threshold,
            is_anomaly=is_anomaly,
            anomaly_id=anomaly_id,
        )
        db.add(line)

    db.commit()

    logger.info(
        f"Reconciliation {recon_number} submitted: "
        f"{len(request.items)} items, {anomaly_count} anomalies"
    )

    return _build_reconciliation_response(reconciliation, contractor, db)


@router.get("", response_model=ReconciliationListResponse)
def list_reconciliations(
    contractor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    has_anomalies: Optional[bool] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List all reconciliations with optional filters.
    """
    query = db.query(Reconciliation)

    if contractor_id:
        query = query.filter(Reconciliation.contractor_id == contractor_id)
    if status:
        query = query.filter(Reconciliation.status == status.upper())
    if date_from:
        query = query.filter(Reconciliation.reconciliation_date >= date_from)
    if date_to:
        query = query.filter(Reconciliation.reconciliation_date <= date_to)

    # Count total before pagination
    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    reconciliations = query.order_by(
        Reconciliation.reconciliation_date.desc()
    ).offset(offset).limit(page_size).all()

    # Build response
    items = []
    for recon in reconciliations:
        contractor = db.query(Contractor).filter(Contractor.id == recon.contractor_id).first()
        response = _build_reconciliation_response(recon, contractor, db, include_lines=False)

        # Filter by has_anomalies if specified
        if has_anomalies is not None:
            if has_anomalies and response.total_anomalies == 0:
                continue
            if not has_anomalies and response.total_anomalies > 0:
                continue

        items.append(response)

    return ReconciliationListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/pending-review", response_model=List[ReconciliationResponse])
def get_pending_review(
    db: Session = Depends(get_db)
):
    """
    Get reconciliations pending review (status = SUBMITTED with anomalies).
    """
    # Get submitted reconciliations that have anomalies
    reconciliations = db.query(Reconciliation).filter(
        Reconciliation.status == Reconciliation.STATUS_SUBMITTED
    ).order_by(Reconciliation.created_at.asc()).all()

    items = []
    for recon in reconciliations:
        contractor = db.query(Contractor).filter(Contractor.id == recon.contractor_id).first()
        response = _build_reconciliation_response(recon, contractor, db, include_lines=False)

        # Only include if has anomalies
        if response.total_anomalies > 0:
            items.append(response)

    return items


@router.get("/{recon_id}", response_model=ReconciliationResponse)
def get_reconciliation(
    recon_id: int,
    db: Session = Depends(get_db)
):
    """
    Get full reconciliation details.
    """
    reconciliation = db.query(Reconciliation).filter(Reconciliation.id == recon_id).first()
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found")

    contractor = db.query(Contractor).filter(Contractor.id == reconciliation.contractor_id).first()

    return _build_reconciliation_response(reconciliation, contractor, db)


@router.put("/{recon_id}/review", response_model=ReconciliationResponse)
def review_reconciliation(
    recon_id: int,
    request: ReconciliationReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Manager reviews a reconciliation.

    If status = ACCEPTED and adjust_inventory = True:
    - Inventory is adjusted to match reported quantities
    - Anomalies are marked as resolved

    If status = DISPUTED:
    - Anomalies are marked for investigation
    """
    try:
        reconciliation = db.query(Reconciliation).filter(Reconciliation.id == recon_id).first()
        if not reconciliation:
            raise HTTPException(status_code=404, detail="Reconciliation not found")

        if reconciliation.status != Reconciliation.STATUS_SUBMITTED:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot review - reconciliation status is {reconciliation.status}, expected SUBMITTED"
            )

        contractor = db.query(Contractor).filter(Contractor.id == reconciliation.contractor_id).first()

        # Get all line items
        lines = db.query(ReconciliationLine).filter(
            ReconciliationLine.reconciliation_id == recon_id
        ).all()

        if request.status == Reconciliation.STATUS_ACCEPTED:
            if request.adjust_inventory:
                # Adjust inventory for each line item
                for line in lines:
                    inventory = db.query(ContractorInventory).filter(
                        ContractorInventory.contractor_id == reconciliation.contractor_id,
                        ContractorInventory.material_id == line.material_id
                    ).first()

                    if not inventory:
                        continue

                    current_qty = Decimal(str(inventory.quantity))
                    reported_qty = Decimal(str(line.reported_quantity))

                    if current_qty == reported_qty:
                        continue

                    adjustment_qty = reported_qty - current_qty

                    # Create adjustment record
                    adjustment = InventoryAdjustment(
                        adjustment_number=InventoryAdjustment.generate_adjustment_number(db),
                        contractor_id=reconciliation.contractor_id,
                        material_id=line.material_id,
                        audit_line_item_id=None,
                        adjustment_type=InventoryAdjustment.TYPE_AUDIT_CORRECTION,
                        quantity_before=current_qty,
                        quantity_after=reported_qty,
                        adjustment_quantity=adjustment_qty,
                        unit_of_measure=line.unit_of_measure,
                        adjustment_date=date.today(),
                        reason=f"Reconciliation adjustment from {reconciliation.reconciliation_number}",
                        requested_by=request.reviewed_by,
                        status=InventoryAdjustment.STATUS_APPROVED,
                        approved_by=request.reviewed_by,
                        approved_at=datetime.utcnow(),
                    )
                    db.add(adjustment)
                    db.flush()  # Flush to generate unique adjustment numbers

                    # Update contractor inventory
                    inventory.quantity = float(reported_qty)

                    logger.info(
                        f"Adjusted inventory for contractor={reconciliation.contractor_id}, "
                        f"material={line.material_id}: {current_qty} -> {reported_qty}"
                    )

            # Mark anomalies as resolved
            for line in lines:
                if line.anomaly_id:
                    anomaly = db.query(Anomaly).filter(Anomaly.id == line.anomaly_id).first()
                    if anomaly:
                        anomaly.resolved = True
                        anomaly.resolved_at = datetime.utcnow()

        elif request.status == Reconciliation.STATUS_DISPUTED:
            # Mark anomalies for investigation
            for line in lines:
                if line.anomaly_id:
                    anomaly = db.query(Anomaly).filter(Anomaly.id == line.anomaly_id).first()
                    if anomaly and request.notes:
                        anomaly.notes = f"{anomaly.notes}\n\nDisputed: {request.notes}"

        # Update reconciliation status
        reconciliation.status = request.status
        reconciliation.reviewed_by = request.reviewed_by
        reconciliation.reviewed_at = datetime.utcnow()
        if request.notes:
            if reconciliation.notes:
                reconciliation.notes = f"{reconciliation.notes}\n\nReview: {request.notes}"
            else:
                reconciliation.notes = f"Review: {request.notes}"

        db.commit()

        logger.info(f"Reconciliation {reconciliation.reconciliation_number} reviewed: {request.status}")

        return _build_reconciliation_response(reconciliation, contractor, db)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error reviewing reconciliation {recon_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error reviewing reconciliation: {str(e)}")


# =============================================================================
# CONTRACTOR-SPECIFIC ENDPOINTS
# =============================================================================

contractor_router = APIRouter(prefix="/api/v1/contractors", tags=["Contractors"])


@contractor_router.get("/{contractor_id}/reconciliations", response_model=List[ReconciliationResponse])
def get_contractor_reconciliations(
    contractor_id: int,
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get reconciliation history for a specific contractor.
    """
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    query = db.query(Reconciliation).filter(Reconciliation.contractor_id == contractor_id)

    if status:
        query = query.filter(Reconciliation.status == status.upper())

    reconciliations = query.order_by(
        Reconciliation.reconciliation_date.desc()
    ).limit(limit).all()

    return [
        _build_reconciliation_response(recon, contractor, db, include_lines=False)
        for recon in reconciliations
    ]
