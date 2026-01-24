"""
Audit API Endpoints

Two sets of endpoints:
1. Auditor endpoints - Limited view, NO expected values (blind audit)
2. Manager endpoints - Full view with variance analysis
"""
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Audit,
    AuditLineItem,
    Anomaly,
    Contractor,
    ContractorInventory,
    InventoryAdjustment,
    Material,
)
from app.schemas.audit import (
    AuditStartRequest,
    AuditForAuditor,
    AuditMaterialForAuditor,
    PhysicalCountEntry,
    AuditSubmitRequest,
    AuditFullResponse,
    AuditLineItemFull,
    AuditListResponse,
)
from app.services.inventory_calculator import calculate_expected_inventory
from app.services.threshold_service import get_threshold_with_source

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/audits", tags=["Audits"])


# =============================================================================
# AUDITOR ENDPOINTS (Limited View - BLIND AUDIT)
# =============================================================================

@router.post("/start", response_model=AuditForAuditor)
def start_audit(
    request: AuditStartRequest,
    db: Session = Depends(get_db)
):
    """
    Start a new audit for a contractor.

    The auditor sees materials to count but NOT expected values!
    This ensures a blind audit where counts aren't influenced by expectations.
    """
    # Validate contractor exists
    contractor = db.query(Contractor).filter(Contractor.id == request.contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail=f"Contractor with id {request.contractor_id} not found")

    # Check no IN_PROGRESS audit exists for this contractor
    existing_audit = db.query(Audit).filter(
        Audit.contractor_id == request.contractor_id,
        Audit.status == Audit.STATUS_IN_PROGRESS
    ).first()

    if existing_audit:
        raise HTTPException(
            status_code=400,
            detail=f"Contractor already has an audit in progress: {existing_audit.audit_number}"
        )

    # Generate audit number and create audit
    audit_number = Audit.generate_audit_number(db)
    audit = Audit(
        audit_number=audit_number,
        contractor_id=request.contractor_id,
        audit_date=date.today(),
        auditor_name=request.auditor_name,
        audit_type=request.audit_type,
        status=Audit.STATUS_IN_PROGRESS,
        notes=request.notes,
    )
    db.add(audit)
    db.flush()

    logger.info(f"Started audit {audit_number} for contractor {contractor.name}")

    # Get all materials contractor currently has (quantity > 0)
    inventory_items = db.query(ContractorInventory).filter(
        ContractorInventory.contractor_id == request.contractor_id,
        ContractorInventory.quantity > 0
    ).all()

    if not inventory_items:
        raise HTTPException(
            status_code=400,
            detail="Contractor has no materials in inventory to audit"
        )

    # Create audit line items for each material
    materials_for_auditor = []
    for inv_item in inventory_items:
        material = db.query(Material).filter(Material.id == inv_item.material_id).first()
        if not material:
            continue

        line_item = AuditLineItem(
            audit_id=audit.id,
            material_id=inv_item.material_id,
            unit_of_measure=material.unit,
            physical_count=None,  # Auditor will fill this
            # All variance fields are NULL - calculated after submission
        )
        db.add(line_item)
        db.flush()

        materials_for_auditor.append(AuditMaterialForAuditor(
            id=line_item.id,
            material_id=material.id,
            material_name=material.name,
            material_code=material.code,
            unit_of_measure=material.unit,
        ))

    db.commit()

    logger.info(f"Created {len(materials_for_auditor)} line items for audit {audit_number}")

    return AuditForAuditor(
        id=audit.id,
        audit_number=audit.audit_number,
        contractor_name=contractor.name,
        audit_date=audit.audit_date,
        status=audit.status,
        materials=materials_for_auditor,
    )


@router.get("/{audit_id}/auditor-view", response_model=AuditForAuditor)
def get_audit_for_auditor(
    audit_id: int,
    db: Session = Depends(get_db)
):
    """
    Get audit for auditor to enter counts.

    Shows materials and any counts already entered.
    NO expected values shown - this is a BLIND audit!
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != Audit.STATUS_IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail=f"Audit is not in progress (status: {audit.status})"
        )

    contractor = db.query(Contractor).filter(Contractor.id == audit.contractor_id).first()

    # Get line items with material info
    line_items = db.query(AuditLineItem).filter(
        AuditLineItem.audit_id == audit_id
    ).all()

    materials_for_auditor = []
    for item in line_items:
        material = db.query(Material).filter(Material.id == item.material_id).first()
        if material:
            materials_for_auditor.append(AuditMaterialForAuditor(
                id=item.id,
                material_id=material.id,
                material_name=material.name,
                material_code=material.code,
                unit_of_measure=item.unit_of_measure,
            ))

    return AuditForAuditor(
        id=audit.id,
        audit_number=audit.audit_number,
        contractor_name=contractor.name if contractor else "Unknown",
        audit_date=audit.audit_date,
        status=audit.status,
        materials=materials_for_auditor,
    )


@router.put("/{audit_id}/enter-counts", response_model=AuditForAuditor)
def enter_counts(
    audit_id: int,
    counts: List[PhysicalCountEntry],
    db: Session = Depends(get_db)
):
    """
    Auditor enters physical counts (can be partial).

    Does NOT calculate variances - that happens after submission.
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != Audit.STATUS_IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot enter counts - audit is not in progress (status: {audit.status})"
        )

    # Update each count
    for count_entry in counts:
        line_item = db.query(AuditLineItem).filter(
            AuditLineItem.id == count_entry.line_item_id,
            AuditLineItem.audit_id == audit_id  # Validate belongs to this audit
        ).first()

        if not line_item:
            raise HTTPException(
                status_code=404,
                detail=f"Line item {count_entry.line_item_id} not found in this audit"
            )

        line_item.physical_count = count_entry.physical_count
        line_item.auditor_notes = count_entry.auditor_notes

    db.commit()

    logger.info(f"Updated {len(counts)} counts for audit {audit.audit_number}")

    # Return updated auditor view
    return get_audit_for_auditor(audit_id, db)


@router.post("/{audit_id}/submit")
def submit_audit(
    audit_id: int,
    request: AuditSubmitRequest,
    db: Session = Depends(get_db)
):
    """
    Auditor submits completed audit.

    All line items must have physical_count entered.
    Variances are NOT calculated here - manager does that.
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != Audit.STATUS_IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit - audit is not in progress (status: {audit.status})"
        )

    # First, apply any final counts from the request
    for count_entry in request.counts:
        line_item = db.query(AuditLineItem).filter(
            AuditLineItem.id == count_entry.line_item_id,
            AuditLineItem.audit_id == audit_id
        ).first()

        if not line_item:
            raise HTTPException(
                status_code=404,
                detail=f"Line item {count_entry.line_item_id} not found in this audit"
            )

        line_item.physical_count = count_entry.physical_count
        line_item.auditor_notes = count_entry.auditor_notes

    # Validate ALL line items have physical_count
    line_items = db.query(AuditLineItem).filter(
        AuditLineItem.audit_id == audit_id
    ).all()

    missing_counts = [
        item.id for item in line_items if item.physical_count is None
    ]

    if missing_counts:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit - {len(missing_counts)} items are missing physical counts"
        )

    # Update audit status
    audit.status = Audit.STATUS_SUBMITTED
    audit.submitted_at = datetime.utcnow()
    if request.final_notes:
        if audit.notes:
            audit.notes = f"{audit.notes}\n\nFinal notes: {request.final_notes}"
        else:
            audit.notes = f"Final notes: {request.final_notes}"

    db.commit()

    logger.info(f"Audit {audit.audit_number} submitted by {audit.auditor_name}")

    return {
        "message": "Audit submitted successfully",
        "audit_number": audit.audit_number,
        "submitted_at": audit.submitted_at.isoformat()
    }


# =============================================================================
# MANAGER ENDPOINTS (Full View with Variance Analysis)
# =============================================================================

@router.post("/{audit_id}/analyze", response_model=AuditFullResponse)
def analyze_audit(
    audit_id: int,
    db: Session = Depends(get_db)
):
    """
    Calculate variances after auditor submits.

    This is where the magic happens - expected values are calculated
    and compared to physical counts to find anomalies.

    Only OVERCONSUMPTION (physical < expected) triggers anomalies.
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != Audit.STATUS_SUBMITTED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot analyze - audit status is {audit.status}, expected SUBMITTED"
        )

    contractor = db.query(Contractor).filter(Contractor.id == audit.contractor_id).first()

    # Get all line items
    line_items = db.query(AuditLineItem).filter(
        AuditLineItem.audit_id == audit_id
    ).all()

    anomaly_count = 0
    line_items_full = []

    for item in line_items:
        material = db.query(Material).filter(Material.id == item.material_id).first()
        if not material:
            continue

        # Calculate expected inventory
        try:
            expected = calculate_expected_inventory(
                contractor_id=audit.contractor_id,
                material_id=item.material_id,
                as_of_date=audit.audit_date,
                db=db
            )
        except Exception as e:
            logger.error(f"Error calculating expected for material {item.material_id}: {e}")
            expected = Decimal("0")

        # Get threshold
        threshold_result = get_threshold_with_source(
            contractor_id=audit.contractor_id,
            material_id=item.material_id,
            db=db
        )
        threshold = threshold_result["threshold_percentage"]

        # Calculate variance
        physical = Decimal(str(item.physical_count)) if item.physical_count else Decimal("0")
        variance = physical - expected

        # Calculate variance percentage
        if expected != 0:
            variance_pct = (variance / expected) * Decimal("100")
        else:
            variance_pct = Decimal("0") if physical == 0 else Decimal("100")

        # Determine if anomaly (ONLY OVERCONSUMPTION)
        # variance < 0 means physical < expected = material missing = overconsumption
        is_anomaly = (variance < 0) and (abs(variance_pct) > threshold)

        # Update line item with calculated values
        item.expected_quantity = expected
        item.variance = variance
        item.variance_percentage = variance_pct
        item.threshold_used = threshold
        item.is_anomaly = is_anomaly

        anomaly_id = None

        # Create anomaly record if needed
        if is_anomaly:
            anomaly = Anomaly(
                contractor_id=audit.contractor_id,
                material_id=item.material_id,
                production_record_id=None,
                expected_quantity=float(expected),
                actual_quantity=float(physical),
                variance=float(variance),
                variance_percent=float(variance_pct),
                anomaly_type="audit_shortage",
                notes=f"Detected during audit {audit.audit_number}. Threshold: {threshold}%",
                resolved=False,
            )
            db.add(anomaly)
            db.flush()

            item.anomaly_id = anomaly.id
            anomaly_id = anomaly.id
            anomaly_count += 1

            logger.warning(
                f"Anomaly detected in audit {audit.audit_number}: "
                f"material={material.code}, expected={expected}, physical={physical}, "
                f"variance={variance_pct:.2f}%, threshold={threshold}%"
            )

        # Build full line item response
        line_items_full.append(AuditLineItemFull(
            id=item.id,
            material_id=item.material_id,
            material_name=material.name,
            material_code=material.code,
            unit_of_measure=item.unit_of_measure,
            physical_count=physical,
            auditor_notes=item.auditor_notes,
            expected_quantity=expected,
            variance=variance,
            variance_percentage=variance_pct,
            threshold_used=threshold,
            is_anomaly=is_anomaly,
            anomaly_id=anomaly_id,
        ))

    # Update audit status
    audit.status = Audit.STATUS_ANALYZED
    audit.analyzed_at = datetime.utcnow()

    db.commit()

    logger.info(
        f"Audit {audit.audit_number} analyzed: "
        f"{len(line_items)} items, {anomaly_count} anomalies"
    )

    return AuditFullResponse(
        id=audit.id,
        audit_number=audit.audit_number,
        contractor_id=audit.contractor_id,
        contractor_name=contractor.name if contractor else "Unknown",
        audit_date=audit.audit_date,
        auditor_name=audit.auditor_name,
        audit_type=audit.audit_type,
        status=audit.status,
        submitted_at=audit.submitted_at,
        analyzed_at=audit.analyzed_at,
        line_items=line_items_full,
        total_anomalies=anomaly_count,
        notes=audit.notes,
        created_at=audit.created_at,
    )


@router.get("", response_model=AuditListResponse)
def list_audits(
    contractor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    audit_type: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    has_anomalies: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List all audits (manager view).

    Supports filtering by contractor, status, type, date range, and anomalies.
    """
    query = db.query(Audit)

    if contractor_id:
        query = query.filter(Audit.contractor_id == contractor_id)
    if status:
        query = query.filter(Audit.status == status.upper())
    if audit_type:
        query = query.filter(Audit.audit_type == audit_type.upper())
    if date_from:
        query = query.filter(Audit.audit_date >= date_from)
    if date_to:
        query = query.filter(Audit.audit_date <= date_to)

    # Count total before pagination
    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    audits = query.order_by(Audit.audit_date.desc()).offset(offset).limit(page_size).all()

    # Build response
    items = []
    for audit in audits:
        contractor = db.query(Contractor).filter(Contractor.id == audit.contractor_id).first()

        # Count anomalies for this audit
        anomaly_count = db.query(AuditLineItem).filter(
            AuditLineItem.audit_id == audit.id,
            AuditLineItem.is_anomaly == True
        ).count()

        # Filter by has_anomalies if specified
        if has_anomalies is not None:
            if has_anomalies and anomaly_count == 0:
                continue
            if not has_anomalies and anomaly_count > 0:
                continue

        items.append(AuditFullResponse(
            id=audit.id,
            audit_number=audit.audit_number,
            contractor_id=audit.contractor_id,
            contractor_name=contractor.name if contractor else "Unknown",
            audit_date=audit.audit_date,
            auditor_name=audit.auditor_name,
            audit_type=audit.audit_type,
            status=audit.status,
            submitted_at=audit.submitted_at,
            analyzed_at=audit.analyzed_at,
            line_items=[],  # Don't include line items in list view
            total_anomalies=anomaly_count,
            notes=audit.notes,
            created_at=audit.created_at,
        ))

    return AuditListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/pending-analysis", response_model=List[AuditFullResponse])
def get_pending_analysis_audits(
    db: Session = Depends(get_db)
):
    """
    Get audits awaiting analysis (status = SUBMITTED).
    """
    audits = db.query(Audit).filter(
        Audit.status == Audit.STATUS_SUBMITTED
    ).order_by(Audit.submitted_at.asc()).all()

    items = []
    for audit in audits:
        contractor = db.query(Contractor).filter(Contractor.id == audit.contractor_id).first()

        items.append(AuditFullResponse(
            id=audit.id,
            audit_number=audit.audit_number,
            contractor_id=audit.contractor_id,
            contractor_name=contractor.name if contractor else "Unknown",
            audit_date=audit.audit_date,
            auditor_name=audit.auditor_name,
            audit_type=audit.audit_type,
            status=audit.status,
            submitted_at=audit.submitted_at,
            analyzed_at=audit.analyzed_at,
            line_items=[],
            total_anomalies=0,
            notes=audit.notes,
            created_at=audit.created_at,
        ))

    return items


@router.get("/{audit_id}", response_model=AuditFullResponse)
def get_audit(
    audit_id: int,
    db: Session = Depends(get_db)
):
    """
    Get full audit details (manager view).

    Cannot view if still IN_PROGRESS.
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status == Audit.STATUS_IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail="Cannot view audit details while in progress. Use /auditor-view endpoint."
        )

    contractor = db.query(Contractor).filter(Contractor.id == audit.contractor_id).first()

    # Get line items with full details
    line_items = db.query(AuditLineItem).filter(
        AuditLineItem.audit_id == audit_id
    ).all()

    line_items_full = []
    anomaly_count = 0

    for item in line_items:
        material = db.query(Material).filter(Material.id == item.material_id).first()
        if not material:
            continue

        if item.is_anomaly:
            anomaly_count += 1

        line_items_full.append(AuditLineItemFull(
            id=item.id,
            material_id=item.material_id,
            material_name=material.name,
            material_code=material.code,
            unit_of_measure=item.unit_of_measure,
            physical_count=Decimal(str(item.physical_count)) if item.physical_count else None,
            auditor_notes=item.auditor_notes,
            expected_quantity=Decimal(str(item.expected_quantity)) if item.expected_quantity else None,
            variance=Decimal(str(item.variance)) if item.variance else None,
            variance_percentage=Decimal(str(item.variance_percentage)) if item.variance_percentage else None,
            threshold_used=Decimal(str(item.threshold_used)) if item.threshold_used else None,
            is_anomaly=item.is_anomaly,
            anomaly_id=item.anomaly_id,
        ))

    return AuditFullResponse(
        id=audit.id,
        audit_number=audit.audit_number,
        contractor_id=audit.contractor_id,
        contractor_name=contractor.name if contractor else "Unknown",
        audit_date=audit.audit_date,
        auditor_name=audit.auditor_name,
        audit_type=audit.audit_type,
        status=audit.status,
        submitted_at=audit.submitted_at,
        analyzed_at=audit.analyzed_at,
        line_items=line_items_full,
        total_anomalies=anomaly_count,
        notes=audit.notes,
        created_at=audit.created_at,
    )


@router.post("/{audit_id}/accept-counts")
def accept_counts(
    audit_id: int,
    db: Session = Depends(get_db)
):
    """
    Adjust inventory to match physical counts.

    Creates InventoryAdjustment records and updates contractor inventory.
    Marks related anomalies as resolved.
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != Audit.STATUS_ANALYZED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot accept counts - audit status is {audit.status}, expected ANALYZED"
        )

    line_items = db.query(AuditLineItem).filter(
        AuditLineItem.audit_id == audit_id
    ).all()

    adjustments_made = []

    for item in line_items:
        # Get current contractor inventory
        inventory = db.query(ContractorInventory).filter(
            ContractorInventory.contractor_id == audit.contractor_id,
            ContractorInventory.material_id == item.material_id
        ).first()

        if not inventory:
            continue

        current_qty = Decimal(str(inventory.quantity))
        physical_qty = Decimal(str(item.physical_count)) if item.physical_count else Decimal("0")

        # Skip if no adjustment needed
        if current_qty == physical_qty:
            continue

        adjustment_qty = physical_qty - current_qty
        material = db.query(Material).filter(Material.id == item.material_id).first()

        # Create adjustment record
        adjustment = InventoryAdjustment(
            adjustment_number=InventoryAdjustment.generate_adjustment_number(db),
            contractor_id=audit.contractor_id,
            material_id=item.material_id,
            audit_line_item_id=item.id,
            adjustment_type=InventoryAdjustment.TYPE_AUDIT_CORRECTION,
            quantity_before=current_qty,
            quantity_after=physical_qty,
            adjustment_quantity=adjustment_qty,
            unit_of_measure=item.unit_of_measure,
            adjustment_date=date.today(),
            reason=f"Audit correction from {audit.audit_number}",
            requested_by="SYSTEM",
            status=InventoryAdjustment.STATUS_APPROVED,
            approved_by="SYSTEM",
            approved_at=datetime.utcnow(),
        )
        db.add(adjustment)

        # Update contractor inventory
        inventory.quantity = float(physical_qty)

        adjustments_made.append({
            "material_code": material.code if material else "Unknown",
            "material_name": material.name if material else "Unknown",
            "before": float(current_qty),
            "after": float(physical_qty),
            "adjustment": float(adjustment_qty),
        })

        logger.info(
            f"Adjusted inventory for contractor={audit.contractor_id}, "
            f"material={item.material_id}: {current_qty} -> {physical_qty}"
        )

    # Mark related anomalies as resolved
    for item in line_items:
        if item.anomaly_id:
            anomaly = db.query(Anomaly).filter(Anomaly.id == item.anomaly_id).first()
            if anomaly:
                anomaly.resolved = True
                anomaly.resolved_at = datetime.utcnow()

    db.commit()

    return {
        "message": f"Inventory adjusted for {len(adjustments_made)} materials",
        "audit_number": audit.audit_number,
        "adjustments": adjustments_made,
    }


@router.post("/{audit_id}/keep-system-values")
def keep_system_values(
    audit_id: int,
    investigation_notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Keep current inventory values, mark anomalies for investigation.

    Use this when the physical count seems wrong or needs verification.
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != Audit.STATUS_ANALYZED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot keep system values - audit status is {audit.status}, expected ANALYZED"
        )

    # Get anomalies from line items
    line_items = db.query(AuditLineItem).filter(
        AuditLineItem.audit_id == audit_id,
        AuditLineItem.is_anomaly == True
    ).all()

    investigation_count = 0
    for item in line_items:
        if item.anomaly_id:
            anomaly = db.query(Anomaly).filter(Anomaly.id == item.anomaly_id).first()
            if anomaly:
                if investigation_notes:
                    anomaly.notes = f"{anomaly.notes}\n\nInvestigation: {investigation_notes}"
                investigation_count += 1

    # Add note to audit
    investigation_note = f"System values retained for investigation. {investigation_count} anomalies under review."
    if investigation_notes:
        investigation_note += f" Notes: {investigation_notes}"

    if audit.notes:
        audit.notes = f"{audit.notes}\n\n{investigation_note}"
    else:
        audit.notes = investigation_note

    db.commit()

    return {
        "message": f"System values retained. {investigation_count} anomalies marked for investigation.",
        "audit_number": audit.audit_number,
    }


@router.put("/{audit_id}/close")
def close_audit(
    audit_id: int,
    db: Session = Depends(get_db)
):
    """
    Close audit after resolution.

    The audit must be in ANALYZED status.
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if audit.status != Audit.STATUS_ANALYZED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot close - audit status is {audit.status}, expected ANALYZED"
        )

    audit.status = Audit.STATUS_CLOSED
    db.commit()

    logger.info(f"Audit {audit.audit_number} closed")

    return {
        "message": "Audit closed successfully",
        "audit_number": audit.audit_number,
        "status": audit.status,
    }
