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
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  LocalShipping as ReceiveIcon,
} from '@mui/icons-material';
import {
  getRejections,
  createRejection,
  getRejection,
  approveRejection,
  disputeRejection,
  receiveRejection,
  getWarehouses,
  getErrorMessage,
} from '../api';

const STATUS_COLORS = {
  REPORTED: 'warning',
  APPROVED: 'info',
  DISPUTED: 'error',
  IN_TRANSIT: 'info',
  RECEIVED: 'success',
  CLOSED: 'default',
};

export default function RejectionsPage({ contractors, materials, refreshKey }) {
  const [rejections, setRejections] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [contractorFilter, setContractorFilter] = useState('');

  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedRejection, setSelectedRejection] = useState(null);

  // Form states
  const [newRejection, setNewRejection] = useState({
    contractor_id: '',
    material_id: '',
    quantity: '',
    rejection_reason: '',
    notes: '',
  });

  // Action form states
  const [approvalData, setApprovalData] = useState({
    return_warehouse_id: '',
    notes: '',
  });
  const [disputeReason, setDisputeReason] = useState('');
  const [receiveData, setReceiveData] = useState({
    received_by: '',
    notes: '',
  });

  useEffect(() => {
    loadRejections();
    loadWarehouses();
  }, [refreshKey]);

  const loadRejections = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (contractorFilter) params.contractor_id = contractorFilter;
      const res = await getRejections(params);
      setRejections(res.data?.items || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load rejections'));
      setRejections([]);
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

  const handleCreateRejection = async () => {
    try {
      const mat = (materials || []).find((m) => m.id === parseInt(newRejection.material_id));
      await createRejection({
        contractor_id: parseInt(newRejection.contractor_id),
        material_id: parseInt(newRejection.material_id),
        quantity_rejected: parseFloat(newRejection.quantity),
        unit_of_measure: mat?.unit || 'pcs',
        rejection_date: new Date().toISOString().split('T')[0],
        rejection_reason: newRejection.rejection_reason,
        notes: newRejection.notes || null,
        reported_by: 'Contractor',
      });
      setSuccess('Rejection reported successfully');
      setCreateDialog(false);
      setNewRejection({
        contractor_id: '',
        material_id: '',
        quantity: '',
        rejection_reason: '',
        notes: '',
      });
      loadRejections();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to report rejection'));
    }
  };

  const handleViewRejection = async (rejId) => {
    try {
      const res = await getRejection(rejId);
      setSelectedRejection(res.data);
      setViewDialog(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load rejection'));
    }
  };

  const handleApprove = async () => {
    try {
      await approveRejection(selectedRejection.id, {
        approved_by: 'Manager',
        return_warehouse_id: parseInt(approvalData.return_warehouse_id),
        notes: approvalData.notes || null,
      });
      setSuccess('Rejection approved');
      setApprovalData({ return_warehouse_id: '', notes: '' });
      handleViewRejection(selectedRejection.id);
      loadRejections();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve rejection'));
    }
  };

  const handleDispute = async () => {
    try {
      await disputeRejection(selectedRejection.id, {
        disputed_by: 'Manager',
        reason: disputeReason,
      });
      setSuccess('Rejection disputed');
      setDisputeReason('');
      handleViewRejection(selectedRejection.id);
      loadRejections();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to dispute rejection'));
    }
  };

  const handleReceive = async () => {
    try {
      await receiveRejection(selectedRejection.id, {
        received_by: receiveData.received_by || 'Warehouse',
        notes: receiveData.notes || null,
      });
      setSuccess('Material received at warehouse');
      setReceiveData({ received_by: '', notes: '' });
      handleViewRejection(selectedRejection.id);
      loadRejections();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to receive material'));
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
            <Typography variant="h6">Material Rejections</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
            >
              Report Rejection
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTimeout(loadRejections, 0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="REPORTED">Reported</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="DISPUTED">Disputed</MenuItem>
                <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
                <MenuItem value="RECEIVED">Received</MenuItem>
                <MenuItem value="CLOSED">Closed</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Contractor</InputLabel>
              <Select
                value={contractorFilter}
                label="Filter by Contractor"
                onChange={(e) => {
                  setContractorFilter(e.target.value);
                  setTimeout(loadRejections, 0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                {contractors.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>
      </Grid>

      {/* Rejections List */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rejection #</TableCell>
                  <TableCell>Contractor</TableCell>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rejections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">No rejections</TableCell>
                  </TableRow>
                ) : (
                  rejections.map((rej) => (
                    <TableRow key={rej.id}>
                      <TableCell>{rej.rejection_number}</TableCell>
                      <TableCell>{rej.contractor_name}</TableCell>
                      <TableCell>{rej.material_code} - {rej.material_name}</TableCell>
                      <TableCell align="right">{rej.quantity} {rej.unit_of_measure}</TableCell>
                      <TableCell>{rej.rejection_reason}</TableCell>
                      <TableCell>
                        <Chip
                          label={rej.status}
                          color={STATUS_COLORS[rej.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{rej.rejection_date}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleViewRejection(rej.id)} title="View">
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Create Rejection Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Report Material Rejection</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Contractor</InputLabel>
              <Select
                value={newRejection.contractor_id}
                label="Contractor"
                onChange={(e) => setNewRejection({ ...newRejection, contractor_id: e.target.value })}
              >
                {contractors.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Material</InputLabel>
              <Select
                value={newRejection.material_id}
                label="Material"
                onChange={(e) => setNewRejection({ ...newRejection, material_id: e.target.value })}
              >
                {materials.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.code} - {m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantity"
              type="number"
              value={newRejection.quantity}
              onChange={(e) => setNewRejection({ ...newRejection, quantity: e.target.value })}
              required
              fullWidth
            />

            <FormControl fullWidth required>
              <InputLabel>Rejection Reason</InputLabel>
              <Select
                value={newRejection.rejection_reason}
                label="Rejection Reason"
                onChange={(e) => setNewRejection({ ...newRejection, rejection_reason: e.target.value })}
              >
                <MenuItem value="DEFECTIVE">Defective</MenuItem>
                <MenuItem value="WRONG_MATERIAL">Wrong Material</MenuItem>
                <MenuItem value="DAMAGED">Damaged</MenuItem>
                <MenuItem value="EXPIRED">Expired</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              multiline
              rows={3}
              value={newRejection.notes}
              onChange={(e) => setNewRejection({ ...newRejection, notes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateRejection}
            variant="contained"
            disabled={
              !newRejection.contractor_id ||
              !newRejection.material_id ||
              !newRejection.quantity ||
              !newRejection.rejection_reason
            }
          >
            Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Rejection Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Rejection: {selectedRejection?.rejection_number}
          <Chip
            label={selectedRejection?.status}
            color={STATUS_COLORS[selectedRejection?.status] || 'default'}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedRejection && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Contractor</Typography>
                  <Typography>{selectedRejection.contractor_name}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Material</Typography>
                  <Typography>
                    {selectedRejection.material_code} - {selectedRejection.material_name}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Quantity</Typography>
                  <Typography>{selectedRejection.quantity} {selectedRejection.unit_of_measure}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Rejection Reason</Typography>
                  <Typography>{selectedRejection.rejection_reason}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Reported By</Typography>
                  <Typography>{selectedRejection.reported_by}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Reported Date</Typography>
                  <Typography>{selectedRejection.rejection_date}</Typography>
                </Grid>
                {selectedRejection.notes && (
                  <Grid size={12}>
                    <Typography variant="body2" color="text.secondary">Notes</Typography>
                    <Typography>{selectedRejection.notes}</Typography>
                  </Grid>
                )}
              </Grid>

              {/* Actions based on status */}
              {selectedRejection.status === 'REPORTED' && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Manager Actions</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                    <Box>
                      <FormControl fullWidth required sx={{ mb: 1 }}>
                        <InputLabel>Return Warehouse</InputLabel>
                        <Select
                          value={approvalData.return_warehouse_id}
                          label="Return Warehouse"
                          onChange={(e) => setApprovalData({ ...approvalData, return_warehouse_id: e.target.value })}
                          size="small"
                        >
                          {warehouses.map((w) => (
                            <MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Approval Notes (optional)"
                        value={approvalData.notes}
                        onChange={(e) => setApprovalData({ ...approvalData, notes: e.target.value })}
                        size="small"
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={handleApprove}
                        disabled={!approvalData.return_warehouse_id}
                      >
                        Approve Rejection
                      </Button>
                    </Box>
                    <Box>
                      <TextField
                        label="Dispute Reason (min 10 chars)"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        size="small"
                        fullWidth
                        required
                        sx={{ mb: 1 }}
                      />
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<CloseIcon />}
                        onClick={handleDispute}
                        disabled={!disputeReason || disputeReason.length < 10}
                      >
                        Dispute Rejection
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}

              {(selectedRejection.status === 'APPROVED' || selectedRejection.status === 'IN_TRANSIT') && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Receive at Warehouse</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Return warehouse: {selectedRejection.return_warehouse_name || 'Not specified'}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <TextField
                        label="Received By"
                        value={receiveData.received_by}
                        onChange={(e) => setReceiveData({ ...receiveData, received_by: e.target.value })}
                        fullWidth
                        placeholder="Your name"
                      />
                    </Grid>
                    <Grid size={6}>
                      <TextField
                        label="Notes"
                        value={receiveData.notes}
                        onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={12}>
                      <Button
                        variant="contained"
                        startIcon={<ReceiveIcon />}
                        onClick={handleReceive}
                      >
                        Record Receipt
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
