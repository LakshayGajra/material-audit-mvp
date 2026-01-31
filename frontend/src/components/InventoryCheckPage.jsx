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
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  getInventoryChecks,
  createInventoryCheck,
  getInventoryCheck,
  getCountingView,
  enterCounts,
  saveCountsDraft,
  resolveInventoryCheck,
  getContractors,
  getErrorMessage,
} from '../api';

const STATUS_COLORS = {
  draft: 'default',
  counting: 'warning',
  review: 'info',
  resolved: 'success',
};

const STATUS_LABELS = {
  draft: 'Draft',
  counting: 'Counting',
  review: 'Under Review',
  resolved: 'Resolved',
};

export default function InventoryCheckPage({ refreshKey }) {
  const [view, setView] = useState(0); // 0 = Create/Count, 1 = Review, 2 = History
  const [checks, setChecks] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Create check state
  const [createDialog, setCreateDialog] = useState(false);
  const [newCheck, setNewCheck] = useState({
    contractor_id: '',
    check_type: 'audit',
    is_blind: true,
    check_date: new Date().toISOString().split('T')[0],
    initiated_by: '',
    notes: '',
  });

  // Counting state
  const [countingCheck, setCountingCheck] = useState(null);
  const [counts, setCounts] = useState({});

  // Review state
  const [reviewCheck, setReviewCheck] = useState(null);
  const [resolutions, setResolutions] = useState({});

  // Detail view
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    loadContractors();
    loadChecks();
  }, [refreshKey]);

  useEffect(() => {
    loadChecks();
  }, [view, statusFilter, typeFilter]);

  const loadContractors = async () => {
    try {
      const res = await getContractors();
      setContractors(res.data || []);
    } catch (err) {
      console.error('Failed to load contractors:', err);
    }
  };

  const loadChecks = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.check_type = typeFilter;

      // For review tab, only show checks needing review
      if (view === 1) params.status = 'review';

      const res = await getInventoryChecks(params);
      setChecks(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load inventory checks'));
      setChecks([]);
    }
  };

  // =========== CREATE CHECK ===========

  const handleCreateCheck = async () => {
    try {
      setLoading(true);
      const res = await createInventoryCheck({
        contractor_id: parseInt(newCheck.contractor_id),
        check_type: newCheck.check_type,
        is_blind: newCheck.is_blind,
        check_date: newCheck.check_date,
        initiated_by: newCheck.initiated_by || null,
        notes: newCheck.notes || null,
      });
      setSuccess(`Inventory check ${res.data.check_number} created`);
      setCreateDialog(false);
      setNewCheck({
        contractor_id: '',
        check_type: 'audit',
        is_blind: true,
        check_date: new Date().toISOString().split('T')[0],
        initiated_by: '',
        notes: '',
      });
      // Load the check for counting
      await startCounting(res.data.id);
      loadChecks();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create inventory check'));
    } finally {
      setLoading(false);
    }
  };

  // =========== COUNTING ===========

  const startCounting = async (checkId) => {
    try {
      const res = await getCountingView(checkId);
      setCountingCheck(res.data);
      // Initialize counts
      const initialCounts = {};
      res.data.lines.forEach((line) => {
        initialCounts[line.id] = line.actual_quantity !== null ? line.actual_quantity : '';
      });
      setCounts(initialCounts);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load check for counting'));
    }
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const countsData = Object.entries(counts)
        .filter(([_, qty]) => qty !== '' && qty !== null)
        .map(([lineId, qty]) => ({
          line_id: parseInt(lineId),
          actual_quantity: parseFloat(qty),
        }));

      await saveCountsDraft(countingCheck.id, {
        counted_by: newCheck.initiated_by || 'Auditor',
        counts: countsData,
      });
      setSuccess('Counts saved as draft');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save draft'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCounts = async () => {
    try {
      setLoading(true);
      const countsData = Object.entries(counts)
        .filter(([_, qty]) => qty !== '' && qty !== null)
        .map(([lineId, qty]) => ({
          line_id: parseInt(lineId),
          actual_quantity: parseFloat(qty),
        }));

      if (countsData.length === 0) {
        setError('Please enter at least one count');
        return;
      }

      await enterCounts(countingCheck.id, {
        counted_by: newCheck.initiated_by || 'Auditor',
        counts: countsData,
      });
      setSuccess('Counts submitted for review');
      setCountingCheck(null);
      setCounts({});
      loadChecks();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit counts'));
    } finally {
      setLoading(false);
    }
  };

  // =========== REVIEW ===========

  const startReview = async (checkId) => {
    try {
      const res = await getInventoryCheck(checkId);
      setReviewCheck(res.data);
      // Initialize resolutions
      const initialResolutions = {};
      res.data.lines.forEach((line) => {
        initialResolutions[line.id] = {
          resolution: line.resolution || 'accept',
          notes: line.resolution_notes || '',
        };
      });
      setResolutions(initialResolutions);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load check for review'));
    }
  };

  const handleResolve = async () => {
    try {
      setLoading(true);
      const resolutionsData = Object.entries(resolutions).map(([lineId, data]) => ({
        line_id: parseInt(lineId),
        resolution: data.resolution,
        resolution_notes: data.notes || null,
      }));

      await resolveInventoryCheck(reviewCheck.id, {
        reviewed_by: 'Manager',
        resolutions: resolutionsData,
      });
      setSuccess('Inventory check resolved');
      setReviewCheck(null);
      setResolutions({});
      loadChecks();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resolve check'));
    } finally {
      setLoading(false);
    }
  };

  // =========== DETAIL VIEW ===========

  const viewDetails = async (checkId) => {
    try {
      const res = await getInventoryCheck(checkId);
      setSelectedCheck(res.data);
      setDetailDialog(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load check details'));
    }
  };

  const getVarianceColor = (variance) => {
    if (variance === null || variance === undefined) return 'inherit';
    if (Math.abs(variance) < 0.01) return 'inherit';
    return variance < 0 ? 'error.main' : 'success.main';
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

      {/* View Tabs */}
      <Grid size={12}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs value={view} onChange={(e, v) => setView(v)}>
              <Tab label="Start / Count" />
              <Tab label="Review Queue" />
              <Tab label="History" />
            </Tabs>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={loadChecks} title="Refresh">
                <RefreshIcon />
              </IconButton>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog(true)}
              >
                New Check
              </Button>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* START / COUNT VIEW */}
      {view === 0 && (
        <>
          {countingCheck ? (
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6">
                      {countingCheck.check_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {countingCheck.contractor_name} ({countingCheck.contractor_code}) |
                      Type: {countingCheck.check_type === 'audit' ? 'Audit' : 'Self Report'} |
                      {countingCheck.is_blind ? ' Blind Count' : ' With Expected Values'}
                    </Typography>
                  </Box>
                  <Chip label={STATUS_LABELS[countingCheck.status]} color={STATUS_COLORS[countingCheck.status]} />
                </Box>

                {countingCheck.is_blind && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    This is a blind count. Expected quantities are hidden to ensure unbiased counting.
                  </Alert>
                )}

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Material Code</TableCell>
                        <TableCell>Material Name</TableCell>
                        <TableCell>Unit</TableCell>
                        {!countingCheck.is_blind && (
                          <TableCell align="right">Expected</TableCell>
                        )}
                        <TableCell align="right">Physical Count</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {countingCheck.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.material_code}</TableCell>
                          <TableCell>{line.material_name}</TableCell>
                          <TableCell>{line.material_unit}</TableCell>
                          {!countingCheck.is_blind && (
                            <TableCell align="right">{line.expected_quantity?.toFixed(2)}</TableCell>
                          )}
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={counts[line.id] ?? ''}
                              onChange={(e) =>
                                setCounts({
                                  ...counts,
                                  [line.id]: e.target.value,
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
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveDraft}
                    disabled={loading}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={handleSubmitCounts}
                    disabled={loading}
                  >
                    Submit for Review
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setCountingCheck(null);
                      setCounts({});
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ) : (
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Active Checks</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Inventory checks in counting status. Click to continue counting.
                </Typography>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Check #</TableCell>
                        <TableCell>Contractor</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Blind</TableCell>
                        <TableCell>Check Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {checks.filter(c => c.status === 'counting' || c.status === 'draft').length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            No active checks. Click "New Check" to start one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        checks
                          .filter(c => c.status === 'counting' || c.status === 'draft')
                          .map((check) => (
                            <TableRow key={check.id}>
                              <TableCell>{check.check_number}</TableCell>
                              <TableCell>{check.contractor_name}</TableCell>
                              <TableCell>
                                <Chip
                                  label={check.check_type === 'audit' ? 'Audit' : 'Self Report'}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>{check.is_blind ? 'Yes' : 'No'}</TableCell>
                              <TableCell>{check.check_date}</TableCell>
                              <TableCell>
                                <Chip
                                  label={STATUS_LABELS[check.status]}
                                  color={STATUS_COLORS[check.status]}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  startIcon={<EditIcon />}
                                  onClick={() => startCounting(check.id)}
                                >
                                  Continue
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          )}
        </>
      )}

      {/* REVIEW VIEW */}
      {view === 1 && (
        <>
          {reviewCheck ? (
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6">
                      Review: {reviewCheck.check_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {reviewCheck.contractor_name} | Counted by: {reviewCheck.counted_by} |
                      {reviewCheck.lines_with_variance} lines with variance
                    </Typography>
                  </Box>
                  <Chip label={STATUS_LABELS[reviewCheck.status]} color={STATUS_COLORS[reviewCheck.status]} />
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  Review each variance and decide: Accept (adjust inventory), Keep System (flag as loss), or Investigate.
                </Alert>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Material</TableCell>
                        <TableCell align="right">Expected</TableCell>
                        <TableCell align="right">Actual</TableCell>
                        <TableCell align="right">Variance</TableCell>
                        <TableCell align="right">Variance %</TableCell>
                        <TableCell>Resolution</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reviewCheck.lines.map((line) => {
                        const hasVariance = line.variance && Math.abs(parseFloat(line.variance)) > 0.01;
                        return (
                          <TableRow
                            key={line.id}
                            sx={{ bgcolor: hasVariance ? 'rgba(255, 152, 0, 0.1)' : 'inherit' }}
                          >
                            <TableCell>
                              {line.material_code} - {line.material_name}
                            </TableCell>
                            <TableCell align="right">{parseFloat(line.expected_quantity).toFixed(2)}</TableCell>
                            <TableCell align="right">{parseFloat(line.actual_quantity).toFixed(2)}</TableCell>
                            <TableCell align="right">
                              <Typography color={getVarianceColor(parseFloat(line.variance))}>
                                {parseFloat(line.variance).toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography color={hasVariance ? 'warning.main' : 'inherit'}>
                                {line.variance_percent ? parseFloat(line.variance_percent).toFixed(1) : 0}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={resolutions[line.id]?.resolution || 'accept'}
                                onChange={(e) =>
                                  setResolutions({
                                    ...resolutions,
                                    [line.id]: {
                                      ...resolutions[line.id],
                                      resolution: e.target.value,
                                    },
                                  })
                                }
                                sx={{ minWidth: 120 }}
                              >
                                <MenuItem value="accept">Accept Count</MenuItem>
                                <MenuItem value="keep_system">Keep System</MenuItem>
                                <MenuItem value="investigate">Investigate</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                placeholder="Notes..."
                                value={resolutions[line.id]?.notes || ''}
                                onChange={(e) =>
                                  setResolutions({
                                    ...resolutions,
                                    [line.id]: {
                                      ...resolutions[line.id],
                                      notes: e.target.value,
                                    },
                                  })
                                }
                                sx={{ minWidth: 150 }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CheckIcon />}
                    onClick={handleResolve}
                    disabled={loading}
                  >
                    Resolve All
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setReviewCheck(null);
                      setResolutions({});
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ) : (
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Review Queue</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Inventory checks submitted for review. Click to review variances and resolve.
                </Typography>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Check #</TableCell>
                        <TableCell>Contractor</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Counted By</TableCell>
                        <TableCell>Lines</TableCell>
                        <TableCell>Variances</TableCell>
                        <TableCell>Submitted</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {checks.filter(c => c.status === 'review').length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            No checks pending review.
                          </TableCell>
                        </TableRow>
                      ) : (
                        checks
                          .filter(c => c.status === 'review')
                          .map((check) => (
                            <TableRow key={check.id}>
                              <TableCell>{check.check_number}</TableCell>
                              <TableCell>{check.contractor_name}</TableCell>
                              <TableCell>
                                <Chip
                                  label={check.check_type === 'audit' ? 'Audit' : 'Self Report'}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>{check.counted_by}</TableCell>
                              <TableCell>{check.total_lines}</TableCell>
                              <TableCell>
                                {check.lines_with_variance > 0 ? (
                                  <Chip
                                    label={check.lines_with_variance}
                                    color="warning"
                                    size="small"
                                    icon={<WarningIcon />}
                                  />
                                ) : (
                                  <Chip label="0" size="small" color="success" />
                                )}
                              </TableCell>
                              <TableCell>
                                {check.created_at ? new Date(check.created_at).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  onClick={() => startReview(check.id)}
                                >
                                  Review
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          )}
        </>
      )}

      {/* HISTORY VIEW */}
      {view === 2 && (
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Check History</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    size="small"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="counting">Counting</MenuItem>
                    <MenuItem value="review">Review</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={typeFilter}
                    label="Type"
                    size="small"
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="audit">Audit</MenuItem>
                    <MenuItem value="self_report">Self Report</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Check #</TableCell>
                    <TableCell>Contractor</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Check Date</TableCell>
                    <TableCell>Initiated By</TableCell>
                    <TableCell>Lines/Variances</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {checks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No inventory checks found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    checks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell>{check.check_number}</TableCell>
                        <TableCell>{check.contractor_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={check.check_type === 'audit' ? 'Audit' : 'Self Report'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[check.status]}
                            color={STATUS_COLORS[check.status]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{check.check_date}</TableCell>
                        <TableCell>{check.initiated_by || '-'}</TableCell>
                        <TableCell>
                          {check.total_lines}
                          {check.lines_with_variance > 0 && (
                            <Chip
                              label={`${check.lines_with_variance} var`}
                              color="warning"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => viewDetails(check.id)}
                            title="View Details"
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
      )}

      {/* Create Check Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Inventory Check</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Contractor</InputLabel>
              <Select
                value={newCheck.contractor_id}
                label="Contractor"
                onChange={(e) => setNewCheck({ ...newCheck, contractor_id: e.target.value })}
              >
                {contractors.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Check Type</InputLabel>
              <Select
                value={newCheck.check_type}
                label="Check Type"
                onChange={(e) => setNewCheck({ ...newCheck, check_type: e.target.value })}
              >
                <MenuItem value="audit">Audit (Company counts)</MenuItem>
                <MenuItem value="self_report">Self Report (Contractor submits)</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={newCheck.is_blind}
                  onChange={(e) => setNewCheck({ ...newCheck, is_blind: e.target.checked })}
                />
              }
              label="Blind Count (hide expected quantities)"
            />

            <TextField
              label="Check Date"
              type="date"
              value={newCheck.check_date}
              onChange={(e) => setNewCheck({ ...newCheck, check_date: e.target.value })}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="Initiated By"
              value={newCheck.initiated_by}
              onChange={(e) => setNewCheck({ ...newCheck, initiated_by: e.target.value })}
              fullWidth
              placeholder="Your name"
            />

            <TextField
              label="Notes"
              multiline
              rows={2}
              value={newCheck.notes}
              onChange={(e) => setNewCheck({ ...newCheck, notes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateCheck}
            variant="contained"
            disabled={!newCheck.contractor_id || loading}
          >
            Start Check
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedCheck?.check_number}
          <Chip
            label={STATUS_LABELS[selectedCheck?.status]}
            color={STATUS_COLORS[selectedCheck?.status]}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedCheck && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Contractor</Typography>
                  <Typography>{selectedCheck.contractor_name}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Check Type</Typography>
                  <Typography>{selectedCheck.check_type === 'audit' ? 'Audit' : 'Self Report'}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Check Date</Typography>
                  <Typography>{selectedCheck.check_date}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Blind Count</Typography>
                  <Typography>{selectedCheck.is_blind ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Initiated By</Typography>
                  <Typography>{selectedCheck.initiated_by || '-'}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Counted By</Typography>
                  <Typography>{selectedCheck.counted_by || '-'}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Reviewed By</Typography>
                  <Typography>{selectedCheck.reviewed_by || '-'}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="text.secondary">Total Variance</Typography>
                  <Typography>{parseFloat(selectedCheck.total_variance_value || 0).toFixed(2)}</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" gutterBottom>Line Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Expected</TableCell>
                      <TableCell align="right">Actual</TableCell>
                      <TableCell align="right">Variance</TableCell>
                      <TableCell align="right">Variance %</TableCell>
                      <TableCell>Resolution</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedCheck.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.material_code} - {line.material_name}</TableCell>
                        <TableCell align="right">{parseFloat(line.expected_quantity).toFixed(2)}</TableCell>
                        <TableCell align="right">
                          {line.actual_quantity !== null ? parseFloat(line.actual_quantity).toFixed(2) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography color={getVarianceColor(parseFloat(line.variance))}>
                            {line.variance !== null ? parseFloat(line.variance).toFixed(2) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {line.variance_percent !== null ? `${parseFloat(line.variance_percent).toFixed(1)}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {line.resolution ? (
                            <Chip
                              label={line.resolution}
                              size="small"
                              color={line.resolution === 'accept' ? 'success' : line.resolution === 'investigate' ? 'warning' : 'default'}
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell>{line.resolution_notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
