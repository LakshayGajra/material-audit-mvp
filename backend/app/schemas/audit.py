from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from app.models.audit import Audit
from app.models.variance_threshold import VarianceThreshold


# =============================================================================
# FOR AUDITOR (Limited View - NO expected values)
# =============================================================================

class AuditStartRequest(BaseModel):
    """Request to start a new audit."""
    contractor_id: int = Field(..., gt=0, description="Contractor to audit")
    auditor_name: str = Field(..., min_length=1, max_length=100, description="Name of the auditor")
    audit_type: str = Field(..., description="Type of audit: SCHEDULED, SURPRISE, FOLLOW_UP")
    notes: Optional[str] = Field(None, description="Initial audit notes")

    @field_validator("audit_type")
    @classmethod
    def validate_audit_type(cls, v: str) -> str:
        v = v.upper().strip()
        if v not in Audit.ALLOWED_TYPES:
            raise ValueError(f"audit_type must be one of: {', '.join(Audit.ALLOWED_TYPES)}")
        return v

    @field_validator("auditor_name")
    @classmethod
    def validate_auditor_name(cls, v: str) -> str:
        return v.strip()


class AuditMaterialForAuditor(BaseModel):
    """
    Material info visible to auditor during audit.

    IMPORTANT: NO expected_quantity! NO variance! Auditor is BLIND!
    """
    id: int = Field(..., description="Line item ID")
    material_id: int
    material_name: str
    material_code: str
    unit_of_measure: str

    model_config = {"from_attributes": True}


class AuditForAuditor(BaseModel):
    """
    Audit view for the auditor - limited information.

    Does NOT include expected quantities or variances.
    """
    id: int
    audit_number: str
    contractor_name: str
    audit_date: date
    status: str
    materials: List[AuditMaterialForAuditor] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class PhysicalCountEntry(BaseModel):
    """Single material count entry from auditor."""
    line_item_id: int = Field(..., gt=0, description="Audit line item ID")
    physical_count: Decimal = Field(..., ge=0, description="Physical count (must be >= 0)")
    auditor_notes: Optional[str] = Field(None, max_length=1000, description="Notes about this item")

    @field_validator("physical_count")
    @classmethod
    def validate_physical_count(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("physical_count must be >= 0")
        return v


class AuditSubmitRequest(BaseModel):
    """Request to submit a completed audit."""
    counts: List[PhysicalCountEntry] = Field(..., min_length=1, description="Physical counts for each material")
    final_notes: Optional[str] = Field(None, max_length=2000, description="Final audit notes")

    @field_validator("counts")
    @classmethod
    def validate_counts_not_empty(cls, v: List[PhysicalCountEntry]) -> List[PhysicalCountEntry]:
        if not v:
            raise ValueError("counts cannot be empty")
        # Check for duplicate line_item_ids
        line_item_ids = [entry.line_item_id for entry in v]
        if len(line_item_ids) != len(set(line_item_ids)):
            raise ValueError("Duplicate line_item_ids found in counts")
        return v


# =============================================================================
# FOR MANAGER (Full View)
# =============================================================================

class AuditLineItemFull(BaseModel):
    """Full audit line item with variance data - for managers only."""
    id: int
    material_id: int
    material_name: str
    material_code: str
    unit_of_measure: str
    physical_count: Optional[Decimal] = None
    auditor_notes: Optional[str] = None
    expected_quantity: Optional[Decimal] = None
    variance: Optional[Decimal] = None
    variance_percentage: Optional[Decimal] = None
    threshold_used: Optional[Decimal] = None
    is_anomaly: Optional[bool] = None
    anomaly_id: Optional[int] = None

    model_config = {"from_attributes": True}


class AuditFullResponse(BaseModel):
    """Full audit response with all details - for managers."""
    id: int
    audit_number: str
    contractor_id: int
    contractor_name: str
    audit_date: date
    auditor_name: str
    audit_type: str
    status: str
    submitted_at: Optional[datetime] = None
    analyzed_at: Optional[datetime] = None
    line_items: List[AuditLineItemFull] = Field(default_factory=list)
    total_anomalies: int = 0
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AuditListResponse(BaseModel):
    """Paginated list of audits."""
    items: List[AuditFullResponse]
    total: int
    page: int
    page_size: int


class AuditListQuery(BaseModel):
    """Query parameters for listing audits."""
    contractor_id: Optional[int] = None
    status: Optional[str] = None
    audit_type: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    has_anomalies: Optional[bool] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.upper().strip()
        if v not in Audit.ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(Audit.ALLOWED_STATUSES)}")
        return v

    @field_validator("audit_type")
    @classmethod
    def validate_audit_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.upper().strip()
        if v not in Audit.ALLOWED_TYPES:
            raise ValueError(f"audit_type must be one of: {', '.join(Audit.ALLOWED_TYPES)}")
        return v


# =============================================================================
# FOR THRESHOLD MANAGEMENT
# =============================================================================

class ThresholdCreate(BaseModel):
    """Request to create or update a variance threshold."""
    contractor_id: Optional[int] = Field(None, description="Contractor ID (NULL for material default)")
    material_id: int = Field(..., gt=0, description="Material ID")
    threshold_percentage: Decimal = Field(..., gt=0, le=100, description="Threshold percentage (must be > 0)")
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("threshold_percentage")
    @classmethod
    def validate_threshold(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("threshold_percentage must be greater than 0")
        if v > 100:
            raise ValueError("threshold_percentage cannot exceed 100")
        return v

    @field_validator("contractor_id")
    @classmethod
    def validate_contractor_id(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("contractor_id must be greater than 0 if provided")
        return v


class ThresholdUpdate(BaseModel):
    """Request to update a variance threshold."""
    threshold_percentage: Optional[Decimal] = Field(None, gt=0, le=100)
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("threshold_percentage")
    @classmethod
    def validate_threshold(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v <= 0:
                raise ValueError("threshold_percentage must be greater than 0")
            if v > 100:
                raise ValueError("threshold_percentage cannot exceed 100")
        return v


class ThresholdResponse(BaseModel):
    """Variance threshold response."""
    id: int
    contractor_id: Optional[int] = None
    contractor_name: Optional[str] = None
    material_id: int
    material_name: str
    threshold_percentage: Decimal
    is_active: bool
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ThresholdListResponse(BaseModel):
    """List of thresholds."""
    items: List[ThresholdResponse]
    total: int


# =============================================================================
# FOR INVENTORY ADJUSTMENT
# =============================================================================

class AdjustmentRequest(BaseModel):
    """Request to create an inventory adjustment."""
    contractor_id: int = Field(..., gt=0)
    material_id: int = Field(..., gt=0)
    audit_line_item_id: Optional[int] = Field(None, description="Link to audit line item if from audit")
    adjustment_type: str = Field(..., description="Type: AUDIT_CORRECTION, WRITE_OFF, FOUND, TRANSFER_CORRECTION, OTHER")
    new_quantity: Decimal = Field(..., ge=0, description="New inventory quantity after adjustment")
    reason: str = Field(..., min_length=10, max_length=1000, description="Reason for adjustment")
    requested_by: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("adjustment_type")
    @classmethod
    def validate_adjustment_type(cls, v: str) -> str:
        from app.models.inventory_adjustment import InventoryAdjustment
        v = v.upper().strip()
        if v not in InventoryAdjustment.ALLOWED_TYPES:
            raise ValueError(f"adjustment_type must be one of: {', '.join(InventoryAdjustment.ALLOWED_TYPES)}")
        return v


class AdjustmentApprovalRequest(BaseModel):
    """Request to approve or reject an adjustment."""
    approved: bool = Field(..., description="True to approve, False to reject")
    approved_by: str = Field(..., min_length=1, max_length=100)
    rejection_reason: Optional[str] = Field(None, max_length=500, description="Required if rejecting")

    @field_validator("rejection_reason")
    @classmethod
    def validate_rejection_reason(cls, v: Optional[str], info) -> Optional[str]:
        # Note: In Pydantic v2, we access other values through info.data
        approved = info.data.get("approved", True)
        if not approved and not v:
            raise ValueError("rejection_reason is required when rejecting an adjustment")
        return v


class AdjustmentResponse(BaseModel):
    """Inventory adjustment response."""
    id: int
    adjustment_number: str
    contractor_id: int
    contractor_name: Optional[str] = None
    material_id: int
    material_name: Optional[str] = None
    audit_line_item_id: Optional[int] = None
    adjustment_type: str
    quantity_before: Decimal
    quantity_after: Decimal
    adjustment_quantity: Decimal
    unit_of_measure: str
    adjustment_date: date
    reason: str
    requested_by: str
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AdjustmentListResponse(BaseModel):
    """List of adjustments."""
    items: List[AdjustmentResponse]
    total: int
    page: int
    page_size: int
