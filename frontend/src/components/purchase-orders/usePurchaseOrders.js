import { useState, useEffect } from 'react';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getSuppliers,
  createSupplier,
  getWarehouses,
  createGoodsReceipt,
  getPOGoodsReceipts,
  getErrorMessage,
} from '../../api';

export default function usePurchaseOrders(materials, refreshKey) {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subTab, setSubTab] = useState(0);

  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [grnDialog, setGrnDialog] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [cancelConfirmDialog, setCancelConfirmDialog] = useState(false);
  const [poToCancel, setPOToCancel] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poGRNs, setPOGRNs] = useState([]);

  // Form states
  const [newPO, setNewPO] = useState({
    supplier_id: '',
    warehouse_id: '',
    expected_delivery: '',
    notes: '',
    lines: [],
  });
  const [newLine, setNewLine] = useState({ material_id: '', quantity: '', unit_price: '' });
  const [newSupplier, setNewSupplier] = useState({ name: '', code: '', contact_email: '', contact_phone: '' });
  const [grnData, setGrnData] = useState({ received_by: '', lines: [] });

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadWarehouses();
  }, [refreshKey]);

  const loadOrders = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await getPurchaseOrders(params);
      setOrders(res.data?.items || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load purchase orders'));
      setOrders([]);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await getSuppliers();
      setSuppliers(res.data?.items || res.data || []);
    } catch (err) {
      console.error('Failed to load suppliers', err);
      setSuppliers([]);
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();
      setWarehouses(res.data?.items || res.data || []);
    } catch (err) {
      console.error('Failed to load warehouses', err);
      setWarehouses([]);
    }
  };

  const handleCreatePO = async () => {
    try {
      const data = {
        supplier_id: parseInt(newPO.supplier_id),
        warehouse_id: parseInt(newPO.warehouse_id),
        expected_delivery_date: newPO.expected_delivery || null,
        notes: newPO.notes || null,
        lines: newPO.lines.map((line) => ({
          material_id: parseInt(line.material_id),
          quantity_ordered: parseFloat(line.quantity),
          unit_price: parseFloat(line.unit_price),
          unit_of_measure: (materials || []).find((m) => m.id === parseInt(line.material_id))?.unit || 'pcs',
        })),
      };
      await createPurchaseOrder(data);
      setSuccess('Purchase order created successfully');
      setCreateDialog(false);
      setNewPO({ supplier_id: '', warehouse_id: '', expected_delivery: '', notes: '', lines: [] });
      loadOrders();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create purchase order'));
    }
  };

  const handleAddLine = () => {
    if (newLine.material_id && newLine.quantity && newLine.unit_price) {
      setNewPO({
        ...newPO,
        lines: [...newPO.lines, { ...newLine }],
      });
      setNewLine({ material_id: '', quantity: '', unit_price: '' });
    }
  };

  const handleRemoveLine = (index) => {
    setNewPO({
      ...newPO,
      lines: newPO.lines.filter((_, i) => i !== index),
    });
  };

  const handleViewPO = async (poId) => {
    try {
      const [poRes, grnRes] = await Promise.all([
        getPurchaseOrder(poId),
        getPOGoodsReceipts(poId),
      ]);
      setSelectedPO(poRes.data);
      setPOGRNs(grnRes.data || []);
      setViewDialog(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load purchase order'));
    }
  };

  const handleSubmitPO = async (poId) => {
    try {
      await submitPurchaseOrder(poId);
      setSuccess('Purchase order submitted');
      loadOrders();
      if (selectedPO?.id === poId) {
        handleViewPO(poId);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit purchase order'));
    }
  };

  const handleApprovePO = async (poId) => {
    try {
      await approvePurchaseOrder(poId, { approved_by: 'Manager' });
      setSuccess('Purchase order approved');
      loadOrders();
      if (selectedPO?.id === poId) {
        handleViewPO(poId);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve purchase order'));
    }
  };

  const openCancelConfirm = (po) => {
    setPOToCancel(po);
    setCancelConfirmDialog(true);
  };

  const handleCancelPO = async () => {
    if (!poToCancel) return;
    try {
      await cancelPurchaseOrder(poToCancel.id);
      setSuccess('Purchase order cancelled');
      setCancelConfirmDialog(false);
      setPOToCancel(null);
      loadOrders();
      if (selectedPO?.id === poToCancel.id) {
        setViewDialog(false);
        setSelectedPO(null);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to cancel purchase order'));
    }
  };

  const openGRNDialog = () => {
    if (selectedPO) {
      setGrnData({
        received_by: '',
        lines: selectedPO.lines.map((line) => ({
          po_line_id: line.id,
          material_id: line.material_id,
          material_code: line.material_code,
          material_name: line.material_name,
          ordered_qty: line.quantity,
          received_qty: line.received_quantity || 0,
          remaining_qty: line.quantity - (line.received_quantity || 0),
          quantity_received: '',
          quantity_accepted: '',
          quantity_rejected: '',
        })),
      });
      setGrnDialog(true);
    }
  };

  const handleCreateGRN = async () => {
    try {
      const data = {
        po_id: selectedPO.id,
        warehouse_id: selectedPO.warehouse_id,
        received_by: grnData.received_by || 'Warehouse',
        lines: grnData.lines
          .filter((line) => parseFloat(line.quantity_received) > 0)
          .map((line) => ({
            po_line_id: line.po_line_id,
            material_id: line.material_id,
            quantity_received: parseFloat(line.quantity_received),
            quantity_accepted: parseFloat(line.quantity_accepted) || parseFloat(line.quantity_received),
            quantity_rejected: parseFloat(line.quantity_rejected) || 0,
            unit_of_measure: 'pcs',
          })),
      };
      await createGoodsReceipt(data);
      setSuccess('Goods receipt created successfully');
      setGrnDialog(false);
      handleViewPO(selectedPO.id);
      loadOrders();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create goods receipt'));
    }
  };

  const handleCreateSupplier = async () => {
    try {
      await createSupplier(newSupplier);
      setSuccess('Supplier created successfully');
      setSupplierDialog(false);
      setNewSupplier({ name: '', code: '', contact_email: '', contact_phone: '' });
      loadSuppliers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create supplier'));
    }
  };

  return {
    // Data
    orders, suppliers, warehouses,
    error, setError,
    success, setSuccess,
    statusFilter, setStatusFilter,
    subTab, setSubTab,

    // Dialog states
    createDialog, setCreateDialog,
    viewDialog, setViewDialog,
    grnDialog, setGrnDialog,
    supplierDialog, setSupplierDialog,
    cancelConfirmDialog, setCancelConfirmDialog,
    poToCancel, setPOToCancel,
    selectedPO, setSelectedPO,
    poGRNs,

    // Form states
    newPO, setNewPO,
    newLine, setNewLine,
    newSupplier, setNewSupplier,
    grnData, setGrnData,

    // Actions
    loadOrders,
    handleCreatePO,
    handleAddLine,
    handleRemoveLine,
    handleViewPO,
    handleSubmitPO,
    handleApprovePO,
    openCancelConfirm,
    handleCancelPO,
    openGRNDialog,
    handleCreateGRN,
    handleCreateSupplier,
  };
}
