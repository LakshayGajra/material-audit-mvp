from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator, EmailStr


class SupplierCreate(BaseModel):
    """Schema for creating a new supplier."""
    code: str = Field(..., min_length=1, max_length=50, description="Unique supplier code")
    name: str = Field(..., min_length=1, max_length=255, description="Supplier name")
    contact_person: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    payment_terms: Optional[str] = Field(None, max_length=100, description="e.g., Net 30")

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

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            v = v.strip().lower()
            if '@' not in v:
                raise ValueError('Invalid email format')
        return v if v else None


class SupplierUpdate(BaseModel):
    """Schema for updating a supplier. All fields optional."""
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    payment_terms: Optional[str] = Field(None, max_length=100)
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

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            v = v.strip().lower()
            if '@' not in v:
                raise ValueError('Invalid email format')
        return v if v else None


class SupplierResponse(BaseModel):
    """Schema for supplier response."""
    id: int
    code: str
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    payment_terms: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupplierListResponse(BaseModel):
    """Schema for listing suppliers with summary info."""
    id: int
    code: str
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    is_active: bool
    purchase_order_count: int = 0

    class Config:
        from_attributes = True
