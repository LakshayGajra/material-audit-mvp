import { useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { createContractor, getErrorMessage } from '../api';

export default function ContractorList({ contractors, onContractorCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    phone: '',
  });

  const handleOpen = () => {
    setOpen(true);
    setError('');
    setForm({ code: '', name: '', phone: '' });
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

    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and Name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createContractor({
        code: form.code.trim(),
        name: form.name.trim(),
        phone: form.phone.trim() || null,
      });
      handleClose();
      onContractorCreated?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create contractor'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Contractors
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Add Contractor
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contractors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No contractors found
                </TableCell>
              </TableRow>
            ) : (
              contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.phone || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Contractor Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add New Contractor
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
              label="Contractor Code"
              name="code"
              value={form.code}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
              placeholder="e.g., CONT-001"
              autoFocus
            />
            <TextField
              label="Contractor Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
              placeholder="e.g., ABC Construction"
            />
            <TextField
              label="Phone (Optional)"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              fullWidth
              placeholder="e.g., +91 9876543210"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Creating...' : 'Create Contractor'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}
