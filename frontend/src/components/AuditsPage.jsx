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
  Card,
  CardContent,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  startAudit,
  getAuditForAuditor,
  enterAuditCounts,
  submitAudit,
  getAuditAnalysis,
  acceptAuditCounts,
  keepSystemValues,
  closeAudit,
  getAudits,
} from '../api';

const STATUS_COLORS = {
  IN_PROGRESS: 'warning',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

export default function AuditsPage({ contractors, refreshKey }) {
  const [view, setView] = useState(0); // 0 = Auditor, 1 = Manager
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auditor state
  const [startDialog, setStartDialog] = useState(false);
  const [currentAudit, setCurrentAudit] = useState(null);
  const [auditCounts, setAuditCounts] = useState({});

  // Manager state
  const [analysisDialog, setAnalysisDialog] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Form states
  const [newAudit, setNewAudit] = useState({
    contractor_id: '',
    auditor_name: '',
    audit_type: 'SCHEDULED',
    notes: '',
  });

  useEffect(() => {
    if (view === 1) {
      loadAudits();
    }
  }, [view, refreshKey]);

  const loadAudits = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await getAudits(params);
      setAudits(res.data.items || res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load audits');
    }
  };

  // =========== AUDITOR FUNCTIONS ===========

  const handleStartAudit = async () => {
    try {
      const res = await startAudit({
        contractor_id: parseInt(newAudit.contractor_id),
        auditor_name: newAudit.auditor_name,
        audit_type: newAudit.audit_type,
        notes: newAudit.notes || null,
      });
      setSuccess('Audit started successfully');
      setStartDialog(false);
      setNewAudit({ contractor_id: '', auditor_name: '', audit_type: 'SCHEDULED', notes: '' });
      // Load the audit for counting
      await loadAuditForCounting(res.data.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start audit');
    }
  };

  const loadAuditForCounting = async (auditId) => {
    try {
      const res = await getAuditForAuditor(auditId);
      setCurrentAudit(res.data);
      // Initialize counts
      const initialCounts = {};
      res.data.materials.forEach((mat) => {
        initialCounts[mat.material_id] = '';
      });
      setAuditCounts(initialCounts);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load audit');
    }
  };

  const handleSaveCounts = async () => {
    try {
      const counts = Object.entries(auditCounts)
        .filter(([_, qty]) => qty !== '')
        .map(([materialId, qty]) => ({
          material_id: parseInt(materialId),
          physical_quantity: parseFloat(qty),
        }));

      await enterAuditCounts(currentAudit.audit_id, {
        counts,
        counted_by: currentAudit.auditor_name,
      });
      setSuccess('Counts saved');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save counts');
    }
  };

  const handleSubmitAudit = async () => {
    try {
      await submitAudit(currentAudit.audit_id);
      setSuccess('Audit submitted for review');
      setCurrentAudit(null);
      setAuditCounts({});
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit audit');
    }
  };

  // =========== MANAGER FUNCTIONS ===========

  const handleAnalyzeAudit = async (auditId) => {
    try {
      const res = await getAuditAnalysis(auditId);
      setSelectedAnalysis(res.data);
      setAnalysisDialog(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze audit');
    }
  };

  const handleAcceptCounts = async (lineItemId) => {
    try {
      await acceptAuditCounts(selectedAnalysis.audit_id, {
        line_item_ids: [lineItemId],
        approved_by: 'Manager',
      });
      setSuccess('Count accepted, inventory adjusted');
      handleAnalyzeAudit(selectedAnalysis.audit_id);
      loadAudits();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to accept counts');
    }
  };

  const handleKeepSystem = async (lineItemId) => {
    try {
      await keepSystemValues(selectedAnalysis.audit_id, {
        line_item_ids: [lineItemId],
        approved_by: 'Manager',
        reason: 'Keeping system values',
      });
      setSuccess('System values kept');
      handleAnalyzeAudit(selectedAnalysis.audit_id);
      loadAudits();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to keep system values');
    }
  };

  const handleCloseAudit = async () => {
    try {
      await closeAudit(selectedAnalysis.audit_id, { closed_by: 'Manager' });
      setSuccess('Audit closed');
      setAnalysisDialog(false);
      setSelectedAnalysis(null);
      loadAudits();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to close audit');
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
            <Tab label="Auditor View" />
            <Tab label="Manager View" />
          </Tabs>
        </Paper>
      </Grid>

      {/* AUDITOR VIEW */}
      {view === 0 && (
        <>
          {!currentAudit ? (
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Start New Audit</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  As an auditor, you will count physical inventory without seeing expected values.
                  This ensures an unbiased count.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setStartDialog(true)}
                >
                  Start Audit
                </Button>
              </Paper>
            </Grid>
          ) : (
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6">
                      Audit: {currentAudit.audit_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Contractor: {currentAudit.contractor_name} | Auditor: {currentAudit.auditor_name}
                    </Typography>
                  </Box>
                  <Chip label={currentAudit.status} color={STATUS_COLORS[currentAudit.status]} />
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  Enter the physical count for each material. Expected values are hidden to ensure blind counting.
                </Alert>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Material Code</TableCell>
                        <TableCell>Material Name</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell align="right">Physical Count</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentAudit.materials.map((mat) => (
                        <TableRow key={mat.material_id}>
                          <TableCell>{mat.material_code}</TableCell>
                          <TableCell>{mat.material_name}</TableCell>
                          <TableCell>{mat.unit_of_measure}</TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={auditCounts[mat.material_id] || ''}
                              onChange={(e) =>
                                setAuditCounts({
                                  ...auditCounts,
                                  [mat.material_id]: e.target.value,
                                })
                              }
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: 150 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button variant="outlined" onClick={handleSaveCounts}>
                    Save Counts
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={handleSubmitAudit}
                  >
                    Submit for Review
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setCurrentAudit(null);
                      setAuditCounts({});
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Paper>
            </Grid>
          )}
        </>
      )}

      {/* MANAGER VIEW */}
      {view === 1 && (
        <>
          <Grid size={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Audit Management</Typography>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Filter by Status"
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setTimeout(loadAudits, 0);
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                    <MenuItem value="SUBMITTED">Submitted</MenuItem>
                    <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                    <MenuItem value="COMPLETED">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Audit #</TableCell>
                      <TableCell>Contractor</TableCell>
                      <TableCell>Auditor</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Audit Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {audits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">No audits</TableCell>
                      </TableRow>
                    ) : (
                      audits.map((audit) => (
                        <TableRow key={audit.id}>
                          <TableCell>{audit.audit_number}</TableCell>
                          <TableCell>{audit.contractor_name}</TableCell>
                          <TableCell>{audit.auditor_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={audit.status}
                              color={STATUS_COLORS[audit.status]}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{audit.audit_date}</TableCell>
                          <TableCell>
                            {(audit.status === 'SUBMITTED' || audit.status === 'UNDER_REVIEW') && (
                              <IconButton
                                size="small"
                                onClick={() => handleAnalyzeAudit(audit.id)}
                                title="Analyze"
                              >
                                <AssessmentIcon color="primary" />
                              </IconButton>
                            )}
                            {audit.status === 'COMPLETED' && (
                              <IconButton
                                size="small"
                                onClick={() => handleAnalyzeAudit(audit.id)}
                                title="View"
                              >
                                <ViewIcon />
                              </IconButton>
                            )}
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

      {/* Start Audit Dialog */}
      <Dialog open={startDialog} onClose={() => setStartDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Audit</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Contractor</InputLabel>
              <Select
                value={newAudit.contractor_id}
                label="Contractor"
                onChange={(e) => setNewAudit({ ...newAudit, contractor_id: e.target.value })}
              >
                {contractors.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Auditor Name"
              value={newAudit.auditor_name}
              onChange={(e) => setNewAudit({ ...newAudit, auditor_name: e.target.value })}
              required
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Audit Type</InputLabel>
              <Select
                value={newAudit.audit_type}
                label="Audit Type"
                onChange={(e) => setNewAudit({ ...newAudit, audit_type: e.target.value })}
              >
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="SURPRISE">Surprise</MenuItem>
                <MenuItem value="FOLLOW_UP">Follow Up</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              multiline
              rows={2}
              value={newAudit.notes}
              onChange={(e) => setNewAudit({ ...newAudit, notes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartDialog(false)}>Cancel</Button>
          <Button
            onClick={handleStartAudit}
            variant="contained"
            disabled={!newAudit.contractor_id || !newAudit.auditor_name}
          >
            Start Audit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Analysis Dialog (Manager) */}
      <Dialog open={analysisDialog} onClose={() => setAnalysisDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Audit Analysis: {selectedAnalysis?.audit_number}
          <Chip
            label={selectedAnalysis?.status}
            color={STATUS_COLORS[selectedAnalysis?.status]}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedAnalysis && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={4}>
                  <Typography variant="body2" color="text.secondary">Contractor</Typography>
                  <Typography>{selectedAnalysis.contractor_name}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="body2" color="text.secondary">Auditor</Typography>
                  <Typography>{selectedAnalysis.auditor_name}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="body2" color="text.secondary">Audit Date</Typography>
                  <Typography>{selectedAnalysis.audit_date}</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" gutterBottom>Variance Analysis</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Expected</TableCell>
                      <TableCell align="right">Physical</TableCell>
                      <TableCell align="right">Variance</TableCell>
                      <TableCell align="right">Variance %</TableCell>
                      <TableCell>Threshold</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedAnalysis.line_items?.map((item) => {
                      const variance = (item.physical_quantity || 0) - (item.expected_quantity || 0);
                      const variancePct = item.expected_quantity
                        ? ((variance / item.expected_quantity) * 100).toFixed(2)
                        : 0;
                      const isAnomaly = item.is_anomaly;

                      return (
                        <TableRow
                          key={item.id}
                          sx={{ bgcolor: isAnomaly ? 'rgba(255, 152, 0, 0.1)' : 'inherit' }}
                        >
                          <TableCell>
                            {item.material_code} - {item.material_name}
                          </TableCell>
                          <TableCell align="right">{item.expected_quantity?.toFixed(2)}</TableCell>
                          <TableCell align="right">{item.physical_quantity?.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            <Typography color={variance < 0 ? 'error' : variance > 0 ? 'success.main' : 'inherit'}>
                              {variance.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography color={isAnomaly ? 'error' : 'inherit'}>
                              {variancePct}%
                            </Typography>
                          </TableCell>
                          <TableCell>{item.threshold_used}%</TableCell>
                          <TableCell>
                            {isAnomaly ? (
                              <Chip label="ANOMALY" color="error" size="small" icon={<WarningIcon />} />
                            ) : item.resolution_status === 'RESOLVED' ? (
                              <Chip label="Resolved" color="success" size="small" />
                            ) : (
                              <Chip label="OK" color="success" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            {isAnomaly && item.resolution_status !== 'RESOLVED' && (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() => handleAcceptCounts(item.id)}
                                >
                                  Accept Count
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleKeepSystem(item.id)}
                                >
                                  Keep System
                                </Button>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedAnalysis?.status !== 'COMPLETED' && (
            <Button onClick={handleCloseAudit} color="primary" variant="contained">
              Close Audit
            </Button>
          )}
          <Button onClick={() => setAnalysisDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
