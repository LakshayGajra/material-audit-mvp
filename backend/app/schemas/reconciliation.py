from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from app.models.reconciliation import Reconciliation


# =============================================================================
# SUBMISSION SCHEMAS
# =============================================================================

class ReconciliationItemSubmit(BaseModel):
    """Single material item in a reconciliation submission."""
    material_id: int = Field(..., gt=0)
    reported_quantity: Decimal = Field(..., ge=0, description="Reported quantity (must be >= 0)")
    notes: Optional[str] = Field(None, max_length=500, description="Notes about this material")

    @field_validator("reported_quantity")
    @classmethod
    def validate_quantity(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("reported_quantity must be >= 0")
        return v


class ReconciliationSubmitRequest(BaseModel):
    """Request to submit a reconciliation report."""
    contractor_id: int = Field(..., gt=0)
    reconciliation_date: date = Field(..., description="Date of reconciliation")
    period_type: str = Field(..., description="Period type: WEEKLY, MONTHLY, AD_HOC")
    period_start: date = Field(..., description="Start of reporting period")
    period_end: date = Field(..., description="End of reporting period")
    reported_by: str = Field(..., min_length=1, max_length=100)
    items: List[ReconciliationItemSubmit] = Field(..., min_length=1, description="At least one item required")
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("period_type")
    @classmethod
    def validate_period_type(cls, v: str) -> str:
        v = v.upper().strip()
        if v not in Reconciliation.ALLOWED_PERIODS:
            raise ValueError(f"period_type must be one of: {', '.join(Reconciliation.ALLOWED_PERIODS)}")
        return v

    @field_validator("period_end")
    @classmethod
    def validate_period_range(cls, v: date, info) -> date:
        period_start = info.data.get("period_start")
        if period_start and v < period_start:
            raise ValueError("period_end must be >= period_start")
        return v

    @field_validator("items")
    @classmethod
    def validate_items(cls, v: List[ReconciliationItemSubmit]) -> List[ReconciliationItemSubmit]:
        if not v:
            raise ValueError("At least one item is required")
        # Check for duplicate material_ids
        material_ids = [item.material_id for item in v]
        if len(material_ids) != len(set(material_ids)):
            raise ValueError("Duplicate material_ids found in items")
        return v


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class ReconciliationLineResponse(BaseModel):
    """Response schema for a reconciliation line item."""
    id: int
    material_id: int
    material_name: str
    material_code: str
    unit_of_measure: str
    reported_quantity: Decimal
    contractor_notes: Optional[str] = None
    system_quantity: Optional[Decimal] = None
    variance: Optional[Decimal] = None
    variance_percentage: Optional[Decimal] = None
    threshold_used: Optional[Decimal] = None
    is_anomaly: Optional[bool] = None
    anomaly_id: Optional[int] = None

    model_config = {"from_attributes": True}


class ReconciliationResponse(BaseModel):
    """Full reconciliation response."""
    id: int
    reconciliation_number: str
    contractor_id: int
    contractor_name: str
    reconciliation_date: date
    period_type: str
    period_start: date
    period_end: date
    reported_by: str
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    line_items: List[ReconciliationLineResponse] = Field(default_factory=list)
    total_anomalies: int = 0
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReconciliationListResponse(BaseModel):
    """Paginated list of reconciliations."""
    items: List[ReconciliationResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# REVIEW SCHEMAS
# =============================================================================

class ReconciliationReviewRequest(BaseModel):
    """Request to review a reconciliation."""
    status: str = Field(..., description="Review status: ACCEPTED or DISPUTED")
    reviewed_by: str = Field(..., min_length=1, max_length=100)
    adjust_inventory: bool = Field(False, description="If True, adjust inventory to reported quantities")
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v = v.upper().strip()
        allowed = [Reconciliation.STATUS_ACCEPTED, Reconciliation.STATUS_DISPUTED]
        if v not in allowed:
            raise ValueError(f"status must be one of: {', '.join(allowed)}")
        return v


# =============================================================================
# QUERY SCHEMAS
# =============================================================================

class ReconciliationListQuery(BaseModel):
    """Query parameters for listing reconciliations."""
    contractor_id: Optional[int] = None
    status: Optional[str] = None
    has_anomalies: Optional[bool] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.upper().strip()
        if v not in Reconciliation.ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(Reconciliation.ALLOWED_STATUSES)}")
        return v
