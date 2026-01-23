from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class GRNLineCreate(BaseModel):
    """Schema for creating a goods receipt line item."""
    po_line_id: int
    quantity_received: Decimal = Field(..., gt=0, description="Quantity must be greater than 0")
    batch_number: Optional[str] = Field(None, max_length=100)
    remarks: Optional[str] = None

    @field_validator('quantity_received', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))

    @field_validator('batch_number')
    @classmethod
    def normalize_batch_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip() or None
        return v


class GRNCreate(BaseModel):
    """Schema for creating a goods receipt note."""
    purchase_order_id: int
    receipt_date: date
    received_by: str = Field(..., min_length=1, max_length=100)
    vehicle_number: Optional[str] = Field(None, max_length=50)
    supplier_challan_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    lines: list[GRNLineCreate] = Field(..., min_length=1)

    @field_validator('lines')
    @classmethod
    def validate_lines_not_empty(cls, v: list[GRNLineCreate]) -> list[GRNLineCreate]:
        if not v:
            raise ValueError("Goods receipt must have at least one line item")
        return v

    @field_validator('received_by')
    @classmethod
    def validate_received_by(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Received by cannot be empty")
        return v.strip()

    @model_validator(mode='after')
    def validate_unique_po_lines(self):
        po_line_ids = [line.po_line_id for line in self.lines]
        if len(po_line_ids) != len(set(po_line_ids)):
            raise ValueError("Duplicate PO lines in goods receipt are not allowed")
        return self


class GRNLineResponse(BaseModel):
    """Schema for goods receipt line response."""
    id: int
    po_line_id: int
    material_id: int
    material_name: str
    material_code: str
    quantity_received: Decimal
    unit_of_measure: str
    batch_number: Optional[str]
    remarks: Optional[str]

    class Config:
        from_attributes = True

    @field_validator('quantity_received', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class GRNResponse(BaseModel):
    """Schema for goods receipt note response."""
    id: int
    grn_number: str
    purchase_order_id: int
    po_number: str
    warehouse_id: int
    warehouse_name: str
    receipt_date: date
    received_by: str
    vehicle_number: Optional[str]
    supplier_challan_number: Optional[str]
    lines: list[GRNLineResponse]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class GRNListResponse(BaseModel):
    """Schema for listing goods receipts (without lines for performance)."""
    id: int
    grn_number: str
    po_number: str
    warehouse_name: str
    supplier_name: str
    receipt_date: date
    received_by: str
    line_count: int
    total_quantity_received: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('total_quantity_received', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class GRNSummary(BaseModel):
    """Summary of goods received for a PO line."""
    po_line_id: int
    material_id: int
    material_name: str
    quantity_ordered: Decimal
    quantity_received: Decimal
    quantity_pending: Decimal
    receipts: list[dict]  # List of {grn_number, quantity, date}

    @field_validator('quantity_ordered', 'quantity_received', 'quantity_pending', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))
