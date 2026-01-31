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
  TextField,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  People as ContractorIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { getContractors, createContractor, getContractorInventory, getErrorMessage } from '../api';

export default function ContractorsPage({ contractors = [], onContractorCreated, refreshKey }) {
  const [localContractors, setLocalContractors] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
  });

  // Inventory view
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [inventoryDialog, setInventoryDialog] = useState(false);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    if (contractors.length > 0) {
      setLocalContractors(contractors);
    } else {
      loadContractors();
    }
  }, [contractors, refreshKey]);

  const loadContractors = async () => {
    try {
      setLoading(true);
      const res = await getContractors();
      setLocalContractors(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load contractors'));
      setLocalContractors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({ code: '', name: '' });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({ code: '', name: '' });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await createContractor(formData);
      setSuccess('Contractor created successfully');
      handleCloseDialog();
      if (onContractorCreated) {
        onContractorCreated();
      } else {
        loadContractors();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create contractor'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewInventory = async (contractor) => {
    try {
      setSelectedContractor(contractor);
      const res = await getContractorInventory(contractor.id);
      setInventory(res.data || []);
      setInventoryDialog(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load inventory'));
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

      {/* Summary Cards */}
      <Grid size={12}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Contractors
                </Typography>
                <Typography variant="h4">
                  {localContractors.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Active
                </Typography>
                <Typography variant="h4" color="success.main">
                  {localContractors.filter(c => c.is_active !== false).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  With Inventory
                </Typography>
                <Typography variant="h4" color="info.main">
                  {localContractors.filter(c => c.total_materials > 0).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ContractorIcon color="primary" />
              <Typography variant="h6">Contractors</Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              Add Contractor
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="center">Materials</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {localContractors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No contractors found. Click "Add Contractor" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  localContractors.map((contractor) => (
                    <TableRow key={contractor.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {contractor.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{contractor.name}</TableCell>
                      <TableCell align="center">
                        {contractor.total_materials > 0 ? (
                          <Chip
                            label={`${contractor.total_materials} items`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            None
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={contractor.is_active !== false ? 'Active' : 'Inactive'}
                          color={contractor.is_active !== false ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<InventoryIcon />}
                          onClick={() => handleViewInventory(contractor)}
                        >
                          View Inventory
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

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Contractor</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Contractor Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              fullWidth
              placeholder="e.g., CON-001"
            />
            <TextField
              label="Contractor Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.code || !formData.name || loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inventory Dialog */}
      <Dialog open={inventoryDialog} onClose={() => setInventoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Inventory: {selectedContractor?.name} ({selectedContractor?.code})
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material Code</TableCell>
                  <TableCell>Material Name</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No inventory items
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.material_code}</TableCell>
                      <TableCell>{item.material_name}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={500}>
                          {item.quantity?.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInventoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
