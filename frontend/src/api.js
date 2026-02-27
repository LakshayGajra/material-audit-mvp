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

// Warehouses
export const getWarehouses = (params) => api.get('/warehouses', { params });
export const createWarehouse = (data) => api.post('/warehouses', data);
export const getWarehouse = (id) => api.get(`/warehouses/${id}`);
export const updateWarehouse = (id, data) => api.put(`/warehouses/${id}`, data);
export const getWarehouseInventory = (warehouseId) => api.get(`/warehouses/${warehouseId}/inventory`);
export const getWarehouseFGInventory = (warehouseId) => api.get(`/warehouses/${warehouseId}/fg-inventory`);
export const addWarehouseInventory = (warehouseId, data) => api.post(`/warehouses/${warehouseId}/inventory`, data);
export const updateWarehouseInventory = (warehouseId, inventoryId, data) =>
  api.put(`/warehouses/${warehouseId}/inventory/${inventoryId}`, data);
export const getLowStockItems = (warehouseId) => api.get(`/warehouses/${warehouseId}/low-stock`);

// Suppliers
export const getSuppliers = () => api.get('/suppliers');
export const createSupplier = (data) => api.post('/suppliers', data);
export const getSupplier = (id) => api.get(`/suppliers/${id}`);
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data);

// Purchase Orders
export const getPurchaseOrders = (params) => api.get('/purchase-orders', { params });
export const createPurchaseOrder = (data) => api.post('/purchase-orders', data);
export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`);
export const updatePurchaseOrder = (id, data) => api.put(`/purchase-orders/${id}`, data);
export const submitPurchaseOrder = (id) => api.post(`/purchase-orders/${id}/submit`);
export const approvePurchaseOrder = (id, data) => api.post(`/purchase-orders/${id}/approve`, data);
export const cancelPurchaseOrder = (id) => api.post(`/purchase-orders/${id}/cancel`);

// Goods Receipts
export const getGoodsReceipts = (params) => api.get('/goods-receipts', { params });
export const createGoodsReceipt = (data) => api.post('/goods-receipts', data);
export const getGoodsReceipt = (id) => api.get(`/goods-receipts/${id}`);
export const getPOGoodsReceipts = (poId) => api.get(`/purchase-orders/${poId}/goods-receipts`);

// Material Issuances
export const getIssuances = (params) => api.get('/issuances', { params });
export const createIssuance = (data) => api.post('/issuances', data);
export const getIssuance = (id) => api.get(`/issuances/${id}`);
export const getContractorIssuances = (contractorId, params) =>
  api.get(`/contractors/${contractorId}/issuances`, { params });
export const getMaterialIssuances = (materialId, params) =>
  api.get(`/materials/${materialId}/issuances`, { params });

// Rejections
export const getRejections = (params) => api.get('/rejections', { params });
export const createRejection = (data) => api.post('/rejections', data);
export const getRejection = (id) => api.get(`/rejections/${id}`);
export const approveRejection = (id, data) => api.put(`/rejections/${id}/approve`, data);
export const receiveRejection = (id, data) => api.put(`/rejections/${id}/receive`, data);
export const disputeRejection = (id, data) => api.put(`/rejections/${id}/dispute`, data);
export const getContractorRejections = (contractorId, params) =>
  api.get(`/contractors/${contractorId}/rejections`, { params });

// Thresholds
export const getThresholds = (params) => api.get('/thresholds', { params });
export const createThreshold = (data, createdBy) =>
  api.post('/thresholds', data, { params: { created_by: createdBy } });
export const updateThreshold = (id, data, updatedBy) =>
  api.put(`/thresholds/${id}`, data, { params: { updated_by: updatedBy } });
export const deleteThreshold = (id) => api.delete(`/thresholds/${id}`);
export const getEffectiveThreshold = (contractorId, materialId) =>
  api.get(`/thresholds/effective/${contractorId}/${materialId}`);

// Dashboard
export const getDashboardSummary = () => api.get('/dashboard/summary');

// Reports
export const getInventorySummaryReport = () =>
  api.get('/reports/inventory-summary', { responseType: 'blob' });
export const getMaterialMovementReport = (materialId, params) =>
  api.get(`/reports/material-movement/${materialId}`, { params });
export const getContractorAuditHistoryReport = (contractorId) =>
  api.get(`/reports/contractor-audit-history/${contractorId}`, { responseType: 'blob' });
export const getAnomalyReport = (params) =>
  api.get('/reports/anomaly-report', { params, responseType: 'blob' });

// Finished Goods Receipts
export const getFGRs = (params) => api.get('/fgr', { params });
export const createFGR = (data) => api.post('/fgr', data);
export const getFGR = (id) => api.get(`/fgr/${id}`);
export const submitFGR = (id) => api.post(`/fgr/${id}/submit`);
export const inspectFGR = (id, data) => api.put(`/fgr/${id}/inspect`, data);
export const completeFGR = (id) => api.post(`/fgr/${id}/complete`);
export const getContractorPendingDeliveries = (contractorId) =>
  api.get(`/fgr/pending-deliveries/${contractorId}`);

// Finished Goods Inventory
export const getFinishedGoodsInventory = (params) =>
  api.get('/finished-goods-inventory', { params });

// Inventory Checks (Unified Verification)
export const getInventoryChecks = (params) => api.get('/inventory-checks', { params });
export const createInventoryCheck = (data) => api.post('/inventory-checks', data);
export const getInventoryCheck = (id) => api.get(`/inventory-checks/${id}`);
export const getCountingView = (id) => api.get(`/inventory-checks/${id}/counting-view`);
export const enterCounts = (id, data) => api.put(`/inventory-checks/${id}/counts`, data);
export const saveCountsDraft = (id, data) => api.post(`/inventory-checks/${id}/save-counts`, data);
export const resolveInventoryCheck = (id, data) => api.put(`/inventory-checks/${id}/resolve`, data);

// Stock Transfers
export const getStockTransfers = (params) => api.get('/stock-transfers', { params });
export const createStockTransfer = (data) => api.post('/stock-transfers', data);
export const getStockTransfer = (id) => api.get(`/stock-transfers/${id}`);
export const submitStockTransfer = (id) => api.post(`/stock-transfers/${id}/submit`);
export const completeStockTransfer = (id, data) => api.post(`/stock-transfers/${id}/complete`, data);
export const cancelStockTransfer = (id) => api.post(`/stock-transfers/${id}/cancel`);

export default api;
