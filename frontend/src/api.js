import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Helper to extract error message from API responses
// Handles FastAPI validation errors (array of objects) and string errors
export const getErrorMessage = (err, fallback = 'An error occurred') => {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => {
      // FastAPI validation errors have loc (location) array showing which field
      const fieldName = e.loc?.length > 1 ? e.loc[e.loc.length - 1] : null;
      const message = e.msg || e.message || 'Validation error';
      return fieldName ? `${fieldName}: ${message}` : message;
    }).join(', ');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  if (err.message) {
    return err.message;
  }
  return fallback;
};

// Contractors
export const getContractors = () => api.get('/contractors');
export const createContractor = (data) => api.post('/contractors', data);
export const getContractorInventory = (id) => api.get(`/contractors/${id}/inventory`);

// Materials
export const getMaterials = () => api.get('/materials');
export const createMaterial = (data) => api.post('/materials', data);
export const issueMaterial = (data) => api.post('/materials/issue', data);

// Finished Goods
export const getFinishedGoods = () => api.get('/finished-goods');
export const createFinishedGood = (data) => api.post('/finished-goods', data);

// Production
export const reportProduction = (data) => api.post('/production/report', data);
export const getProductionHistory = (contractorId) => api.get(`/production/history/${contractorId}`);

// BOM
export const getBOM = (finishedGoodId) => api.get(`/bom/${finishedGoodId}`);
export const addBOMItem = (data) => api.post('/bom', data);
export const deleteBOMItem = (bomId) => api.delete(`/bom/${bomId}`);

// Anomalies
export const getAnomalies = (resolved) => api.get('/anomalies', { params: { resolved } });
export const resolveAnomaly = (anomalyId) => api.post(`/anomalies/${anomalyId}/resolve`);

// ============================================================================
// V1 API ENDPOINTS
// ============================================================================

// Warehouses
export const getWarehouses = (params) => api.get('/v1/warehouses', { params });
export const createWarehouse = (data) => api.post('/v1/warehouses', data);
export const getWarehouse = (id) => api.get(`/v1/warehouses/${id}`);
export const updateWarehouse = (id, data) => api.put(`/v1/warehouses/${id}`, data);
export const getWarehouseInventory = (warehouseId) => api.get(`/v1/warehouses/${warehouseId}/inventory`);
export const getWarehouseFGInventory = (warehouseId) => api.get(`/v1/warehouses/${warehouseId}/fg-inventory`);
export const addWarehouseInventory = (warehouseId, data) => api.post(`/v1/warehouses/${warehouseId}/inventory`, data);
export const updateWarehouseInventory = (warehouseId, inventoryId, data) =>
  api.put(`/v1/warehouses/${warehouseId}/inventory/${inventoryId}`, data);
export const getLowStockItems = (warehouseId) => api.get(`/v1/warehouses/${warehouseId}/low-stock`);

// Suppliers
export const getSuppliers = () => api.get('/v1/suppliers');
export const createSupplier = (data) => api.post('/v1/suppliers', data);
export const getSupplier = (id) => api.get(`/v1/suppliers/${id}`);
export const updateSupplier = (id, data) => api.put(`/v1/suppliers/${id}`, data);

// Purchase Orders
export const getPurchaseOrders = (params) => api.get('/v1/purchase-orders', { params });
export const createPurchaseOrder = (data) => api.post('/v1/purchase-orders', data);
export const getPurchaseOrder = (id) => api.get(`/v1/purchase-orders/${id}`);
export const updatePurchaseOrder = (id, data) => api.put(`/v1/purchase-orders/${id}`, data);
export const submitPurchaseOrder = (id) => api.post(`/v1/purchase-orders/${id}/submit`);
export const approvePurchaseOrder = (id, data) => api.post(`/v1/purchase-orders/${id}/approve`, data);
export const cancelPurchaseOrder = (id) => api.post(`/v1/purchase-orders/${id}/cancel`);

// Goods Receipts
export const getGoodsReceipts = (params) => api.get('/v1/goods-receipts', { params });
export const createGoodsReceipt = (data) => api.post('/v1/goods-receipts', data);
export const getGoodsReceipt = (id) => api.get(`/v1/goods-receipts/${id}`);
export const getPOGoodsReceipts = (poId) => api.get(`/v1/purchase-orders/${poId}/goods-receipts`);

// Material Issuances (V1)
export const getIssuances = (params) => api.get('/v1/issuances', { params });
export const createIssuance = (data) => api.post('/v1/issuances', data);
export const getIssuance = (id) => api.get(`/v1/issuances/${id}`);
export const getContractorIssuances = (contractorId, params) =>
  api.get(`/v1/contractors/${contractorId}/issuances`, { params });
export const getMaterialIssuances = (materialId, params) =>
  api.get(`/v1/materials/${materialId}/issuances`, { params });

// Rejections
export const getRejections = (params) => api.get('/v1/rejections', { params });
export const createRejection = (data) => api.post('/v1/rejections', data);
export const getRejection = (id) => api.get(`/v1/rejections/${id}`);
export const approveRejection = (id, data) => api.put(`/v1/rejections/${id}/approve`, data);
export const receiveRejection = (id, data) => api.put(`/v1/rejections/${id}/receive`, data);
export const disputeRejection = (id, data) => api.put(`/v1/rejections/${id}/dispute`, data);
export const getContractorRejections = (contractorId, params) =>
  api.get(`/v1/contractors/${contractorId}/rejections`, { params });

// Audits
export const startAudit = (data) => api.post('/v1/audits/start', data);
export const getAuditForAuditor = (auditId) => api.get(`/v1/audits/${auditId}/auditor-view`);
export const enterAuditCounts = (auditId, data) => api.put(`/v1/audits/${auditId}/enter-counts`, data);
export const submitAudit = (auditId) => api.post(`/v1/audits/${auditId}/submit`);
export const getAuditAnalysis = (auditId) => api.get(`/v1/audits/${auditId}/analyze`);
export const acceptAuditCounts = (auditId, data) => api.post(`/v1/audits/${auditId}/accept-counts`, data);
export const keepSystemValues = (auditId, data) => api.post(`/v1/audits/${auditId}/keep-system-values`, data);
export const closeAudit = (auditId, data) => api.post(`/v1/audits/${auditId}/close`, data);
export const getAudits = (params) => api.get('/v1/audits', { params });
export const getAudit = (id) => api.get(`/v1/audits/${id}`);

// Thresholds
export const getThresholds = (params) => api.get('/v1/thresholds', { params });
export const createThreshold = (data, createdBy) =>
  api.post('/v1/thresholds', data, { params: { created_by: createdBy } });
export const updateThreshold = (id, data, updatedBy) =>
  api.put(`/v1/thresholds/${id}`, data, { params: { updated_by: updatedBy } });
export const deleteThreshold = (id) => api.delete(`/v1/thresholds/${id}`);
export const getEffectiveThreshold = (contractorId, materialId) =>
  api.get(`/v1/thresholds/effective/${contractorId}/${materialId}`);

// Reconciliations
export const submitReconciliation = (data) => api.post('/v1/reconciliations/submit', data);
export const getReconciliations = (params) => api.get('/v1/reconciliations', { params });
export const getReconciliation = (id) => api.get(`/v1/reconciliations/${id}`);
export const reviewReconciliation = (id, data) => api.put(`/v1/reconciliations/${id}/review`, data);
export const getPendingReconciliations = () => api.get('/v1/reconciliations/pending-review');
export const getContractorReconciliations = (contractorId, params) =>
  api.get(`/v1/contractors/${contractorId}/reconciliations`, { params });

// Dashboard
export const getDashboardSummary = () => api.get('/v1/dashboard/summary');

// Reports
export const getInventorySummaryReport = () =>
  api.get('/v1/reports/inventory-summary', { responseType: 'blob' });
export const getMaterialMovementReport = (materialId, params) =>
  api.get(`/v1/reports/material-movement/${materialId}`, { params });
export const getContractorAuditHistoryReport = (contractorId) =>
  api.get(`/v1/reports/contractor-audit-history/${contractorId}`, { responseType: 'blob' });
export const getAnomalyReport = (params) =>
  api.get('/v1/reports/anomaly-report', { params, responseType: 'blob' });

// Finished Goods Receipts
export const getFGRs = (params) => api.get('/v1/fgr', { params });
export const createFGR = (data) => api.post('/v1/fgr', data);
export const getFGR = (id) => api.get(`/v1/fgr/${id}`);
export const submitFGR = (id) => api.post(`/v1/fgr/${id}/submit`);
export const inspectFGR = (id, data) => api.put(`/v1/fgr/${id}/inspect`, data);
export const completeFGR = (id) => api.post(`/v1/fgr/${id}/complete`);
export const getContractorPendingDeliveries = (contractorId) =>
  api.get(`/v1/fgr/pending-deliveries/${contractorId}`);

// Finished Goods Inventory
export const getFinishedGoodsInventory = (params) =>
  api.get('/v1/finished-goods-inventory', { params });

// Inventory Checks (Unified Audits & Reconciliations)
export const getInventoryChecks = (params) => api.get('/v1/inventory-checks', { params });
export const createInventoryCheck = (data) => api.post('/v1/inventory-checks', data);
export const getInventoryCheck = (id) => api.get(`/v1/inventory-checks/${id}`);
export const getCountingView = (id) => api.get(`/v1/inventory-checks/${id}/counting-view`);
export const enterCounts = (id, data) => api.put(`/v1/inventory-checks/${id}/counts`, data);
export const saveCountsDraft = (id, data) => api.post(`/v1/inventory-checks/${id}/save-counts`, data);
export const resolveInventoryCheck = (id, data) => api.put(`/v1/inventory-checks/${id}/resolve`, data);

export default api;
