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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  getThresholds,
  createThreshold,
  updateThreshold,
  deleteThreshold,
} from '../api';

export default function ThresholdsPage({ contractors, materials, refreshKey }) {
  const [thresholds, setThresholds] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [contractorFilter, setContractorFilter] = useState('');

  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedThreshold, setSelectedThreshold] = useState(null);

  // Form states
  const [newThreshold, setNewThreshold] = useState({
    material_id: '',
    contractor_id: '',
    threshold_percentage: '',
    notes: '',
  });

  useEffect(() => {
    loadThresholds();
  }, [refreshKey]);

  const loadThresholds = async () => {
    try {
      const params = {};
      if (materialFilter) params.material_id = materialFilter;
      if (contractorFilter) params.contractor_id = contractorFilter;
      const res = await getThresholds(params);
      setThresholds(res.data?.items || res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load thresholds');
      setThresholds([]);
    }
  };

  const handleCreateThreshold = async () => {
    try {
      const data = {
        material_id: parseInt(newThreshold.material_id),
        contractor_id: newThreshold.contractor_id ? parseInt(newThreshold.contractor_id) : null,
        threshold_percentage: parseFloat(newThreshold.threshold_percentage),
        notes: newThreshold.notes || null,
      };
      await createThreshold(data, 'Admin');
      setSuccess('Threshold created successfully');
      setCreateDialog(false);
      setNewThreshold({ material_id: '', contractor_id: '', threshold_percentage: '', notes: '' });
      loadThresholds();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create threshold');
    }
  };

  const handleEditThreshold = async () => {
    try {
      const data = {
        threshold_percentage: parseFloat(selectedThreshold.threshold_percentage),
        notes: selectedThreshold.notes || null,
      };
      await updateThreshold(selectedThreshold.id, data, 'Admin');
      setSuccess('Threshold updated successfully');
      setEditDialog(false);
      setSelectedThreshold(null);
      loadThresholds();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update threshold');
    }
  };

  const handleDeleteThreshold = async (id) => {
    if (!confirm('Are you sure you want to delete this threshold?')) return;
    try {
      await deleteThreshold(id);
      setSuccess('Threshold deleted successfully');
      loadThresholds();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete threshold');
    }
  };

  const openEditDialog = (threshold) => {
    setSelectedThreshold({ ...threshold });
    setEditDialog(true);
  };

  const getMaterialName = (materialId) => {
    const mat = materials.find((m) => m.id === materialId);
    return mat ? `${mat.code} - ${mat.name}` : 'Unknown';
  };

  const getContractorName = (contractorId) => {
    if (!contractorId) return 'All Contractors (Default)';
    const c = contractors.find((c) => c.id === contractorId);
    return c ? c.name : 'Unknown';
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
            <Box>
              <Typography variant="h6">Variance Thresholds</Typography>
              <Typography variant="body2" color="text.secondary">
                Set acceptable variance percentages for audits and reconciliations.
                Default system threshold is 2%.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
            >
              Add Threshold
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Material</InputLabel>
              <Select
                value={materialFilter}
                label="Filter by Material"
                onChange={(e) => {
                  setMaterialFilter(e.target.value);
                  setTimeout(loadThresholds, 0);
                }}
              >
                <MenuItem value="">All Materials</MenuItem>
                {materials.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.code} - {m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Contractor</InputLabel>
              <Select
                value={contractorFilter}
                label="Filter by Contractor"
                onChange={(e) => {
                  setContractorFilter(e.target.value);
                  setTimeout(loadThresholds, 0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="defaults">Defaults Only</MenuItem>
                {contractors.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>
      </Grid>

      {/* Threshold List */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell>Contractor</TableCell>
                  <TableCell align="right">Threshold %</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {thresholds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No thresholds configured. System default (2%) will be used.
                    </TableCell>
                  </TableRow>
                ) : (
                  thresholds.map((threshold) => (
                    <TableRow key={threshold.id}>
                      <TableCell>{getMaterialName(threshold.material_id)}</TableCell>
                      <TableCell>
                        {threshold.contractor_id ? (
                          getContractorName(threshold.contractor_id)
                        ) : (
                          <Chip label="Default" size="small" color="info" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold">{threshold.threshold_percentage}%</Typography>
                      </TableCell>
                      <TableCell>{threshold.notes || '-'}</TableCell>
                      <TableCell>{threshold.created_by}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openEditDialog(threshold)} title="Edit">
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteThreshold(threshold.id)}
                          title="Delete"
                          color="error"
                        >
                          <DeleteIcon />
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

      {/* Info Card */}
      <Grid size={12}>
        <Paper sx={{ p: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
          <Typography variant="subtitle1" gutterBottom>How Thresholds Work</Typography>
          <Typography variant="body2">
            1. <strong>Contractor-specific threshold</strong>: Applied first if set for a specific contractor + material combination.<br />
            2. <strong>Material default threshold</strong>: Applied if no contractor-specific threshold exists.<br />
            3. <strong>System default (2%)</strong>: Applied if no other thresholds are configured.<br /><br />
            Variances exceeding the threshold are flagged as anomalies requiring manager review.
          </Typography>
        </Paper>
      </Grid>

      {/* Create Threshold Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Variance Threshold</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Material</InputLabel>
              <Select
                value={newThreshold.material_id}
                label="Material"
                onChange={(e) => setNewThreshold({ ...newThreshold, material_id: e.target.value })}
              >
                {materials.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.code} - {m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Contractor (Optional)</InputLabel>
              <Select
                value={newThreshold.contractor_id}
                label="Contractor (Optional)"
                onChange={(e) => setNewThreshold({ ...newThreshold, contractor_id: e.target.value })}
              >
                <MenuItem value="">None (Default for all contractors)</MenuItem>
                {contractors.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Threshold Percentage"
              type="number"
              value={newThreshold.threshold_percentage}
              onChange={(e) => setNewThreshold({ ...newThreshold, threshold_percentage: e.target.value })}
              required
              fullWidth
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText="Variance above this percentage will be flagged as anomaly"
            />

            <TextField
              label="Notes"
              multiline
              rows={2}
              value={newThreshold.notes}
              onChange={(e) => setNewThreshold({ ...newThreshold, notes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateThreshold}
            variant="contained"
            disabled={!newThreshold.material_id || !newThreshold.threshold_percentage}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Threshold Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Threshold</DialogTitle>
        <DialogContent>
          {selectedThreshold && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Material"
                value={getMaterialName(selectedThreshold.material_id)}
                fullWidth
                disabled
              />

              <TextField
                label="Contractor"
                value={getContractorName(selectedThreshold.contractor_id)}
                fullWidth
                disabled
              />

              <TextField
                label="Threshold Percentage"
                type="number"
                value={selectedThreshold.threshold_percentage}
                onChange={(e) =>
                  setSelectedThreshold({ ...selectedThreshold, threshold_percentage: e.target.value })
                }
                required
                fullWidth
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />

              <TextField
                label="Notes"
                multiline
                rows={2}
                value={selectedThreshold.notes || ''}
                onChange={(e) =>
                  setSelectedThreshold({ ...selectedThreshold, notes: e.target.value })
                }
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditThreshold} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
