from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class AdjustmentRequest(BaseModel):
    """Request to create an inventory adjustment."""
    contractor_id: int = Field(..., gt=0)
    material_id: int = Field(..., gt=0)
    inventory_check_line_id: Optional[int] = Field(None, description="Link to inventory check line item")
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
    inventory_check_line_id: Optional[int] = None
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
