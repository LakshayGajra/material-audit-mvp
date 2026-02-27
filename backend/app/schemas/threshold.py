from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ThresholdCreate(BaseModel):
    """Request to create or update a variance threshold."""
    contractor_id: Optional[int] = Field(None, description="Contractor ID (NULL for material default)")
    material_id: int = Field(..., gt=0, description="Material ID")
    threshold_percentage: Decimal = Field(..., gt=0, le=100, description="Threshold percentage (must be > 0)")
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("threshold_percentage")
    @classmethod
    def validate_threshold(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("threshold_percentage must be greater than 0")
        if v > 100:
            raise ValueError("threshold_percentage cannot exceed 100")
        return v

    @field_validator("contractor_id")
    @classmethod
    def validate_contractor_id(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("contractor_id must be greater than 0 if provided")
        return v


class ThresholdUpdate(BaseModel):
    """Request to update a variance threshold."""
    threshold_percentage: Optional[Decimal] = Field(None, gt=0, le=100)
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("threshold_percentage")
    @classmethod
    def validate_threshold(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v <= 0:
                raise ValueError("threshold_percentage must be greater than 0")
            if v > 100:
                raise ValueError("threshold_percentage cannot exceed 100")
        return v


class ThresholdResponse(BaseModel):
    """Variance threshold response."""
    id: int
    contractor_id: Optional[int] = None
    contractor_name: Optional[str] = None
    material_id: int
    material_name: str
    threshold_percentage: Decimal
    is_active: bool
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ThresholdListResponse(BaseModel):
    """List of thresholds."""
    items: List[ThresholdResponse]
    total: int
