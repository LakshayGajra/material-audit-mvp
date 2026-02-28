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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Store as SupplierIcon,
} from '@mui/icons-material';
import { getSuppliers, createSupplier, updateSupplier, getErrorMessage } from '../api';
import useAutoDismiss from '../hooks/useAutoDismiss';

export default function SuppliersPage({ refreshKey }) {
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useAutoDismiss(success, setSuccess);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, [refreshKey]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await getSuppliers();
      setSuppliers(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load suppliers'));
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        code: supplier.code || '',
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        code: '',
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSupplier(null);
    setFormData({
      code: '',
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
        setSuccess('Supplier updated successfully');
      } else {
        await createSupplier(formData);
        setSuccess('Supplier created successfully');
      }
      handleCloseDialog();
      loadSuppliers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save supplier'));
    } finally {
      setLoading(false);
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

      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SupplierIcon color="primary" />
              <Typography variant="h6">Suppliers</Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Supplier
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No suppliers found. Click "Add Supplier" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {supplier.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{supplier.name}</TableCell>
                      <TableCell>{supplier.contact_person || '-'}</TableCell>
                      <TableCell>{supplier.email || '-'}</TableCell>
                      <TableCell>{supplier.phone || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={supplier.is_active !== false ? 'Active' : 'Inactive'}
                          color={supplier.is_active !== false ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(supplier)}
                          title="Edit"
                        >
                          <EditIcon fontSize="small" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Supplier Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              fullWidth
              disabled={!!editingSupplier}
              placeholder="e.g., SUP-001"
            />
            <TextField
              label="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Contact Person"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
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
            {editingSupplier ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
