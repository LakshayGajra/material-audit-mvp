import { useState, useEffect } from 'react';
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
  Chip,
} from '@mui/material';
import { createIssuance, getWarehouses, getWarehouseInventory } from '../api';

export default function IssueMaterialForm({ contractors, materials, onSuccess }) {
  const [warehouseId, setWarehouseId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [warehouses, setWarehouses] = useState([]);
  const [warehouseInventory, setWarehouseInventory] = useState([]);
  const [availableQty, setAvailableQty] = useState(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (warehouseId) {
      loadWarehouseInventory(warehouseId);
    } else {
      setWarehouseInventory([]);
      setAvailableQty(null);
    }
  }, [warehouseId]);

  useEffect(() => {
    if (materialId && warehouseInventory.length > 0) {
      const item = warehouseInventory.find((i) => i.material_id === parseInt(materialId));
      setAvailableQty(item ? item.current_quantity : 0);
    } else {
      setAvailableQty(null);
    }
  }, [materialId, warehouseInventory]);

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();
      const data = res.data.items || res.data;
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses', err);
    }
  };

  const loadWarehouseInventory = async (whId) => {
    try {
      const res = await getWarehouseInventory(whId);
      setWarehouseInventory(res.data);
    } catch (err) {
      console.error('Failed to load warehouse inventory', err);
      setWarehouseInventory([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate quantity against available stock
    if (availableQty !== null && parseFloat(quantity) > availableQty) {
      setError(`Insufficient stock. Available: ${availableQty}`);
      return;
    }

    try {
      await createIssuance({
        warehouse_id: parseInt(warehouseId),
        contractor_id: parseInt(contractorId),
        material_id: parseInt(materialId),
        quantity: parseFloat(quantity),
        issued_date: new Date().toISOString().split('T')[0],
        issued_by: issuedBy || 'System',
      });
      setSuccess('Material issued successfully!');
      setWarehouseId('');
      setContractorId('');
      setMaterialId('');
      setQuantity('');
      setIssuedBy('');
      setAvailableQty(null);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to issue material');
    }
  };

  const selectedMaterial = materials.find((m) => m.id === parseInt(materialId));

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Issue Material
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Warehouse</InputLabel>
          <Select
            value={warehouseId}
            label="Warehouse"
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setMaterialId('');
              setAvailableQty(null);
            }}
            required
          >
            {warehouses.map((wh) => (
              <MenuItem key={wh.id} value={wh.id}>
                {wh.code} - {wh.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
            disabled={!warehouseId}
          >
            {materials.map((m) => {
              const invItem = warehouseInventory.find((i) => i.material_id === m.id);
              const available = invItem ? invItem.current_quantity : 0;
              return (
                <MenuItem key={m.id} value={m.id}>
                  {m.code} - {m.name} ({m.unit})
                  {warehouseId && (
                    <Chip
                      label={`Avail: ${available}`}
                      size="small"
                      color={available > 0 ? 'success' : 'error'}
                      sx={{ ml: 1 }}
                    />
                  )}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {availableQty !== null && (
          <Alert
            severity={availableQty > 0 ? 'info' : 'warning'}
            sx={{ mb: 2 }}
          >
            Available in warehouse: <strong>{availableQty} {selectedMaterial?.unit || ''}</strong>
          </Alert>
        )}

        <TextField
          fullWidth
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          sx={{ mb: 2 }}
          inputProps={{ min: 0, step: 0.01 }}
          error={availableQty !== null && parseFloat(quantity) > availableQty}
          helperText={
            availableQty !== null && parseFloat(quantity) > availableQty
              ? 'Quantity exceeds available stock'
              : ''
          }
        />

        <TextField
          fullWidth
          label="Issued By"
          value={issuedBy}
          onChange={(e) => setIssuedBy(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="Enter your name"
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={
            !warehouseId ||
            !contractorId ||
            !materialId ||
            !quantity ||
            (availableQty !== null && parseFloat(quantity) > availableQty)
          }
        >
          Issue Material
        </Button>
      </Box>
    </Paper>
  );
}
