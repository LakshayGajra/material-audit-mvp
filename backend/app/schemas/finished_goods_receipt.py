from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ============================================================================
# FGR Line Schemas
# ============================================================================

class FGRLineCreate(BaseModel):
    """Schema for creating a finished goods receipt line item."""
    finished_good_id: int
    quantity_delivered: Decimal = Field(..., gt=0, description="Quantity must be greater than 0")
    unit_of_measure: Optional[str] = Field(None, max_length=20)

    @field_validator('quantity_delivered', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))


class FGRLineInspect(BaseModel):
    """Schema for inspecting a single line item."""
    line_id: int
    quantity_accepted: Decimal = Field(..., ge=0)
    quantity_rejected: Decimal = Field(default=Decimal(0), ge=0)
    rejection_reason: Optional[str] = None

    @field_validator('quantity_accepted', 'quantity_rejected', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class FGRLineResponse(BaseModel):
    """Schema for FGR line response."""
    id: int
    fgr_id: int
    finished_good_id: int
    finished_good_name: str
    finished_good_code: str
    quantity_delivered: Decimal
    quantity_accepted: Optional[Decimal]
    quantity_rejected: Decimal
    rejection_reason: Optional[str]
    unit_of_measure: Optional[str]
    bom_deducted: bool

    class Config:
        from_attributes = True

    @field_validator('quantity_delivered', 'quantity_accepted', 'quantity_rejected', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))


# ============================================================================
# FGR Header Schemas
# ============================================================================

class FGRCreate(BaseModel):
    """Schema for creating a finished goods receipt."""
    contractor_id: int
    warehouse_id: int
    receipt_date: date
    received_by: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    lines: list[FGRLineCreate] = Field(..., min_length=1)

    @field_validator('lines')
    @classmethod
    def validate_lines_not_empty(cls, v: list[FGRLineCreate]) -> list[FGRLineCreate]:
        if not v:
            raise ValueError("FGR must have at least one line item")
        return v

    @model_validator(mode='after')
    def validate_unique_finished_goods(self):
        fg_ids = [line.finished_good_id for line in self.lines]
        if len(fg_ids) != len(set(fg_ids)):
            raise ValueError("Duplicate finished goods in FGR are not allowed")
        return self


class FGRInspect(BaseModel):
    """Schema for submitting inspection results."""
    inspected_by: str = Field(..., min_length=1, max_length=100)
    inspection_notes: Optional[str] = None
    lines: list[FGRLineInspect] = Field(..., min_length=1)

    @field_validator('inspected_by')
    @classmethod
    def validate_inspected_by(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Inspected by cannot be empty")
        return v.strip()


class FGRResponse(BaseModel):
    """Schema for FGR response."""
    id: int
    fgr_number: str
    contractor_id: int
    contractor_name: str
    contractor_code: str
    warehouse_id: int
    warehouse_name: str
    receipt_date: date
    status: str
    received_by: Optional[str]
    inspected_by: Optional[str]
    inspection_date: Optional[date]
    inspection_notes: Optional[str]
    notes: Optional[str]
    lines: list[FGRLineResponse]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class FGRListResponse(BaseModel):
    """Schema for listing FGRs (without lines for performance)."""
    id: int
    fgr_number: str
    contractor_name: str
    contractor_code: str
    warehouse_name: str
    receipt_date: date
    status: str
    received_by: Optional[str]
    line_count: int
    total_quantity_delivered: Decimal
    total_quantity_accepted: Optional[Decimal]
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('total_quantity_delivered', 'total_quantity_accepted', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))


# ============================================================================
# Finished Goods Inventory Schemas
# ============================================================================

class FinishedGoodsInventoryResponse(BaseModel):
    """Schema for finished goods inventory response."""
    id: int
    finished_good_id: int
    finished_good_name: str
    finished_good_code: str
    warehouse_id: int
    warehouse_name: str
    current_quantity: Decimal
    unit_of_measure: Optional[str]
    last_receipt_date: Optional[date]

    class Config:
        from_attributes = True

    @field_validator('current_quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


# ============================================================================
# Pending Deliveries Schema
# ============================================================================

class PendingDeliveryResponse(BaseModel):
    """Schema for pending deliveries from a contractor."""
    contractor_id: int
    contractor_name: str
    finished_good_id: int
    finished_good_name: str
    finished_good_code: str
    total_produced: Decimal
    total_received: Decimal
    pending_quantity: Decimal

    @field_validator('total_produced', 'total_received', 'pending_quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))
