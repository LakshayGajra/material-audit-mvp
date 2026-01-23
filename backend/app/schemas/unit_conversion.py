from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class UnitConversionCreate(BaseModel):
    """Schema for creating a unit conversion."""
    material_id: int
    from_unit: str = Field(..., min_length=1, max_length=20)
    to_unit: str = Field(..., min_length=1, max_length=20)
    conversion_factor: Decimal = Field(..., gt=0, description="Must be greater than 0")

    @field_validator('from_unit', 'to_unit')
    @classmethod
    def normalize_unit(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator('conversion_factor', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            raise ValueError("Conversion factor is required")
        return Decimal(str(v))


class UnitConversionUpdate(BaseModel):
    """Schema for updating a unit conversion."""
    conversion_factor: Decimal = Field(..., gt=0)
    is_active: Optional[bool] = None

    @field_validator('conversion_factor', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))


class UnitConversionResponse(BaseModel):
    """Schema for unit conversion response."""
    id: int
    material_id: int
    material_code: str
    material_name: str
    from_unit: str
    to_unit: str
    conversion_factor: Decimal
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('conversion_factor', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(1)
        return Decimal(str(v))


class ConvertQuantityRequest(BaseModel):
    """Schema for quantity conversion request."""
    material_id: int
    quantity: Decimal = Field(..., ge=0)
    from_unit: str = Field(..., min_length=1, max_length=20)
    to_unit: str = Field(..., min_length=1, max_length=20)

    @field_validator('quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        return Decimal(str(v))

    @field_validator('from_unit', 'to_unit')
    @classmethod
    def normalize_unit(cls, v: str) -> str:
        return v.strip().lower()


class ConvertQuantityResponse(BaseModel):
    """Schema for quantity conversion response."""
    original_quantity: Decimal
    from_unit: str
    converted_quantity: Decimal
    to_unit: str
    conversion_factor_used: Decimal

    @field_validator('original_quantity', 'converted_quantity', 'conversion_factor_used', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        return Decimal(str(v))
