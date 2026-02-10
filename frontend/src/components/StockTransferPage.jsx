import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  SwapHoriz as TransferIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  Warehouse as WarehouseIcon,
  Business as CompanyIcon,
  People as ContractorIcon,
} from '@mui/icons-material';
import {
  getStockTransfers,
  createStockTransfer,
  getStockTransfer,
  completeStockTransfer,
  cancelStockTransfer,
  getWarehouses,
  getWarehouseInventory,
  getWarehouseFGInventory,
  getMaterials,
  getFinishedGoods,
  getErrorMessage,
} from '../api';

const statusColors = {
  draft: 'default',
  submitted: 'info',
  completed: 'success',
  cancelled: 'error',
};

export default function StockTransferPage() {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    source_warehouse_id: '',
    destination_warehouse_id: '',
    transfer_type: 'material',
    transfer_date: new Date().toISOString().split('T')[0],
    requested_by: '',
    notes: '',
    lines: [],
  });
  const [sourceInventory, setSourceInventory] = useState([]);
  const [newLine, setNewLine] = useState({ item_id: '', quantity: '' });

  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Complete dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completedBy, setCompletedBy] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transfersRes, warehousesRes, materialsRes, fgRes] = await Promise.all([
        getStockTransfers({ status: statusFilter || undefined, transfer_type: typeFilter || undefined }),
        getWarehouses(),
        getMaterials(),
        getFinishedGoods(),
      ]);
      setTransfers(transfersRes.data?.items || transfersRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setMaterials(materialsRes.data || []);
      setFinishedGoods(fgRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const loadSourceInventory = async (warehouseId, transferType) => {
    if (!warehouseId) {
      setSourceInventory([]);
      return;
    }
    try {
      if (transferType === 'material') {
        const res = await getWarehouseInventory(warehouseId);
        setSourceInventory(res.data || []);
      } else {
        const res = await getWarehouseFGInventory(warehouseId);
        setSourceInventory(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load source inventory', err);
      setSourceInventory([]);
    }
  };

  useEffect(() => {
    if (formData.source_warehouse_id && formData.transfer_type) {
      loadSourceInventory(formData.source_warehouse_id, formData.transfer_type);
    }
  }, [formData.source_warehouse_id, formData.transfer_type]);

  const handleOpenCreate = () => {
    setFormData({
      source_warehouse_id: '',
      destination_warehouse_id: '',
      transfer_type: 'material',
      transfer_date: new Date().toISOString().split('T')[0],
      requested_by: '',
      notes: '',
      lines: [],
    });
    setNewLine({ item_id: '', quantity: '' });
    setSourceInventory([]);
    setCreateDialogOpen(true);
  };

  const handleAddLine = () => {
    if (!newLine.item_id || !newLine.quantity) return;

    const item = sourceInventory.find(
      (i) => (formData.transfer_type === 'material' ? i.material_id : i.finished_good_id) === parseInt(newLine.item_id)
    );
    if (!item) return;

    const line = {
      ...(formData.transfer_type === 'material'
        ? { material_id: parseInt(newLine.item_id), material_name: item.material_name, material_code: item.material_code }
        : { finished_good_id: parseInt(newLine.item_id), finished_good_name: item.finished_good_name, finished_good_code: item.finished_good_code }),
      quantity: parseFloat(newLine.quantity),
      unit_of_measure: item.unit_of_measure,
      available: parseFloat(item.current_quantity),
    };

    setFormData({ ...formData, lines: [...formData.lines, line] });
    setNewLine({ item_id: '', quantity: '' });
  };

  const handleRemoveLine = (index) => {
    const newLines = [...formData.lines];
    newLines.splice(index, 1);
    setFormData({ ...formData, lines: newLines });
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const payload = {
        source_warehouse_id: parseInt(formData.source_warehouse_id),
        destination_warehouse_id: parseInt(formData.destination_warehouse_id),
        transfer_type: formData.transfer_type,
        transfer_date: formData.transfer_date,
        requested_by: formData.requested_by || null,
        notes: formData.notes || null,
        lines: formData.lines.map((line) => ({
          material_id: line.material_id || null,
          finished_good_id: line.finished_good_id || null,
          quantity: line.quantity,
          unit_of_measure: line.unit_of_measure,
        })),
      };
      await createStockTransfer(payload);
      setSuccess('Stock transfer created successfully');
      setCreateDialogOpen(false);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create transfer'));
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (transfer) => {
    try {
      const res = await getStockTransfer(transfer.id);
      setSelectedTransfer(res.data);
      setViewDialogOpen(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load transfer details'));
    }
  };

  const handleOpenComplete = (transfer) => {
    setSelectedTransfer(transfer);
    setCompletedBy('');
    setCompleteDialogOpen(true);
  };

  const handleComplete = async () => {
    if (!completedBy.trim()) {
      setError('Please enter who is completing the transfer');
      return;
    }
    try {
      setLoading(true);
      await completeStockTransfer(selectedTransfer.id, { completed_by: completedBy });
      setSuccess('Transfer completed successfully. Inventory has been moved.');
      setCompleteDialogOpen(false);
      setSelectedTransfer(null);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to complete transfer'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (transfer) => {
    if (!window.confirm('Are you sure you want to cancel this transfer?')) return;
    try {
      setLoading(true);
      await cancelStockTransfer(transfer.id);
      setSuccess('Transfer cancelled');
      loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to cancel transfer'));
    } finally {
      setLoading(false);
    }
  };

  const getWarehouseLabel = (warehouse) => {
    if (!warehouse) return '';
    const icon = warehouse.owner_type === 'contractor' ? '👷' : '🏢';
    return `${icon} ${warehouse.name} (${warehouse.code})`;
  };

  const sourceWarehouse = warehouses.find((w) => w.id === parseInt(formData.source_warehouse_id));
  const destWarehouse = warehouses.find((w) => w.id === parseInt(formData.destination_warehouse_id));

  return (
    <Grid container spacing={3}>
      {error && (
        <Grid item xs={12}>
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Grid>
      )}
      {success && (
        <Grid item xs={12}>
          <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
        </Grid>
      )}

      {/* Summary Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Transfers</Typography>
                <Typography variant="h4">{transfers.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Draft</Typography>
                <Typography variant="h4" color="text.secondary">
                  {transfers.filter((t) => t.status === 'draft').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Submitted</Typography>
                <Typography variant="h4" color="info.main">
                  {transfers.filter((t) => t.status === 'submitted').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Completed</Typography>
                <Typography variant="h4" color="success.main">
                  {transfers.filter((t) => t.status === 'completed').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TransferIcon color="primary" />
              <Typography variant="h6">Stock Transfers</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="submitted">Submitted</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="material">Materials</MenuItem>
                  <MenuItem value="finished_good">Finished Goods</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                New Transfer
              </Button>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Transfer #</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No transfers found. Click "New Transfer" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <Typography fontWeight={500}>{transfer.transfer_number}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transfer.transfer_type === 'material' ? 'Material' : 'Finished Good'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {transfer.source_owner_type === 'contractor' ? (
                            <ContractorIcon fontSize="small" color="action" />
                          ) : (
                            <CompanyIcon fontSize="small" color="action" />
                          )}
                          <Typography variant="body2">{transfer.source_warehouse_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {transfer.destination_owner_type === 'contractor' ? (
                            <ContractorIcon fontSize="small" color="action" />
                          ) : (
                            <CompanyIcon fontSize="small" color="action" />
                          )}
                          <Typography variant="body2">{transfer.destination_warehouse_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{new Date(transfer.transfer_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip label={transfer.status} color={statusColors[transfer.status]} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => handleView(transfer)} title="View">
                            <ViewIcon fontSize="small" />
                          </IconButton>
                          {['draft', 'submitted'].includes(transfer.status) && (
                            <>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleOpenComplete(transfer)}
                                title="Complete"
                              >
                                <CompleteIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleCancel(transfer)}
                                title="Cancel"
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Stock Transfer</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <ToggleButtonGroup
                  value={formData.transfer_type}
                  exclusive
                  onChange={(e, v) => v && setFormData({ ...formData, transfer_type: v, lines: [] })}
                  fullWidth
                >
                  <ToggleButton value="material">Materials</ToggleButton>
                  <ToggleButton value="finished_good">Finished Goods</ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Source Warehouse</InputLabel>
                  <Select
                    value={formData.source_warehouse_id}
                    label="Source Warehouse"
                    onChange={(e) => setFormData({ ...formData, source_warehouse_id: e.target.value, lines: [] })}
                  >
                    {warehouses
                      .filter((w) =>
                        formData.transfer_type === 'material' ? w.can_hold_materials : w.can_hold_finished_goods
                      )
                      .map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                          {w.owner_type === 'contractor' ? '👷' : '🏢'} {w.name} ({w.code})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Destination Warehouse</InputLabel>
                  <Select
                    value={formData.destination_warehouse_id}
                    label="Destination Warehouse"
                    onChange={(e) => setFormData({ ...formData, destination_warehouse_id: e.target.value })}
                  >
                    {warehouses
                      .filter(
                        (w) =>
                          w.id !== parseInt(formData.source_warehouse_id) &&
                          (formData.transfer_type === 'material' ? w.can_hold_materials : w.can_hold_finished_goods)
                      )
                      .map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                          {w.owner_type === 'contractor' ? '👷' : '🏢'} {w.name} ({w.code})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              {sourceWarehouse && destWarehouse && (
                <Grid item xs={12}>
                  <Alert severity="info" icon={<TransferIcon />}>
                    Transfer from <strong>{sourceWarehouse.name}</strong> ({sourceWarehouse.owner_type}) to{' '}
                    <strong>{destWarehouse.name}</strong> ({destWarehouse.owner_type})
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Transfer Date"
                  type="date"
                  value={formData.transfer_date}
                  onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Requested By"
                  value={formData.requested_by}
                  onChange={(e) => setFormData({ ...formData, requested_by: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>Items to Transfer</Divider>
              </Grid>

              {/* Add line item */}
              {formData.source_warehouse_id && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                    <FormControl sx={{ flex: 2 }}>
                      <InputLabel>
                        {formData.transfer_type === 'material' ? 'Material' : 'Finished Good'}
                      </InputLabel>
                      <Select
                        value={newLine.item_id}
                        label={formData.transfer_type === 'material' ? 'Material' : 'Finished Good'}
                        onChange={(e) => setNewLine({ ...newLine, item_id: e.target.value })}
                      >
                        {sourceInventory.map((item) => {
                          const id = formData.transfer_type === 'material' ? item.material_id : item.finished_good_id;
                          const name = formData.transfer_type === 'material' ? item.material_name : item.finished_good_name;
                          const code = formData.transfer_type === 'material' ? item.material_code : item.finished_good_code;
                          return (
                            <MenuItem key={id} value={id}>
                              {code} - {name} (Avail: {parseFloat(item.current_quantity).toFixed(2)})
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    <TextField
                      sx={{ flex: 1 }}
                      label="Quantity"
                      type="number"
                      value={newLine.quantity}
                      onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                    <Button variant="outlined" onClick={handleAddLine} disabled={!newLine.item_id || !newLine.quantity}>
                      Add
                    </Button>
                  </Box>
                </Grid>
              )}

              {/* Line items table */}
              {formData.lines.length > 0 && (
                <Grid item xs={12}>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Available</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.lines.map((line, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{line.material_code || line.finished_good_code}</TableCell>
                            <TableCell>{line.material_name || line.finished_good_name}</TableCell>
                            <TableCell align="right">{line.quantity}</TableCell>
                            <TableCell align="right">{line.available}</TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => handleRemoveLine(idx)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              !formData.source_warehouse_id ||
              !formData.destination_warehouse_id ||
              formData.lines.length === 0 ||
              loading
            }
          >
            Create Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Transfer Details: {selectedTransfer?.transfer_number}
        </DialogTitle>
        <DialogContent>
          {selectedTransfer && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">From</Typography>
                  <Typography fontWeight={500}>
                    {selectedTransfer.source_warehouse_name} ({selectedTransfer.source_owner_type})
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">To</Typography>
                  <Typography fontWeight={500}>
                    {selectedTransfer.destination_warehouse_name} ({selectedTransfer.destination_owner_type})
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Type</Typography>
                  <Typography>{selectedTransfer.transfer_type === 'material' ? 'Materials' : 'Finished Goods'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip label={selectedTransfer.status} color={statusColors[selectedTransfer.status]} size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Transfer Date</Typography>
                  <Typography>{new Date(selectedTransfer.transfer_date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Requested By</Typography>
                  <Typography>{selectedTransfer.requested_by || '-'}</Typography>
                </Grid>
                {selectedTransfer.completed_by && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Completed By</Typography>
                      <Typography>{selectedTransfer.completed_by}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Completed At</Typography>
                      <Typography>{new Date(selectedTransfer.completed_at).toLocaleString()}</Typography>
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>Items</Divider>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell>Unit</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedTransfer.lines?.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>{line.material_code || line.finished_good_code}</TableCell>
                            <TableCell>{line.material_name || line.finished_good_name}</TableCell>
                            <TableCell align="right">{parseFloat(line.quantity).toFixed(2)}</TableCell>
                            <TableCell>{line.unit_of_measure || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                {selectedTransfer.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Notes</Typography>
                    <Typography>{selectedTransfer.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Transfer</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will move inventory from the source warehouse to the destination warehouse. This action cannot be undone.
          </Alert>
          <TextField
            fullWidth
            label="Completed By"
            value={completedBy}
            onChange={(e) => setCompletedBy(e.target.value)}
            required
            placeholder="Enter your name"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleComplete} disabled={!completedBy.trim() || loading}>
            Complete Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
