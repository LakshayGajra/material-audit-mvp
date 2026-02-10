from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator


class StockTransferLineCreate(BaseModel):
    """Schema for creating a stock transfer line."""
    material_id: Optional[int] = None
    finished_good_id: Optional[int] = None
    quantity: Decimal = Field(..., gt=0)
    unit_of_measure: Optional[str] = None

    @field_validator('quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class StockTransferLineResponse(BaseModel):
    """Schema for stock transfer line response."""
    id: int
    transfer_id: int
    material_id: Optional[int]
    material_code: Optional[str] = None
    material_name: Optional[str] = None
    finished_good_id: Optional[int]
    finished_good_code: Optional[str] = None
    finished_good_name: Optional[str] = None
    quantity: Decimal
    unit_of_measure: Optional[str]

    class Config:
        from_attributes = True

    @field_validator('quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class StockTransferCreate(BaseModel):
    """Schema for creating a stock transfer."""
    source_warehouse_id: int
    destination_warehouse_id: int
    transfer_type: Literal['material', 'finished_good']
    transfer_date: date
    requested_by: Optional[str] = None
    notes: Optional[str] = None
    lines: List[StockTransferLineCreate]

    @field_validator('lines')
    @classmethod
    def validate_lines(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one line item is required')
        return v


class StockTransferResponse(BaseModel):
    """Schema for stock transfer response."""
    id: int
    transfer_number: str
    source_warehouse_id: int
    source_warehouse_name: str
    source_warehouse_code: str
    source_owner_type: str
    destination_warehouse_id: int
    destination_warehouse_name: str
    destination_warehouse_code: str
    destination_owner_type: str
    transfer_type: str
    status: str
    transfer_date: date
    requested_by: Optional[str]
    approved_by: Optional[str]
    completed_by: Optional[str]
    completed_at: Optional[datetime]
    notes: Optional[str]
    lines: List[StockTransferLineResponse] = []
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class StockTransferListResponse(BaseModel):
    """Schema for listing stock transfers."""
    items: List[StockTransferResponse]
    total: int
    page: int
    page_size: int


class StockTransferComplete(BaseModel):
    """Schema for completing a stock transfer."""
    completed_by: str = Field(..., min_length=1)
