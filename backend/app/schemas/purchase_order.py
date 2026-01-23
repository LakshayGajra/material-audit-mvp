from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# Valid PO statuses
PO_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]
PO_LINE_STATUSES = ["PENDING", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]


class POLineCreate(BaseModel):
    """Schema for creating a purchase order line item."""
    material_id: int
    quantity_ordered: Decimal = Field(..., gt=0, description="Quantity must be greater than 0")
    unit_of_measure: str = Field(..., min_length=1, max_length=20)
    unit_price: Optional[Decimal] = Field(None, ge=0)

    @field_validator('quantity_ordered', 'unit_price', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))

    @field_validator('unit_of_measure')
    @classmethod
    def normalize_unit(cls, v: str) -> str:
        return v.strip().lower()


class POLineUpdate(BaseModel):
    """Schema for updating a purchase order line item."""
    quantity_ordered: Optional[Decimal] = Field(None, gt=0)
    unit_of_measure: Optional[str] = Field(None, min_length=1, max_length=20)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    status: Optional[str] = None

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in PO_LINE_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(PO_LINE_STATUSES)}")
        return v


class POCreate(BaseModel):
    """Schema for creating a purchase order."""
    supplier_id: int
    warehouse_id: int
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    lines: list[POLineCreate] = Field(..., min_length=1)

    @field_validator('lines')
    @classmethod
    def validate_lines_not_empty(cls, v: list[POLineCreate]) -> list[POLineCreate]:
        if not v:
            raise ValueError("Purchase order must have at least one line item")
        return v

    @model_validator(mode='after')
    def validate_unique_materials(self):
        material_ids = [line.material_id for line in self.lines]
        if len(material_ids) != len(set(material_ids)):
            raise ValueError("Duplicate materials in purchase order lines are not allowed")
        return self


class POUpdate(BaseModel):
    """Schema for updating a purchase order."""
    supplier_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[str] = None

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in PO_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(PO_STATUSES)}")
        return v


class POLineResponse(BaseModel):
    """Schema for purchase order line response."""
    id: int
    material_id: int
    material_name: str
    material_code: str
    quantity_ordered: Decimal
    unit_of_measure: str
    unit_price: Optional[Decimal]
    quantity_received: Decimal
    remaining_quantity: Decimal
    status: str

    class Config:
        from_attributes = True

    @field_validator('quantity_ordered', 'quantity_received', 'remaining_quantity', 'unit_price', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))


class POResponse(BaseModel):
    """Schema for purchase order response."""
    id: int
    po_number: str
    supplier_id: int
    supplier_name: str
    warehouse_id: int
    warehouse_name: str
    order_date: date
    expected_delivery_date: Optional[date]
    status: str
    total_amount: Optional[Decimal]
    lines: list[POLineResponse]
    notes: Optional[str]
    created_by: Optional[str]
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('total_amount', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))


class POListResponse(BaseModel):
    """Schema for listing purchase orders (without lines for performance)."""
    id: int
    po_number: str
    supplier_name: str
    warehouse_name: str
    order_date: date
    expected_delivery_date: Optional[date]
    status: str
    total_amount: Optional[Decimal]
    line_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class POApproval(BaseModel):
    """Schema for approving a purchase order."""
    approved_by: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = None
