from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class WarehouseCreate(BaseModel):
    """Schema for creating a new warehouse."""
    code: str = Field(..., min_length=1, max_length=50, description="Unique warehouse code")
    name: str = Field(..., min_length=1, max_length=255, description="Warehouse name")
    location: Optional[str] = Field(None, max_length=255, description="Location/area")
    address: Optional[str] = Field(None, description="Full address")
    contact_person: Optional[str] = Field(None, max_length=100, description="Contact person name")
    phone: Optional[str] = Field(None, max_length=20, description="Contact phone number")

    @field_validator('code')
    @classmethod
    def code_must_be_uppercase(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Name cannot be empty or whitespace')
        return v.strip()


class WarehouseUpdate(BaseModel):
    """Schema for updating a warehouse. All fields optional."""
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None

    @field_validator('code')
    @classmethod
    def code_must_be_uppercase(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip().upper()
        return v

    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty or whitespace')
        return v.strip() if v else v


class WarehouseResponse(BaseModel):
    """Schema for warehouse response."""
    id: int
    code: str
    name: str
    location: Optional[str]
    address: Optional[str]
    contact_person: Optional[str]
    phone: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WarehouseInventoryResponse(BaseModel):
    """Schema for warehouse inventory with material details."""
    id: int
    warehouse_id: int
    warehouse_name: str
    material_id: int
    material_name: str
    material_code: str
    current_quantity: Decimal
    unit_of_measure: str
    reorder_point: Decimal
    reorder_quantity: Decimal
    is_below_reorder: bool
    last_updated: Optional[datetime]

    class Config:
        from_attributes = True

    @field_validator('current_quantity', 'reorder_point', 'reorder_quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class WarehouseInventoryCreate(BaseModel):
    """Schema for adding material to warehouse inventory."""
    warehouse_id: int
    material_id: int
    current_quantity: Decimal = Field(default=Decimal(0), ge=0)
    unit_of_measure: str = Field(..., min_length=1, max_length=20)
    reorder_point: Decimal = Field(default=Decimal(0), ge=0)
    reorder_quantity: Decimal = Field(default=Decimal(0), ge=0)

    @field_validator('current_quantity', 'reorder_point', 'reorder_quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class WarehouseInventoryUpdate(BaseModel):
    """Schema for updating warehouse inventory."""
    current_quantity: Optional[Decimal] = Field(None, ge=0)
    unit_of_measure: Optional[str] = Field(None, min_length=1, max_length=20)
    reorder_point: Optional[Decimal] = Field(None, ge=0)
    reorder_quantity: Optional[Decimal] = Field(None, ge=0)

    @field_validator('current_quantity', 'reorder_point', 'reorder_quantity', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        return Decimal(str(v))


class WarehouseListResponse(BaseModel):
    """Schema for listing warehouses with summary info."""
    id: int
    code: str
    name: str
    location: Optional[str]
    is_active: bool
    material_count: int = 0
    total_items_below_reorder: int = 0

    class Config:
        from_attributes = True
