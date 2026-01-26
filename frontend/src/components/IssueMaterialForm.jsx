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
  FormHelperText,
  InputAdornment,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { createIssuance, getWarehouses, getWarehouseInventory } from '../api';
import { CollapsibleSection } from './common';

export default function IssueMaterialForm({ contractors, materials, onSuccess }) {
  const [warehouseId, setWarehouseId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validation state
  const [touched, setTouched] = useState({});

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
      // Smart default: auto-select if only one warehouse
      if (data.length === 1) {
        setWarehouseId(data[0].id);
      }
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

  // Validation helpers
  const validateQuantity = () => {
    if (!quantity) return 'Quantity is required';
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return 'Enter a valid quantity';
    if (availableQty !== null && qty > availableQty) {
      return `Exceeds available stock (${availableQty})`;
    }
    return '';
  };

  const getFieldError = (field) => {
    if (!touched[field]) return '';
    switch (field) {
      case 'warehouse':
        return !warehouseId ? 'Select a warehouse' : '';
      case 'contractor':
        return !contractorId ? 'Select a contractor' : '';
      case 'material':
        return !materialId ? 'Select a material' : '';
      case 'quantity':
        return validateQuantity();
      default:
        return '';
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isFormValid = () => {
    return (
      warehouseId &&
      contractorId &&
      materialId &&
      quantity &&
      !validateQuantity()
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Mark all fields as touched
    setTouched({
      warehouse: true,
      contractor: true,
      material: true,
      quantity: true,
    });

    if (!isFormValid()) {
      return;
    }

    setSubmitting(true);
    try {
      await createIssuance({
        warehouse_id: parseInt(warehouseId),
        contractor_id: parseInt(contractorId),
        material_id: parseInt(materialId),
        quantity: parseFloat(quantity),
        issued_date: new Date().toISOString().split('T')[0],
        issued_by: issuedBy || 'System',
        notes: notes || null,
      });
      setSuccess('Material issued successfully!');
      // Reset form
      setContractorId('');
      setMaterialId('');
      setQuantity('');
      setIssuedBy('');
      setNotes('');
      setAvailableQty(null);
      setTouched({});
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to issue material');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMaterial = materials.find((m) => m.id === parseInt(materialId));
  const quantityError = getFieldError('quantity');
  const isQuantityValid = touched.quantity && !quantityError && quantity;

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
        {/* Essential Fields */}
        <FormControl
          fullWidth
          sx={{ mb: 2 }}
          error={!!getFieldError('warehouse')}
          required
        >
          <InputLabel>Warehouse</InputLabel>
          <Select
            value={warehouseId}
            label="Warehouse"
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setMaterialId('');
              setAvailableQty(null);
            }}
            onBlur={() => handleBlur('warehouse')}
          >
            {warehouses.map((wh) => (
              <MenuItem key={wh.id} value={wh.id}>
                {wh.code} - {wh.name}
              </MenuItem>
            ))}
          </Select>
          {getFieldError('warehouse') && (
            <FormHelperText>{getFieldError('warehouse')}</FormHelperText>
          )}
        </FormControl>

        <FormControl
          fullWidth
          sx={{ mb: 2 }}
          error={!!getFieldError('contractor')}
          required
        >
          <InputLabel>Contractor</InputLabel>
          <Select
            value={contractorId}
            label="Contractor"
            onChange={(e) => setContractorId(e.target.value)}
            onBlur={() => handleBlur('contractor')}
          >
            {contractors.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.code} - {c.name}
              </MenuItem>
            ))}
          </Select>
          {getFieldError('contractor') && (
            <FormHelperText>{getFieldError('contractor')}</FormHelperText>
          )}
        </FormControl>

        <FormControl
          fullWidth
          sx={{ mb: 2 }}
          error={!!getFieldError('material')}
          required
          disabled={!warehouseId}
        >
          <InputLabel>Material</InputLabel>
          <Select
            value={materialId}
            label="Material"
            onChange={(e) => setMaterialId(e.target.value)}
            onBlur={() => handleBlur('material')}
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
          {getFieldError('material') && (
            <FormHelperText>{getFieldError('material')}</FormHelperText>
          )}
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
          onBlur={() => handleBlur('quantity')}
          required
          sx={{ mb: 2 }}
          error={!!quantityError}
          helperText={quantityError || (selectedMaterial ? `Unit: ${selectedMaterial.unit}` : '')}
          slotProps={{
            input: {
              min: 0,
              step: 0.01,
              endAdornment: isQuantityValid ? (
                <InputAdornment position="end">
                  <CheckCircleIcon color="success" fontSize="small" />
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {/* Optional Fields - Collapsed by default */}
        <CollapsibleSection
          title="Additional Details"
          expandLabel="Add notes & details (optional)"
          subtitle="Issued by, notes"
        >
          <TextField
            fullWidth
            label="Issued By"
            value={issuedBy}
            onChange={(e) => setIssuedBy(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Enter your name"
            helperText="Leave blank to use 'System'"
          />

          <TextField
            fullWidth
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            placeholder="Optional notes about this issuance"
          />
        </CollapsibleSection>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting}
          sx={{ mt: 3 }}
        >
          {submitting ? 'Issuing...' : 'Issue Material'}
        </Button>
      </Box>
    </Paper>
  );
}
