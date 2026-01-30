import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  LocalShipping as ShippingIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
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
} from '../api';
import { DataTable, ConfirmDialog } from './common';

const STATUS_COLORS = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  APPROVED: 'success',
  PARTIALLY_RECEIVED: 'warning',
  FULLY_RECEIVED: 'success',
  CANCELLED: 'error',
};

export default function PurchaseOrdersPage({ materials, refreshKey }) {
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

  return (
    <Grid container spacing={3}>
      {error && (
        <Grid size={12}>
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Grid>
      )}
      {success && (
        <Grid size={12}>
          <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
        </Grid>
      )}

      {/* Header */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Purchase Orders</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setSupplierDialog(true)}
                size="small"
              >
                New Supplier
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog(true)}
              >
                New Purchase Order
              </Button>
            </Box>
          </Box>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              label="Filter by Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setTimeout(loadOrders, 0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="SUBMITTED">Submitted</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="PARTIALLY_RECEIVED">Partially Received</MenuItem>
              <MenuItem value="FULLY_RECEIVED">Fully Received</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Grid>

      {/* PO List */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <DataTable
            columns={[
              { id: 'po_number', label: 'PO Number' },
              { id: 'supplier_name', label: 'Supplier' },
              { id: 'warehouse_name', label: 'Warehouse' },
              {
                id: 'status',
                label: 'Status',
                render: (val) => (
                  <Chip
                    label={val}
                    color={STATUS_COLORS[val] || 'default'}
                    size="small"
                  />
                ),
              },
              {
                id: 'total_amount',
                label: 'Total',
                align: 'right',
                render: (val) => `$${val?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              },
              {
                id: 'expected_delivery',
                label: 'Expected Delivery',
                render: (val) => val || '-',
              },
            ]}
            data={orders}
            searchPlaceholder="Search purchase orders..."
            searchFields={['po_number', 'supplier_name', 'warehouse_name', 'status']}
            renderRowActions={(po) => (
              <>
                <Tooltip title="View details">
                  <IconButton size="small" onClick={() => handleViewPO(po.id)}>
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                {po.status === 'DRAFT' && (
                  <Tooltip title="Submit for approval">
                    <IconButton size="small" onClick={() => handleSubmitPO(po.id)}>
                      <SendIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                )}
                {po.status === 'SUBMITTED' && (
                  <>
                    <Tooltip title="Approve">
                      <IconButton size="small" onClick={() => handleApprovePO(po.id)}>
                        <CheckIcon color="success" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel">
                      <IconButton size="small" onClick={() => openCancelConfirm(po)}>
                        <CloseIcon color="error" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </>
            )}
            emptyState={{
              icon: ReceiptIcon,
              title: 'No purchase orders',
              description: 'Create your first purchase order to start tracking material procurement.',
              actionLabel: 'New Purchase Order',
              onAction: () => setCreateDialog(true),
            }}
          />
        </Paper>
      </Grid>

      {/* Create PO Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <FormControl fullWidth required>
                  <InputLabel>Supplier</InputLabel>
                  <Select
                    value={newPO.supplier_id}
                    label="Supplier"
                    onChange={(e) => setNewPO({ ...newPO, supplier_id: e.target.value })}
                  >
                    {suppliers.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <FormControl fullWidth required>
                  <InputLabel>Destination Warehouse</InputLabel>
                  <Select
                    value={newPO.warehouse_id}
                    label="Destination Warehouse"
                    onChange={(e) => setNewPO({ ...newPO, warehouse_id: e.target.value })}
                  >
                    {warehouses.map((w) => (
                      <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Expected Delivery"
                  type="date"
                  value={newPO.expected_delivery}
                  onChange={(e) => setNewPO({ ...newPO, expected_delivery: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={newPO.notes}
                  onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">Line Items</Typography>

            <Grid container spacing={2} alignItems="center">
              <Grid size={4}>
                <FormControl fullWidth>
                  <InputLabel>Material</InputLabel>
                  <Select
                    value={newLine.material_id}
                    label="Material"
                    onChange={(e) => setNewLine({ ...newLine, material_id: e.target.value })}
                  >
                    {materials.map((m) => (
                      <MenuItem key={m.id} value={m.id}>{m.code} - {m.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={3}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={newLine.quantity}
                  onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  fullWidth
                  label="Unit Price"
                  type="number"
                  value={newLine.unit_price}
                  onChange={(e) => setNewLine({ ...newLine, unit_price: e.target.value })}
                />
              </Grid>
              <Grid size={2}>
                <Button variant="outlined" onClick={handleAddLine} fullWidth>Add</Button>
              </Grid>
            </Grid>

            {newPO.lines.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {newPO.lines.map((line, idx) => {
                      const mat = materials.find((m) => m.id === parseInt(line.material_id));
                      return (
                        <TableRow key={idx}>
                          <TableCell>{mat?.name || line.material_id}</TableCell>
                          <TableCell align="right">{line.quantity}</TableCell>
                          <TableCell align="right">${line.unit_price}</TableCell>
                          <TableCell align="right">
                            ${(parseFloat(line.quantity) * parseFloat(line.unit_price)).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => handleRemoveLine(idx)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreatePO}
            variant="contained"
            disabled={!newPO.supplier_id || !newPO.warehouse_id || newPO.lines.length === 0}
          >
            Create PO
          </Button>
        </DialogActions>
      </Dialog>

      {/* View PO Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Purchase Order: {selectedPO?.po_number}
          <Chip
            label={selectedPO?.status}
            color={STATUS_COLORS[selectedPO?.status] || 'default'}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedPO && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Supplier</Typography>
                  <Typography>{selectedPO.supplier_name}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Warehouse</Typography>
                  <Typography>{selectedPO.warehouse_name}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Expected Delivery</Typography>
                  <Typography>{selectedPO.expected_delivery || 'N/A'}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="h6">
                    ${selectedPO.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Typography>
                </Grid>
              </Grid>

              <Tabs value={subTab} onChange={(e, v) => setSubTab(v)} sx={{ mb: 2 }}>
                <Tab label="Line Items" />
                <Tab label="Goods Receipts" />
              </Tabs>

              {subTab === 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Material</TableCell>
                        <TableCell align="right">Ordered</TableCell>
                        <TableCell align="right">Received</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPO.lines?.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.material_code} - {line.material_name}</TableCell>
                          <TableCell align="right">{line.quantity}</TableCell>
                          <TableCell align="right">{line.received_quantity || 0}</TableCell>
                          <TableCell align="right">${line.unit_price?.toFixed(2)}</TableCell>
                          <TableCell align="right">${line.total_price?.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip label={line.status} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {subTab === 1 && (
                <Box>
                  {poGRNs.length === 0 ? (
                    <Typography color="text.secondary">No goods receipts yet</Typography>
                  ) : (
                    <List>
                      {poGRNs.map((grn) => (
                        <ListItem key={grn.id} divider>
                          <ListItemText
                            primary={grn.grn_number}
                            secondary={`Received: ${grn.receipt_date} by ${grn.received_by}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedPO?.status === 'DRAFT' && (
            <Button onClick={() => handleSubmitPO(selectedPO.id)} startIcon={<SendIcon />}>
              Submit
            </Button>
          )}
          {selectedPO?.status === 'SUBMITTED' && (
            <>
              <Button onClick={() => handleApprovePO(selectedPO.id)} color="success" startIcon={<CheckIcon />}>
                Approve
              </Button>
              <Button onClick={() => openCancelConfirm(selectedPO)} color="error" startIcon={<CloseIcon />}>
                Cancel
              </Button>
            </>
          )}
          {(selectedPO?.status === 'APPROVED' || selectedPO?.status === 'PARTIALLY_RECEIVED') && (
            <Button onClick={openGRNDialog} color="primary" startIcon={<ShippingIcon />}>
              Record Receipt
            </Button>
          )}
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* GRN Dialog */}
      <Dialog open={grnDialog} onClose={() => setGrnDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Record Goods Receipt</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Received By"
              value={grnData.received_by}
              onChange={(e) => setGrnData({ ...grnData, received_by: e.target.value })}
              required
            />

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Ordered</TableCell>
                    <TableCell align="right">Already Received</TableCell>
                    <TableCell align="right">Remaining</TableCell>
                    <TableCell align="right">Qty Received</TableCell>
                    <TableCell align="right">Qty Rejected</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grnData.lines.map((line, idx) => (
                    <TableRow key={line.po_line_id}>
                      <TableCell>{line.material_code} - {line.material_name}</TableCell>
                      <TableCell align="right">{line.ordered_qty}</TableCell>
                      <TableCell align="right">{line.received_qty}</TableCell>
                      <TableCell align="right">{line.remaining_qty}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={line.quantity_received}
                          onChange={(e) => {
                            const newLines = [...grnData.lines];
                            newLines[idx].quantity_received = e.target.value;
                            newLines[idx].quantity_accepted = e.target.value;
                            setGrnData({ ...grnData, lines: newLines });
                          }}
                          inputProps={{ min: 0, max: line.remaining_qty }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={line.quantity_rejected}
                          onChange={(e) => {
                            const newLines = [...grnData.lines];
                            newLines[idx].quantity_rejected = e.target.value;
                            newLines[idx].quantity_accepted =
                              parseFloat(newLines[idx].quantity_received || 0) -
                              parseFloat(e.target.value || 0);
                            setGrnData({ ...grnData, lines: newLines });
                          }}
                          inputProps={{ min: 0 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrnDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateGRN}
            variant="contained"
            disabled={!grnData.received_by || !grnData.lines.some((l) => parseFloat(l.quantity_received) > 0)}
          >
            Create Receipt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Supplier Dialog */}
      <Dialog open={supplierDialog} onClose={() => setSupplierDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Supplier</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Supplier Name"
              value={newSupplier.name}
              onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Supplier Code"
              value={newSupplier.code}
              onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Contact Email"
              type="email"
              value={newSupplier.contact_email}
              onChange={(e) => setNewSupplier({ ...newSupplier, contact_email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Contact Phone"
              value={newSupplier.contact_phone}
              onChange={(e) => setNewSupplier({ ...newSupplier, contact_phone: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateSupplier}
            variant="contained"
            disabled={!newSupplier.name || !newSupplier.code}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel PO Confirmation Dialog */}
      <ConfirmDialog
        open={cancelConfirmDialog}
        onClose={() => {
          setCancelConfirmDialog(false);
          setPOToCancel(null);
        }}
        onConfirm={handleCancelPO}
        title="Cancel Purchase Order?"
        message={`Are you sure you want to cancel PO ${poToCancel?.po_number}? This action cannot be undone.`}
        confirmLabel="Cancel PO"
        variant="danger"
      />
    </Grid>
  );
}
