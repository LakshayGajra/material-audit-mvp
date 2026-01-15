import { useState } from 'react';
import {
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { issueMaterial } from '../api';

export default function IssueMaterialForm({ contractors, materials, onSuccess }) {
  const [contractorId, setContractorId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await issueMaterial({
        contractor_id: parseInt(contractorId),
        material_id: parseInt(materialId),
        quantity: parseFloat(quantity),
      });
      setSuccess('Material issued successfully!');
      setContractorId('');
      setMaterialId('');
      setQuantity('');
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to issue material');
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Issue Material
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Contractor</InputLabel>
          <Select
            value={contractorId}
            label="Contractor"
            onChange={(e) => setContractorId(e.target.value)}
            required
          >
            {contractors.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.code} - {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Material</InputLabel>
          <Select
            value={materialId}
            label="Material"
            onChange={(e) => setMaterialId(e.target.value)}
            required
          >
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.code} - {m.name} ({m.unit})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          sx={{ mb: 2 }}
          inputProps={{ min: 0, step: 0.01 }}
        />

        <Button type="submit" variant="contained" fullWidth>
          Issue Material
        </Button>
      </Box>
    </Paper>
  );
}
