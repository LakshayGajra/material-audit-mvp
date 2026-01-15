import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const getContractors = () => api.get('/contractors');
export const createContractor = (data) => api.post('/contractors', data);
export const getContractorInventory = (id) => api.get(`/contractors/${id}/inventory`);

export const getMaterials = () => api.get('/materials');
export const createMaterial = (data) => api.post('/materials', data);
export const issueMaterial = (data) => api.post('/materials/issue', data);

export const getFinishedGoods = () => api.get('/finished-goods');
export const createFinishedGood = (data) => api.post('/finished-goods', data);

export const reportProduction = (data) => api.post('/production/report', data);
export const getProductionHistory = (contractorId) => api.get(`/production/history/${contractorId}`);

export const getBOM = (finishedGoodId) => api.get(`/bom/${finishedGoodId}`);
export const addBOMItem = (data) => api.post('/bom', data);
export const deleteBOMItem = (bomId) => api.delete(`/bom/${bomId}`);

export default api;
