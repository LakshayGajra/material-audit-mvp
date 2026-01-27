import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { getMaterials, createMaterial } from '../api';

const COMMON_UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'ton', label: 'Tons' },
  { value: 'l', label: 'Liters (l)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'sqm', label: 'Square Meters (sqm)' },
  { value: 'cum', label: 'Cubic Meters (cum)' },
  { value: 'bags', label: 'Bags' },
  { value: 'rolls', label: 'Rolls' },
  { value: 'sheets', label: 'Sheets' },
  { value: 'bundles', label: 'Bundles' },
];

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    unit: '',
  });

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const res = await getMaterials();
      setMaterials(res.data || []);
    } catch (err) {
      console.error('Failed to load materials:', err);
      setMaterials([]);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setError('');
    setSuccess('');
    setForm({ code: '', name: '', unit: '' });
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.code.trim() || !form.name.trim() || !form.unit.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createMaterial({
        code: form.code.trim(),
        name: form.name.trim(),
        unit: form.unit.trim(),
      });
      setSuccess('Material created successfully!');
      handleClose();
      loadMaterials();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Materials
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
          >
            Add Material
          </Button>
        </Box>

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Unit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No materials found. Click "Add Material" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.code}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{m.unit}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Material Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Material
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              label="Material Code"
              name="code"
              value={form.code}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
              placeholder="e.g., MAT-001 or CEMENT-50"
              autoFocus
            />
            <TextField
              label="Material Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
              placeholder="e.g., Portland Cement 50kg"
            />
            <TextField
              select
              label="Unit of Measurement"
              name="unit"
              value={form.unit}
              onChange={handleChange}
              fullWidth
              required
              placeholder="Select unit"
            >
              {COMMON_UNITS.map((unit) => (
                <MenuItem key={unit.value} value={unit.value}>
                  {unit.label}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Creating...' : 'Create Material'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
