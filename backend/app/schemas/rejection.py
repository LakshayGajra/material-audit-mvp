from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class RejectionReportRequest(BaseModel):
    """Schema for reporting a material rejection."""
    contractor_id: int
    material_id: int
    quantity_rejected: Decimal = Field(..., gt=0, description="Quantity rejected (must be > 0)")
    unit_of_measure: str = Field(..., min_length=1, max_length=20)
    rejection_date: date
    rejection_reason: str = Field(..., min_length=10, description="Reason must be at least 10 characters")
    reported_by: str = Field(..., min_length=1, max_length=100)
    original_issuance_id: Optional[int] = None
    notes: Optional[str] = None

    @field_validator('quantity_rejected', mode='before')
    @classmethod
    def convert_quantity_to_decimal(cls, v):
        if v is None:
            raise ValueError("Quantity rejected is required")
        return Decimal(str(v))

    @field_validator('unit_of_measure')
    @classmethod
    def normalize_unit(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator('reported_by', 'rejection_reason')
    @classmethod
    def strip_strings(cls, v: str) -> str:
        return v.strip()


class RejectionApprovalRequest(BaseModel):
    """Schema for approving a material rejection."""
    approved_by: str = Field(..., min_length=1, max_length=100)
    return_warehouse_id: int
    notes: Optional[str] = None

    @field_validator('approved_by')
    @classmethod
    def strip_approved_by(cls, v: str) -> str:
        return v.strip()


class RejectionReceiveRequest(BaseModel):
    """Schema for receiving returned material at warehouse."""
    received_by: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = None

    @field_validator('received_by')
    @classmethod
    def strip_received_by(cls, v: str) -> str:
        return v.strip()


class RejectionDisputeRequest(BaseModel):
    """Schema for disputing a rejection claim."""
    reason: str = Field(..., min_length=10, description="Dispute reason must be at least 10 characters")
    disputed_by: str = Field(..., min_length=1, max_length=100)

    @field_validator('reason', 'disputed_by')
    @classmethod
    def strip_strings(cls, v: str) -> str:
        return v.strip()


class RejectionResponse(BaseModel):
    """Schema for material rejection response."""
    id: int
    rejection_number: str
    contractor_id: int
    contractor_name: str
    material_id: int
    material_name: str
    material_code: str
    quantity_rejected: Decimal
    unit_of_measure: str
    rejection_date: date
    rejection_reason: str
    reported_by: str
    original_issuance_id: Optional[int] = None
    original_issuance_number: Optional[str] = None
    status: str
    return_warehouse_id: Optional[int] = None
    return_warehouse_name: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    received_by: Optional[str] = None
    received_at: Optional[datetime] = None
    warehouse_grn_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('quantity_rejected', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        if v is None:
            return Decimal(0)
        return Decimal(str(v))


class RejectionListResponse(BaseModel):
    """Schema for listing rejections."""
    items: list[RejectionResponse]
    total: int
    page: int = 1
    page_size: int = 50


# Status constants for validation
REJECTION_STATUSES = [
    "REPORTED",
    "APPROVED",
    "RECEIVED_AT_WAREHOUSE",
    "DISPUTED",
    "CANCELLED",
]
