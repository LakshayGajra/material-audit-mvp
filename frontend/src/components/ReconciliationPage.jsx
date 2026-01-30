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
  Tabs,
  Tab,
  IconButton,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  submitReconciliation,
  getReconciliations,
  getReconciliation,
  reviewReconciliation,
  getPendingReconciliations,
  getContractorReconciliations,
  getContractorInventory,
  getErrorMessage,
} from '../api';

const STATUS_COLORS = {
  SUBMITTED: 'warning',
  ACCEPTED: 'success',
  DISPUTED: 'error',
};

const PERIOD_TYPES = ['WEEKLY', 'MONTHLY', 'AD_HOC'];

export default function ReconciliationPage({ contractors, materials, refreshKey }) {
  const [view, setView] = useState(0); // 0 = Contractor, 1 = Manager
  const [reconciliations, setReconciliations] = useState([]);
  const [pendingReview, setPendingReview] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Contractor state
  const [submitDialog, setSubmitDialog] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState('');
  const [contractorInventory, setContractorInventory] = useState([]);
  const [newReconciliation, setNewReconciliation] = useState({
    period_type: 'WEEKLY',
    period_start: '',
    period_end: '',
    reported_by: '',
    notes: '',
    items: [],
  });

  // Manager state
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedRecon, setSelectedRecon] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [adjustInventory, setAdjustInventory] = useState(true);

  useEffect(() => {
    if (view === 0 && selectedContractor) {
      loadContractorReconciliations();
      loadContractorInventory();
    } else if (view === 1) {
      loadPendingReconciliations();
      loadAllReconciliations();
    }
  }, [view, selectedContractor, refreshKey]);

  const loadContractorReconciliations = async () => {
    if (!selectedContractor) return;
    try {
      const res = await getContractorReconciliations(selectedContractor);
      setReconciliations(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load reconciliations'));
      setReconciliations([]);
    }
  };

  const loadContractorInventory = async () => {
    if (!selectedContractor) return;
    try {
      const res = await getContractorInventory(selectedContractor);
      setContractorInventory(res.data || []);
    } catch (err) {
      console.error('Failed to load inventory', err);
      setContractorInventory([]);
    }
  };

  const loadPendingReconciliations = async () => {
    try {
      const res = await getPendingReconciliations();
      setPendingReview(res.data || []);
    } catch (err) {
      console.error('Failed to load pending reconciliations', err);
      setPendingReview([]);
    }
  };

  const loadAllReconciliations = async () => {
    try {
      const res = await getReconciliations({});
      setReconciliations(res.data?.items || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load reconciliations'));
      setReconciliations([]);
    }
  };

  // Contractor functions
  const openSubmitDialog = () => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setNewReconciliation({
      period_type: 'WEEKLY',
      period_start: weekAgo,
      period_end: today,
      reported_by: '',
      notes: '',
      items: contractorInventory.map((inv) => ({
        material_id: inv.material_id,
        material_code: inv.material_code,
        material_name: inv.material_name,
        system_quantity: inv.quantity,
        reported_quantity: '',
        notes: '',
      })),
    });
    setSubmitDialog(true);
  };

  const handleSubmitReconciliation = async () => {
    try {
      const data = {
        contractor_id: parseInt(selectedContractor),
        reconciliation_date: new Date().toISOString().split('T')[0],
        period_type: newReconciliation.period_type,
        period_start: newReconciliation.period_start,
        period_end: newReconciliation.period_end,
        reported_by: newReconciliation.reported_by,
        notes: newReconciliation.notes || null,
        items: newReconciliation.items
          .filter((item) => item.reported_quantity !== '')
          .map((item) => ({
            material_id: item.material_id,
            reported_quantity: parseFloat(item.reported_quantity),
            notes: item.notes || null,
          })),
      };

      const res = await submitReconciliation(data);
      setSuccess(`Reconciliation ${res.data.reconciliation_number} submitted successfully`);
      setSubmitDialog(false);
      loadContractorReconciliations();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit reconciliation'));
    }
  };

  // Manager functions
  const handleViewReconciliation = async (reconId) => {
    try {
      const res = await getReconciliation(reconId);
      setSelectedRecon(res.data);
      setViewDialog(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load reconciliation'));
    }
  };

  const handleReview = async (status) => {
    try {
      await reviewReconciliation(selectedRecon.id, {
        status,
        reviewed_by: 'Manager',
        adjust_inventory: status === 'ACCEPTED' ? adjustInventory : false,
        notes: reviewNotes || null,
      });
      setSuccess(`Reconciliation ${status.toLowerCase()}`);
      setViewDialog(false);
      setSelectedRecon(null);
      setReviewNotes('');
      loadPendingReconciliations();
      loadAllReconciliations();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to review reconciliation'));
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

      {/* View Toggle */}
      <Grid size={12}>
        <Paper sx={{ p: 2 }}>
          <Tabs value={view} onChange={(e, v) => setView(v)}>
            <Tab label="Contractor Portal" />
            <Tab label="Manager Review" />
          </Tabs>
        </Paper>
      </Grid>

      {/* CONTRACTOR VIEW */}
      {view === 0 && (
        <>
          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Inventory Reconciliation</Typography>
                <FormControl sx={{ minWidth: 300 }}>
                  <InputLabel>Select Contractor</InputLabel>
                  <Select
                    value={selectedContractor}
                    label="Select Contractor"
                    onChange={(e) => setSelectedContractor(e.target.value)}
                  >
                    {contractors.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {selectedContractor && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openSubmitDialog}
                  sx={{ mb: 2 }}
                >
                  Submit Inventory Count
                </Button>
              )}

              {selectedContractor && reconciliations.length > 0 && (
                <>
                  <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>Past Reconciliations</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Reconciliation #</TableCell>
                          <TableCell>Period</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Anomalies</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reconciliations.map((rec) => (
                          <TableRow key={rec.id}>
                            <TableCell>{rec.reconciliation_number}</TableCell>
                            <TableCell>
                              {rec.period_type}: {rec.period_start} to {rec.period_end}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={rec.status}
                                color={STATUS_COLORS[rec.status]}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {rec.total_anomalies > 0 ? (
                                <Chip
                                  label={`${rec.total_anomalies} anomalies`}
                                  color="error"
                                  size="small"
                                  icon={<WarningIcon />}
                                />
                              ) : (
                                <Chip label="None" size="small" />
                              )}
                            </TableCell>
                            <TableCell>{rec.reconciliation_date}</TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => handleViewReconciliation(rec.id)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Paper>
          </Grid>
        </>
      )}

      {/* MANAGER VIEW */}
      {view === 1 && (
        <>
          {/* Pending Review */}
          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Pending Review ({pendingReview.length})
              </Typography>
              {pendingReview.length === 0 ? (
                <Typography color="text.secondary">No reconciliations pending review</Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Reconciliation #</TableCell>
                        <TableCell>Contractor</TableCell>
                        <TableCell>Period</TableCell>
                        <TableCell>Anomalies</TableCell>
                        <TableCell>Submitted</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingReview.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell>{rec.reconciliation_number}</TableCell>
                          <TableCell>{rec.contractor_name}</TableCell>
                          <TableCell>{rec.period_type}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${rec.total_anomalies} anomalies`}
                              color="error"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{rec.reconciliation_date}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleViewReconciliation(rec.id)}
                            >
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* All Reconciliations */}
          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>All Reconciliations</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Reconciliation #</TableCell>
                      <TableCell>Contractor</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Anomalies</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Reviewed By</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reconciliations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">No reconciliations</TableCell>
                      </TableRow>
                    ) : (
                      reconciliations.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell>{rec.reconciliation_number}</TableCell>
                          <TableCell>{rec.contractor_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={rec.status}
                              color={STATUS_COLORS[rec.status]}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{rec.total_anomalies}</TableCell>
                          <TableCell>{rec.reconciliation_date}</TableCell>
                          <TableCell>{rec.reviewed_by || '-'}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleViewReconciliation(rec.id)}
                            >
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
        </>
      )}

      {/* Submit Reconciliation Dialog */}
      <Dialog open={submitDialog} onClose={() => setSubmitDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Submit Inventory Reconciliation</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={3}>
                <FormControl fullWidth>
                  <InputLabel>Period Type</InputLabel>
                  <Select
                    value={newReconciliation.period_type}
                    label="Period Type"
                    onChange={(e) =>
                      setNewReconciliation({ ...newReconciliation, period_type: e.target.value })
                    }
                  >
                    {PERIOD_TYPES.map((pt) => (
                      <MenuItem key={pt} value={pt}>{pt}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={3}>
                <TextField
                  fullWidth
                  label="Period Start"
                  type="date"
                  value={newReconciliation.period_start}
                  onChange={(e) =>
                    setNewReconciliation({ ...newReconciliation, period_start: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  fullWidth
                  label="Period End"
                  type="date"
                  value={newReconciliation.period_end}
                  onChange={(e) =>
                    setNewReconciliation({ ...newReconciliation, period_end: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  fullWidth
                  label="Reported By"
                  value={newReconciliation.reported_by}
                  onChange={(e) =>
                    setNewReconciliation({ ...newReconciliation, reported_by: e.target.value })
                  }
                  required
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1">Enter Physical Counts</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Enter your actual physical inventory counts. Variances will be calculated automatically.
            </Alert>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material Code</TableCell>
                    <TableCell>Material Name</TableCell>
                    <TableCell align="right">System Quantity</TableCell>
                    <TableCell align="right">Physical Count</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {newReconciliation.items.map((item, idx) => (
                    <TableRow key={item.material_id}>
                      <TableCell>{item.material_code}</TableCell>
                      <TableCell>{item.material_name}</TableCell>
                      <TableCell align="right">{item.system_quantity?.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.reported_quantity}
                          onChange={(e) => {
                            const newItems = [...newReconciliation.items];
                            newItems[idx].reported_quantity = e.target.value;
                            setNewReconciliation({ ...newReconciliation, items: newItems });
                          }}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.notes}
                          onChange={(e) => {
                            const newItems = [...newReconciliation.items];
                            newItems[idx].notes = e.target.value;
                            setNewReconciliation({ ...newReconciliation, items: newItems });
                          }}
                          placeholder="Optional notes"
                          sx={{ width: 200 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TextField
              label="General Notes"
              multiline
              rows={2}
              value={newReconciliation.notes}
              onChange={(e) =>
                setNewReconciliation({ ...newReconciliation, notes: e.target.value })
              }
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitReconciliation}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={
              !newReconciliation.reported_by ||
              !newReconciliation.items.some((i) => i.reported_quantity !== '')
            }
          >
            Submit Reconciliation
          </Button>
        </DialogActions>
      </Dialog>

      {/* View/Review Reconciliation Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Reconciliation: {selectedRecon?.reconciliation_number}
          <Chip
            label={selectedRecon?.status}
            color={STATUS_COLORS[selectedRecon?.status]}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedRecon && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={4}>
                  <Typography variant="body2" color="text.secondary">Contractor</Typography>
                  <Typography>{selectedRecon.contractor_name}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="body2" color="text.secondary">Period</Typography>
                  <Typography>
                    {selectedRecon.period_type}: {selectedRecon.period_start} to {selectedRecon.period_end}
                  </Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="body2" color="text.secondary">Reported By</Typography>
                  <Typography>{selectedRecon.reported_by}</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" gutterBottom>Variance Analysis</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">System Qty</TableCell>
                      <TableCell align="right">Reported Qty</TableCell>
                      <TableCell align="right">Variance</TableCell>
                      <TableCell align="right">Variance %</TableCell>
                      <TableCell>Threshold</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRecon.line_items?.map((item) => {
                      const variance = parseFloat(item.variance) || 0;
                      const variancePct = parseFloat(item.variance_percentage) || 0;

                      return (
                        <TableRow
                          key={item.id}
                          sx={{ bgcolor: item.is_anomaly ? 'rgba(255, 152, 0, 0.1)' : 'inherit' }}
                        >
                          <TableCell>{item.material_code} - {item.material_name}</TableCell>
                          <TableCell align="right">{parseFloat(item.system_quantity)?.toFixed(2)}</TableCell>
                          <TableCell align="right">{parseFloat(item.reported_quantity)?.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            <Typography color={variance < 0 ? 'error' : variance > 0 ? 'success.main' : 'inherit'}>
                              {variance.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography color={item.is_anomaly ? 'error' : 'inherit'}>
                              {variancePct.toFixed(2)}%
                            </Typography>
                          </TableCell>
                          <TableCell>{item.threshold_used}%</TableCell>
                          <TableCell>
                            {item.is_anomaly ? (
                              <Chip label="ANOMALY" color="error" size="small" icon={<WarningIcon />} />
                            ) : (
                              <Chip label="OK" color="success" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Review Actions for Manager */}
              {view === 1 && selectedRecon.status === 'SUBMITTED' && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Review Actions</Typography>
                  <TextField
                    label="Review Notes"
                    multiline
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <FormControl>
                      <InputLabel>Adjust Inventory</InputLabel>
                      <Select
                        value={adjustInventory}
                        label="Adjust Inventory"
                        onChange={(e) => setAdjustInventory(e.target.value)}
                        sx={{ minWidth: 200 }}
                      >
                        <MenuItem value={true}>Yes - Update to reported values</MenuItem>
                        <MenuItem value={false}>No - Keep system values</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckIcon />}
                      onClick={() => handleReview('ACCEPTED')}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<CloseIcon />}
                      onClick={() => handleReview('DISPUTED')}
                    >
                      Dispute
                    </Button>
                  </Box>
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
