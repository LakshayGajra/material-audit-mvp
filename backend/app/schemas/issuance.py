from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class IssuanceRequest(BaseModel):
    """Schema for creating a material issuance."""
    warehouse_id: int
    contractor_id: int
    material_id: int
    quantity: Decimal = Field(..., gt=0, description="Quantity to issue (must be > 0)")
    unit_of_measure: str = Field(..., min_length=1, max_length=20)
    issued_date: date
    issued_by: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = None

    @field_validator('quantity', mode='before')
    @classmethod
    def convert_quantity_to_decimal(cls, v):
        if v is None:
            raise ValueError("Quantity is required")
        return Decimal(str(v))

    @field_validator('unit_of_measure')
    @classmethod
    def normalize_unit(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator('issued_by')
    @classmethod
    def validate_issued_by(cls, v: str) -> str:
        return v.strip()


class IssuanceResponse(BaseModel):
    """Schema for material issuance response."""
    id: int
    issuance_number: str
    warehouse_id: int
    warehouse_name: str
    contractor_id: int
    contractor_name: str
    material_id: int
    material_name: str
    material_code: str
    quantity: Decimal
    unit_of_measure: str
    quantity_in_base_unit: Decimal
    base_unit: str
    issued_date: date
    issued_by: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('quantity', 'quantity_in_base_unit', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class IssuanceHistoryQuery(BaseModel):
    """Schema for querying issuance history."""
    contractor_id: Optional[int] = None
    material_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None

    @field_validator('date_to')
    @classmethod
    def validate_date_range(cls, v, info):
        if v is not None and info.data.get('date_from') is not None:
            if v < info.data['date_from']:
                raise ValueError("date_to must be >= date_from")
        return v


class IssuanceListResponse(BaseModel):
    """Schema for listing issuances."""
    items: list[IssuanceResponse]
    total: int
    page: int = 1
    page_size: int = 50
