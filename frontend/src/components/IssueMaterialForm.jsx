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
import WarningIcon from '@mui/icons-material/Warning';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { createIssuance, getWarehouses, getWarehouseInventory, getErrorMessage } from '../api';
import useAutoDismiss from '../hooks/useAutoDismiss';
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
  useAutoDismiss(success, setSuccess);
  const [submitting, setSubmitting] = useState(false);

  // Validation state
  const [touched, setTouched] = useState({});

  const [warehouses, setWarehouses] = useState([]);
  const [warehouseInventory, setWarehouseInventory] = useState([]);
  const [availableQty, setAvailableQty] = useState(null);
  const [contractorWarehouse, setContractorWarehouse] = useState(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  // Auto-detect warehouse when contractor changes
  useEffect(() => {
    if (contractorId && warehouses.length > 0) {
      const ctrWarehouse = warehouses.find(
        (w) => w.contractor_id === parseInt(contractorId) && w.can_hold_materials
      );
      setContractorWarehouse(ctrWarehouse || null);

      // Auto-select source warehouse: pick first non-contractor warehouse
      if (!warehouseId) {
        const sourceWh = warehouses.find(
          (w) => !w.contractor_id && w.can_hold_materials
        );
        if (sourceWh) {
          setWarehouseId(sourceWh.id);
        } else if (warehouses.length === 1) {
          setWarehouseId(warehouses[0].id);
        }
      }
    } else {
      setContractorWarehouse(null);
    }
  }, [contractorId, warehouses]);

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
      const data = res.data?.items || res.data || [];
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses', err);
      setWarehouses([]);
    }
  };

  const loadWarehouseInventory = async (whId) => {
    try {
      const res = await getWarehouseInventory(whId);
      setWarehouseInventory(res.data || []);
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
      contractorWarehouse &&
      materialId &&
      quantity &&
      !validateQuantity()
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setTouched({ contractor: true, material: true, quantity: true });

    if (!isFormValid()) {
      return;
    }

    setSubmitting(true);
    try {
      const material = (materials || []).find((m) => m.id === parseInt(materialId));
      await createIssuance({
        warehouse_id: parseInt(warehouseId),
        contractor_id: parseInt(contractorId),
        material_id: parseInt(materialId),
        quantity: parseFloat(quantity),
        unit_of_measure: material?.unit || 'pcs',
        issued_date: new Date().toISOString().split('T')[0],
        issued_by: issuedBy || 'System',
        notes: notes || null,
      });
      setSuccess('Material issued successfully!');
      setContractorId('');
      setMaterialId('');
      setQuantity('');
      setIssuedBy('');
      setNotes('');
      setAvailableQty(null);
      setWarehouseId('');
      setTouched({});
      onSuccess?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to issue material'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMaterial = (materials || []).find((m) => m.id === parseInt(materialId));
  const quantityError = getFieldError('quantity');
  const isQuantityValid = touched.quantity && !quantityError && quantity;

  // Source warehouses (non-contractor warehouses)
  const sourceWarehouses = warehouses.filter((w) => !w.contractor_id);

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
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        {/* Step 1: Contractor + Warehouse (combined row) */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Step 1: Select contractor & source warehouse
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl
            sx={{ flex: 2 }}
            error={!!getFieldError('contractor')}
            required
          >
            <InputLabel>Contractor</InputLabel>
            <Select
              value={contractorId}
              label="Contractor"
              onChange={(e) => {
                setContractorId(e.target.value);
                setMaterialId('');
                setAvailableQty(null);
              }}
              onBlur={() => handleBlur('contractor')}
            >
              {(contractors || []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </MenuItem>
              ))}
            </Select>
            {getFieldError('contractor') && (
              <FormHelperText>{getFieldError('contractor')}</FormHelperText>
            )}
          </FormControl>

          <FormControl sx={{ flex: 1 }}>
            <InputLabel>Source Warehouse</InputLabel>
            <Select
              value={warehouseId}
              label="Source Warehouse"
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setMaterialId('');
                setAvailableQty(null);
              }}
            >
              {sourceWarehouses.map((wh) => (
                <MenuItem key={wh.id} value={wh.id}>
                  {wh.code}
                </MenuItem>
              ))}
              {/* If no source warehouses, show all */}
              {sourceWarehouses.length === 0 && warehouses.map((wh) => (
                <MenuItem key={wh.id} value={wh.id}>
                  {wh.code} - {wh.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Destination info */}
        {contractorId && (
          <Alert
            severity={contractorWarehouse ? 'info' : 'warning'}
            icon={contractorWarehouse ? <LocalShippingIcon /> : <WarningIcon />}
            sx={{ mb: 2 }}
          >
            {contractorWarehouse ? (
              <>
                <strong>Destination:</strong> {contractorWarehouse.name} ({contractorWarehouse.code})
              </>
            ) : (
              <>
                This contractor does not have a warehouse. Please create one first.
              </>
            )}
          </Alert>
        )}

        {/* Step 2: Material + Quantity (combined row) */}
        {contractorId && warehouseId && contractorWarehouse && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Step 2: Select material & quantity
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl
                sx={{ flex: 2 }}
                error={!!getFieldError('material')}
                required
              >
                <InputLabel>Material</InputLabel>
                <Select
                  value={materialId}
                  label="Material"
                  onChange={(e) => setMaterialId(e.target.value)}
                  onBlur={() => handleBlur('material')}
                >
                  {(materials || []).map((m) => {
                    const invItem = warehouseInventory.find((i) => i.material_id === m.id);
                    const available = invItem ? invItem.current_quantity : 0;
                    return (
                      <MenuItem key={m.id} value={m.id}>
                        {m.code} - {m.name} ({m.unit})
                        <Chip
                          label={`Avail: ${available}`}
                          size="small"
                          color={available > 0 ? 'success' : 'error'}
                          sx={{ ml: 1 }}
                        />
                      </MenuItem>
                    );
                  })}
                </Select>
                {getFieldError('material') && (
                  <FormHelperText>{getFieldError('material')}</FormHelperText>
                )}
              </FormControl>

              <TextField
                sx={{ flex: 1 }}
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onBlur={() => handleBlur('quantity')}
                required
                error={!!quantityError}
                helperText={quantityError || (selectedMaterial ? selectedMaterial.unit : '')}
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
            </Box>

            {availableQty !== null && availableQty > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Available: {availableQty} {selectedMaterial?.unit || ''}
              </Typography>
            )}
          </>
        )}

        {/* Step 3: Additional details (optional, collapsed) */}
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
