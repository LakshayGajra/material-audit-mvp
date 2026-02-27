# Re-export all schemas from the legacy schemas module
from app.schemas_legacy import (
    MaterialCreate,
    MaterialResponse,
    ContractorCreate,
    ContractorResponse,
    MaterialIssue,
    InventoryItem,
    FinishedGoodCreate,
    FinishedGoodResponse,
    ProductionReport,
    ProductionRecordResponse,
    ProductionHistoryItem,
    BOMItemCreate,
    BOMItemResponse,
    BOMForFinishedGood,
    MaterialShortage,
    ConsumptionDetail,
    AnomalyResponse,
    AnomalyBrief,
    ProductionReportResult,
)

# Export warehouse schemas
from app.schemas.warehouse import (
    WarehouseCreate,
    WarehouseUpdate,
    WarehouseResponse,
    WarehouseInventoryResponse,
    WarehouseInventoryCreate,
    WarehouseInventoryUpdate,
    WarehouseListResponse,
)

# Export purchase order schemas
from app.schemas.purchase_order import (
    POLineCreate,
    POLineUpdate,
    POLineResponse,
    POCreate,
    POUpdate,
    POResponse,
    POListResponse,
    POApproval,
    PO_STATUSES,
    PO_LINE_STATUSES,
)

# Export goods receipt schemas
from app.schemas.goods_receipt import (
    GRNLineCreate,
    GRNLineResponse,
    GRNCreate,
    GRNResponse,
    GRNListResponse,
    GRNSummary,
)

# Export supplier schemas
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierListResponse,
)

# Export unit conversion schemas
from app.schemas.unit_conversion import (
    UnitConversionCreate,
    UnitConversionUpdate,
    UnitConversionResponse,
    ConvertQuantityRequest,
    ConvertQuantityResponse,
)

# Export issuance schemas
from app.schemas.issuance import (
    IssuanceRequest,
    IssuanceResponse,
    IssuanceHistoryQuery,
    IssuanceListResponse,
)

# Export rejection schemas
from app.schemas.rejection import (
    RejectionReportRequest,
    RejectionApprovalRequest,
    RejectionReceiveRequest,
    RejectionDisputeRequest,
    RejectionResponse,
    RejectionListResponse,
    REJECTION_STATUSES,
)

# Export threshold schemas
from app.schemas.threshold import (
    ThresholdCreate,
    ThresholdUpdate,
    ThresholdResponse,
    ThresholdListResponse,
)

# Export adjustment schemas
from app.schemas.adjustment import (
    AdjustmentRequest,
    AdjustmentApprovalRequest,
    AdjustmentResponse,
    AdjustmentListResponse,
)

__all__ = [
    # Legacy schemas
    "MaterialCreate",
    "MaterialResponse",
    "ContractorCreate",
    "ContractorResponse",
    "MaterialIssue",
    "InventoryItem",
    "FinishedGoodCreate",
    "FinishedGoodResponse",
    "ProductionReport",
    "ProductionRecordResponse",
    "ProductionHistoryItem",
    "BOMItemCreate",
    "BOMItemResponse",
    "BOMForFinishedGood",
    "MaterialShortage",
    "ConsumptionDetail",
    "AnomalyResponse",
    "AnomalyBrief",
    "ProductionReportResult",
    # Warehouse schemas
    "WarehouseCreate",
    "WarehouseUpdate",
    "WarehouseResponse",
    "WarehouseInventoryResponse",
    "WarehouseInventoryCreate",
    "WarehouseInventoryUpdate",
    "WarehouseListResponse",
    # Purchase order schemas
    "POLineCreate",
    "POLineUpdate",
    "POLineResponse",
    "POCreate",
    "POUpdate",
    "POResponse",
    "POListResponse",
    "POApproval",
    "PO_STATUSES",
    "PO_LINE_STATUSES",
    # Goods receipt schemas
    "GRNLineCreate",
    "GRNLineResponse",
    "GRNCreate",
    "GRNResponse",
    "GRNListResponse",
    "GRNSummary",
    # Supplier schemas
    "SupplierCreate",
    "SupplierUpdate",
    "SupplierResponse",
    "SupplierListResponse",
    # Unit conversion schemas
    "UnitConversionCreate",
    "UnitConversionUpdate",
    "UnitConversionResponse",
    "ConvertQuantityRequest",
    "ConvertQuantityResponse",
    # Issuance schemas
    "IssuanceRequest",
    "IssuanceResponse",
    "IssuanceHistoryQuery",
    "IssuanceListResponse",
    # Rejection schemas
    "RejectionReportRequest",
    "RejectionApprovalRequest",
    "RejectionReceiveRequest",
    "RejectionDisputeRequest",
    "RejectionResponse",
    "RejectionListResponse",
    "REJECTION_STATUSES",
    # Threshold schemas
    "ThresholdCreate",
    "ThresholdUpdate",
    "ThresholdResponse",
    "ThresholdListResponse",
    # Adjustment schemas
    "AdjustmentRequest",
    "AdjustmentApprovalRequest",
    "AdjustmentResponse",
    "AdjustmentListResponse",
]
