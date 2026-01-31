from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal

from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Create Schemas
# ============================================================================

class InventoryCheckCreate(BaseModel):
    """Schema for creating an inventory check."""
    contractor_id: int
    check_type: Literal['audit', 'self_report']
    is_blind: bool = True
    check_date: date
    initiated_by: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


# ============================================================================
# Count Entry Schemas
# ============================================================================

class CountEntry(BaseModel):
    """Schema for entering a count for a single line."""
    line_id: int
    actual_quantity: Decimal = Field(..., ge=0)

    @field_validator('actual_quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class EnterCountsRequest(BaseModel):
    """Schema for entering counts."""
    counted_by: str = Field(..., min_length=1, max_length=100)
    counts: list[CountEntry]

    @field_validator('counted_by')
    @classmethod
    def validate_counted_by(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Counted by cannot be empty")
        return v.strip()


# ============================================================================
# Resolution Schemas
# ============================================================================

class LineResolution(BaseModel):
    """Schema for resolving a single line."""
    line_id: int
    resolution: Literal['accept', 'keep_system', 'investigate']
    resolution_notes: Optional[str] = None


class ResolveRequest(BaseModel):
    """Schema for resolving variances."""
    reviewed_by: str = Field(..., min_length=1, max_length=100)
    resolutions: list[LineResolution]

    @field_validator('reviewed_by')
    @classmethod
    def validate_reviewed_by(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Reviewed by cannot be empty")
        return v.strip()


# ============================================================================
# Response Schemas
# ============================================================================

class InventoryCheckLineResponse(BaseModel):
    """Schema for inventory check line response."""
    id: int
    check_id: int
    material_id: int
    material_code: str
    material_name: str
    material_unit: str
    expected_quantity: Decimal
    actual_quantity: Optional[Decimal]
    variance: Optional[Decimal]
    variance_percent: Optional[Decimal]
    resolution: Optional[str]
    adjustment_quantity: Optional[Decimal]
    resolution_notes: Optional[str]

    class Config:
        from_attributes = True

    @field_validator('expected_quantity', 'actual_quantity', 'variance', 'variance_percent', 'adjustment_quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))


class InventoryCheckResponse(BaseModel):
    """Schema for inventory check response."""
    id: int
    check_number: str
    contractor_id: int
    contractor_name: str
    contractor_code: str
    check_type: str
    is_blind: bool
    status: str
    initiated_by: Optional[str]
    counted_by: Optional[str]
    reviewed_by: Optional[str]
    check_date: date
    submitted_at: Optional[datetime]
    resolved_at: Optional[datetime]
    notes: Optional[str]
    lines: list[InventoryCheckLineResponse]
    created_at: datetime
    updated_at: Optional[datetime]

    # Summary fields
    total_lines: int
    lines_with_variance: int
    total_variance_value: Decimal

    class Config:
        from_attributes = True


class InventoryCheckListResponse(BaseModel):
    """Schema for listing inventory checks (without full line details)."""
    id: int
    check_number: str
    contractor_name: str
    contractor_code: str
    check_type: str
    status: str
    check_date: date
    initiated_by: Optional[str]
    counted_by: Optional[str]
    total_lines: int
    lines_with_variance: int
    created_at: datetime

    class Config:
        from_attributes = True
