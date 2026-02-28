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
  Tooltip,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Check as CheckIcon,
  CheckCircle as CompleteIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import {
  getFGRs,
  createFGR,
  getFGR,
  submitFGR,
  inspectFGR,
  completeFGR,
  getContractors,
  getWarehouses,
  getFinishedGoods,
  getContractorPendingDeliveries,
  getErrorMessage,
} from '../api';
import { DataTable } from './common';
import useAutoDismiss from '../hooks/useAutoDismiss';

const STATUS_COLORS = {
  draft: 'default',
  submitted: 'info',
  inspected: 'warning',
  completed: 'success',
  rejected: 'error',
};

export default function FinishedGoodsReceiptPage({ refreshKey }) {
  const [fgrs, setFGRs] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useAutoDismiss(success, setSuccess);
  const [statusFilter, setStatusFilter] = useState('');
  const [subTab, setSubTab] = useState(0);

  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [inspectDialog, setInspectDialog] = useState(false);
  const [selectedFGR, setSelectedFGR] = useState(null);

  // Form states
  const [newFGR, setNewFGR] = useState({
    contractor_id: '',
    warehouse_id: '',
    receipt_date: new Date().toISOString().split('T')[0],
    received_by: '',
    notes: '',
    lines: [],
  });
  const [newLine, setNewLine] = useState({ finished_good_id: '', quantity_delivered: '' });
  const [inspectData, setInspectData] = useState({
    inspected_by: '',
    inspection_notes: '',
    lines: [],
  });

  useEffect(() => {
    loadFGRs();
    loadContractors();
    loadWarehouses();
    loadFinishedGoods();
  }, [refreshKey]);

  useEffect(() => {
    if (newFGR.contractor_id) {
      loadPendingDeliveries(newFGR.contractor_id);
    } else {
      setPendingDeliveries([]);
    }
  }, [newFGR.contractor_id]);

  const loadFGRs = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await getFGRs(params);
      setFGRs(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load FGRs'));
      setFGRs([]);
    }
  };

  const loadContractors = async () => {
    try {
      const res = await getContractors();
      setContractors(res.data?.items || res.data || []);
    } catch (err) {
      console.error('Failed to load contractors', err);
      setContractors([]);
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

  const loadFinishedGoods = async () => {
    try {
      const res = await getFinishedGoods();
      setFinishedGoods(res.data?.items || res.data || []);
    } catch (err) {
      console.error('Failed to load finished goods', err);
      setFinishedGoods([]);
    }
  };

  const loadPendingDeliveries = async (contractorId) => {
    try {
      const res = await getContractorPendingDeliveries(contractorId);
      setPendingDeliveries(res.data || []);
    } catch (err) {
      console.error('Failed to load pending deliveries', err);
      setPendingDeliveries([]);
    }
  };

  const handleCreateFGR = async () => {
    try {
      const data = {
        contractor_id: parseInt(newFGR.contractor_id),
        warehouse_id: parseInt(newFGR.warehouse_id),
        receipt_date: newFGR.receipt_date,
        received_by: newFGR.received_by || null,
        notes: newFGR.notes || null,
        lines: newFGR.lines.map((line) => ({
          finished_good_id: parseInt(line.finished_good_id),
          quantity_delivered: parseFloat(line.quantity_delivered),
        })),
      };
      await createFGR(data);
      setSuccess('FGR created successfully');
      setCreateDialog(false);
      setNewFGR({
        contractor_id: '',
        warehouse_id: '',
        receipt_date: new Date().toISOString().split('T')[0],
        received_by: '',
        notes: '',
        lines: [],
      });
      loadFGRs();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create FGR'));
    }
  };

  const handleAddLine = () => {
    if (newLine.finished_good_id && newLine.quantity_delivered) {
      // Check for duplicates
      if (newFGR.lines.some((l) => l.finished_good_id === newLine.finished_good_id)) {
        setError('This finished good is already added');
        return;
      }
      setNewFGR({
        ...newFGR,
        lines: [...newFGR.lines, { ...newLine }],
      });
      setNewLine({ finished_good_id: '', quantity_delivered: '' });
    }
  };

  const handleRemoveLine = (index) => {
    setNewFGR({
      ...newFGR,
      lines: newFGR.lines.filter((_, i) => i !== index),
    });
  };

  const handleViewFGR = async (fgrId) => {
    try {
      const res = await getFGR(fgrId);
      setSelectedFGR(res.data);
      setViewDialog(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load FGR'));
    }
  };

  const handleSubmitFGR = async (fgrId) => {
    try {
      await submitFGR(fgrId);
      setSuccess('FGR submitted for inspection');
      loadFGRs();
      if (selectedFGR?.id === fgrId) {
        handleViewFGR(fgrId);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit FGR'));
    }
  };

  const openInspectDialog = () => {
    if (selectedFGR) {
      setInspectData({
        inspected_by: '',
        inspection_notes: '',
        lines: selectedFGR.lines.map((line) => ({
          line_id: line.id,
          finished_good_code: line.finished_good_code,
          finished_good_name: line.finished_good_name,
          quantity_delivered: line.quantity_delivered,
          quantity_accepted: line.quantity_delivered,
          quantity_rejected: 0,
          rejection_reason: '',
        })),
      });
      setInspectDialog(true);
    }
  };

  const handleInspectFGR = async () => {
    try {
      const data = {
        inspected_by: inspectData.inspected_by,
        inspection_notes: inspectData.inspection_notes || null,
        lines: inspectData.lines.map((line) => ({
          line_id: line.line_id,
          quantity_accepted: parseFloat(line.quantity_accepted),
          quantity_rejected: parseFloat(line.quantity_rejected) || 0,
          rejection_reason: line.rejection_reason || null,
        })),
      };
      await inspectFGR(selectedFGR.id, data);
      setSuccess('FGR inspection completed');
      setInspectDialog(false);
      handleViewFGR(selectedFGR.id);
      loadFGRs();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit inspection'));
    }
  };

  const handleCompleteFGR = async (fgrId) => {
    try {
      await completeFGR(fgrId);
      setSuccess('FGR completed - BOM deducted from contractor inventory');
      loadFGRs();
      if (selectedFGR?.id === fgrId) {
        handleViewFGR(fgrId);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to complete FGR'));
    }
  };

  const handleAddFromPending = (pending) => {
    if (newFGR.lines.some((l) => l.finished_good_id === String(pending.finished_good_id))) {
      setError('This finished good is already added');
      return;
    }
    setNewFGR({
      ...newFGR,
      lines: [
        ...newFGR.lines,
        {
          finished_good_id: String(pending.finished_good_id),
          quantity_delivered: String(pending.pending_quantity),
        },
      ],
    });
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
            <Typography variant="h6">Finished Goods Receipts</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
            >
              New FGR
            </Button>
          </Box>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              label="Filter by Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setTimeout(loadFGRs, 0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="inspected">Inspected</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Grid>

      {/* FGR List */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <DataTable
            columns={[
              { id: 'fgr_number', label: 'FGR Number' },
              { id: 'contractor_name', label: 'Contractor' },
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
              { id: 'receipt_date', label: 'Receipt Date' },
              {
                id: 'total_quantity_delivered',
                label: 'Total Delivered',
                align: 'right',
                render: (val) => val?.toLocaleString(),
              },
              {
                id: 'total_quantity_accepted',
                label: 'Total Accepted',
                align: 'right',
                render: (val) => val !== null ? val?.toLocaleString() : '-',
              },
            ]}
            data={fgrs}
            searchPlaceholder="Search FGRs..."
            searchFields={['fgr_number', 'contractor_name', 'warehouse_name', 'status']}
            renderRowActions={(fgr) => (
              <>
                <Tooltip title="View details">
                  <IconButton size="small" onClick={() => handleViewFGR(fgr.id)}>
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                {fgr.status === 'draft' && (
                  <Tooltip title="Submit for inspection">
                    <IconButton size="small" onClick={() => handleSubmitFGR(fgr.id)}>
                      <SendIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                )}
                {fgr.status === 'inspected' && (
                  <Tooltip title="Complete FGR">
                    <IconButton size="small" onClick={() => handleCompleteFGR(fgr.id)}>
                      <CompleteIcon color="success" />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
            emptyState={{
              icon: AssignmentIcon,
              title: 'No finished goods receipts',
              description: 'Create a new FGR to receive finished goods from contractors.',
              actionLabel: 'New FGR',
              onAction: () => setCreateDialog(true),
            }}
          />
        </Paper>
      </Grid>

      {/* Create FGR Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Finished Goods Receipt</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <FormControl fullWidth required>
                  <InputLabel>Contractor</InputLabel>
                  <Select
                    value={newFGR.contractor_id}
                    label="Contractor"
                    onChange={(e) => setNewFGR({ ...newFGR, contractor_id: e.target.value, lines: [] })}
                  >
                    {contractors.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <FormControl fullWidth required>
                  <InputLabel>Receiving Warehouse</InputLabel>
                  <Select
                    value={newFGR.warehouse_id}
                    label="Receiving Warehouse"
                    onChange={(e) => setNewFGR({ ...newFGR, warehouse_id: e.target.value })}
                  >
                    {warehouses.map((w) => (
                      <MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Receipt Date"
                  type="date"
                  value={newFGR.receipt_date}
                  onChange={(e) => setNewFGR({ ...newFGR, receipt_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Received By"
                  value={newFGR.received_by}
                  onChange={(e) => setNewFGR({ ...newFGR, received_by: e.target.value })}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={newFGR.notes}
                  onChange={(e) => setNewFGR({ ...newFGR, notes: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>

            {/* Pending Deliveries */}
            {pendingDeliveries.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Pending Deliveries from Contractor
                </Typography>
                <TableContainer sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Finished Good</TableCell>
                        <TableCell align="right">Produced</TableCell>
                        <TableCell align="right">Received</TableCell>
                        <TableCell align="right">Pending</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingDeliveries.map((pd) => (
                        <TableRow key={pd.finished_good_id}>
                          <TableCell>{pd.finished_good_code} - {pd.finished_good_name}</TableCell>
                          <TableCell align="right">{pd.total_produced}</TableCell>
                          <TableCell align="right">{pd.total_received}</TableCell>
                          <TableCell align="right">{pd.pending_quantity}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => handleAddFromPending(pd)}
                              disabled={newFGR.lines.some((l) => l.finished_good_id === String(pd.finished_good_id))}
                            >
                              Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1">Line Items</Typography>

            <Grid container spacing={2} alignItems="center">
              <Grid size={6}>
                <FormControl fullWidth>
                  <InputLabel>Finished Good</InputLabel>
                  <Select
                    value={newLine.finished_good_id}
                    label="Finished Good"
                    onChange={(e) => setNewLine({ ...newLine, finished_good_id: e.target.value })}
                  >
                    {finishedGoods.map((fg) => (
                      <MenuItem key={fg.id} value={fg.id}>{fg.code} - {fg.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Quantity Delivered"
                  type="number"
                  value={newLine.quantity_delivered}
                  onChange={(e) => setNewLine({ ...newLine, quantity_delivered: e.target.value })}
                  inputProps={{ min: 0, step: 0.001 }}
                />
              </Grid>
              <Grid size={2}>
                <Button variant="outlined" onClick={handleAddLine} fullWidth>Add</Button>
              </Grid>
            </Grid>

            {newFGR.lines.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Finished Good</TableCell>
                      <TableCell align="right">Quantity Delivered</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {newFGR.lines.map((line, idx) => {
                      const fg = finishedGoods.find((f) => f.id === parseInt(line.finished_good_id));
                      return (
                        <TableRow key={idx}>
                          <TableCell>{fg?.code} - {fg?.name}</TableCell>
                          <TableCell align="right">{line.quantity_delivered}</TableCell>
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
            onClick={handleCreateFGR}
            variant="contained"
            disabled={!newFGR.contractor_id || !newFGR.warehouse_id || newFGR.lines.length === 0}
          >
            Create FGR
          </Button>
        </DialogActions>
      </Dialog>

      {/* View FGR Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          FGR: {selectedFGR?.fgr_number}
          <Chip
            label={selectedFGR?.status}
            color={STATUS_COLORS[selectedFGR?.status] || 'default'}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedFGR && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Contractor</Typography>
                  <Typography>{selectedFGR.contractor_code} - {selectedFGR.contractor_name}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Warehouse</Typography>
                  <Typography>{selectedFGR.warehouse_name}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Receipt Date</Typography>
                  <Typography>{selectedFGR.receipt_date}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Received By</Typography>
                  <Typography>{selectedFGR.received_by || 'N/A'}</Typography>
                </Grid>
                {selectedFGR.inspected_by && (
                  <>
                    <Grid size={6}>
                      <Typography variant="body2" color="text.secondary">Inspected By</Typography>
                      <Typography>{selectedFGR.inspected_by}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" color="text.secondary">Inspection Date</Typography>
                      <Typography>{selectedFGR.inspection_date}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>

              <Typography variant="subtitle1" sx={{ mb: 1 }}>Line Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Finished Good</TableCell>
                      <TableCell align="right">Delivered</TableCell>
                      <TableCell align="right">Accepted</TableCell>
                      <TableCell align="right">Rejected</TableCell>
                      <TableCell>BOM Deducted</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedFGR.lines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.finished_good_code} - {line.finished_good_name}</TableCell>
                        <TableCell align="right">{line.quantity_delivered}</TableCell>
                        <TableCell align="right">{line.quantity_accepted ?? '-'}</TableCell>
                        <TableCell align="right">{line.quantity_rejected || '-'}</TableCell>
                        <TableCell>
                          {line.bom_deducted ? (
                            <Chip label="Yes" color="success" size="small" />
                          ) : (
                            <Chip label="No" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedFGR.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Notes</Typography>
                  <Typography>{selectedFGR.notes}</Typography>
                </Box>
              )}
              {selectedFGR.inspection_notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Inspection Notes</Typography>
                  <Typography>{selectedFGR.inspection_notes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedFGR?.status === 'draft' && (
            <Button onClick={() => handleSubmitFGR(selectedFGR.id)} startIcon={<SendIcon />}>
              Submit
            </Button>
          )}
          {selectedFGR?.status === 'submitted' && (
            <Button onClick={openInspectDialog} color="primary" startIcon={<CheckIcon />}>
              Inspect
            </Button>
          )}
          {selectedFGR?.status === 'inspected' && (
            <Button onClick={() => handleCompleteFGR(selectedFGR.id)} color="success" startIcon={<CompleteIcon />}>
              Complete
            </Button>
          )}
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Inspect Dialog */}
      <Dialog open={inspectDialog} onClose={() => setInspectDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Inspect FGR: {selectedFGR?.fgr_number}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Inspected By"
              value={inspectData.inspected_by}
              onChange={(e) => setInspectData({ ...inspectData, inspected_by: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Inspection Notes"
              value={inspectData.inspection_notes}
              onChange={(e) => setInspectData({ ...inspectData, inspection_notes: e.target.value })}
              multiline
              rows={2}
            />

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Finished Good</TableCell>
                    <TableCell align="right">Delivered</TableCell>
                    <TableCell align="right">Accepted</TableCell>
                    <TableCell align="right">Rejected</TableCell>
                    <TableCell>Rejection Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inspectData.lines.map((line, idx) => (
                    <TableRow key={line.line_id}>
                      <TableCell>{line.finished_good_code} - {line.finished_good_name}</TableCell>
                      <TableCell align="right">{line.quantity_delivered}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={line.quantity_accepted}
                          onChange={(e) => {
                            const newLines = [...inspectData.lines];
                            newLines[idx].quantity_accepted = e.target.value;
                            setInspectData({ ...inspectData, lines: newLines });
                          }}
                          inputProps={{ min: 0, max: line.quantity_delivered, step: 0.001 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={line.quantity_rejected}
                          onChange={(e) => {
                            const newLines = [...inspectData.lines];
                            newLines[idx].quantity_rejected = e.target.value;
                            newLines[idx].quantity_accepted =
                              parseFloat(line.quantity_delivered) - parseFloat(e.target.value || 0);
                            setInspectData({ ...inspectData, lines: newLines });
                          }}
                          inputProps={{ min: 0, max: line.quantity_delivered, step: 0.001 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={line.rejection_reason}
                          onChange={(e) => {
                            const newLines = [...inspectData.lines];
                            newLines[idx].rejection_reason = e.target.value;
                            setInspectData({ ...inspectData, lines: newLines });
                          }}
                          disabled={!parseFloat(line.quantity_rejected)}
                          placeholder="Reason..."
                          sx={{ width: 150 }}
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
          <Button onClick={() => setInspectDialog(false)}>Cancel</Button>
          <Button
            onClick={handleInspectFGR}
            variant="contained"
            disabled={!inspectData.inspected_by}
          >
            Submit Inspection
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
