from pydantic import BaseModel
from datetime import datetime, date


class MaterialCreate(BaseModel):
    code: str
    name: str
    unit: str


class MaterialResponse(BaseModel):
    id: int
    code: str
    name: str
    unit: str

    class Config:
        from_attributes = True


class ContractorCreate(BaseModel):
    code: str
    name: str
    phone: str | None = None


class ContractorResponse(BaseModel):
    id: int
    code: str
    name: str
    phone: str | None

    class Config:
        from_attributes = True


class MaterialIssue(BaseModel):
    contractor_id: int
    material_id: int
    quantity: float


class InventoryItem(BaseModel):
    id: int
    material_id: int
    material_code: str
    material_name: str
    quantity: float
    last_updated: datetime | None

    class Config:
        from_attributes = True


class FinishedGoodCreate(BaseModel):
    code: str
    name: str


class FinishedGoodResponse(BaseModel):
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True


class ProductionReport(BaseModel):
    contractor_id: int
    finished_good_id: int
    quantity: float
    production_date: date | None = None


class ProductionRecordResponse(BaseModel):
    id: int
    contractor_id: int
    finished_good_id: int
    quantity: float
    production_date: date

    class Config:
        from_attributes = True


class ProductionHistoryItem(BaseModel):
    id: int
    finished_good_code: str
    finished_good_name: str
    quantity: float
    production_date: date

    class Config:
        from_attributes = True


class BOMItemCreate(BaseModel):
    finished_good_id: int
    material_id: int
    quantity_per_unit: float


class BOMItemResponse(BaseModel):
    id: int
    finished_good_id: int
    material_id: int
    material_code: str
    material_name: str
    material_unit: str
    quantity_per_unit: float

    class Config:
        from_attributes = True


class BOMForFinishedGood(BaseModel):
    finished_good_id: int
    finished_good_code: str
    finished_good_name: str
    items: list[BOMItemResponse]


class MaterialShortage(BaseModel):
    material_code: str
    material_name: str
    required: float
    available: float
    shortage: float


class ConsumptionDetail(BaseModel):
    material_code: str
    material_name: str
    quantity_consumed: float


class ProductionReportResult(BaseModel):
    id: int
    contractor_id: int
    finished_good_id: int
    quantity: float
    production_date: date
    consumptions: list[ConsumptionDetail]
    warnings: list[MaterialShortage]
