import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  LinearProgress,
} from '@mui/material';
import { createIssuance, getWarehouses, getWarehouseInventory, getErrorMessage } from '../api';

export default function BulkIssueDialog({ open, onClose, contractors, materials, onSuccess }) {
  const [warehouseId, setWarehouseId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedContractors, setSelectedContractors] = useState(new Set());
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseInventory, setWarehouseInventory] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (open) {
      loadWarehouses();
      setSelectedContractors(new Set());
      setMaterialId('');
      setQuantity('');
      setError('');
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    if (warehouseId) {
      loadWarehouseInventory(warehouseId);
    }
  }, [warehouseId]);

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();
      const data = res.data?.items || res.data || [];
      setWarehouses(data);
      const source = data.find((w) => !w.contractor_id);
      if (source) setWarehouseId(source.id);
    } catch {
      setWarehouses([]);
    }
  };

  const loadWarehouseInventory = async (whId) => {
    try {
      const res = await getWarehouseInventory(whId);
      setWarehouseInventory(res.data || []);
    } catch {
      setWarehouseInventory([]);
    }
  };

  const handleToggle = (id) => {
    setSelectedContractors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedContractors.size === (contractors || []).length) {
      setSelectedContractors(new Set());
    } else {
      setSelectedContractors(new Set((contractors || []).map((c) => c.id)));
    }
  };

  const handleSubmit = async () => {
    const ids = [...selectedContractors];
    if (ids.length === 0 || !materialId || !quantity || !warehouseId) return;

    setSubmitting(true);
    setError('');
    setProgress({ done: 0, total: ids.length });
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    const material = (materials || []).find((m) => m.id === parseInt(materialId));

    for (const contractorId of ids) {
      try {
        await createIssuance({
          warehouse_id: parseInt(warehouseId),
          contractor_id: contractorId,
          material_id: parseInt(materialId),
          quantity: parseFloat(quantity),
          unit_of_measure: material?.unit || 'pcs',
          issued_date: new Date().toISOString().split('T')[0],
          issued_by: 'System (Bulk)',
          notes: `Bulk issuance to ${ids.length} contractors`,
        });
        successCount++;
      } catch (err) {
        failCount++;
        const c = (contractors || []).find((ct) => ct.id === contractorId);
        errors.push(`${c?.name || contractorId}: ${getErrorMessage(err)}`);
      }
      setProgress({ done: successCount + failCount, total: ids.length });
    }

    setSubmitting(false);
    setResults({ successCount, failCount, errors });
    if (successCount > 0) onSuccess?.();
  };

  const selectedMaterial = (materials || []).find((m) => m.id === parseInt(materialId));
  const invItem = warehouseInventory.find((i) => i.material_id === parseInt(materialId));
  const available = invItem ? invItem.current_quantity : 0;
  const totalNeeded = selectedContractors.size * parseFloat(quantity || 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Bulk Issue Material</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {results && (
          <Alert
            severity={results.failCount > 0 ? 'warning' : 'success'}
            sx={{ mb: 2 }}
          >
            Issued to {results.successCount} contractors.
            {results.failCount > 0 && ` ${results.failCount} failed.`}
            {results.errors.length > 0 && (
              <Box sx={{ mt: 1, fontSize: '0.75rem' }}>
                {results.errors.map((e, i) => <div key={i}>{e}</div>)}
              </Box>
            )}
          </Alert>
        )}

        {/* Material + Quantity selection */}
        <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>Material & Quantity</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl sx={{ flex: 1 }}>
            <InputLabel>Source Warehouse</InputLabel>
            <Select
              value={warehouseId}
              label="Source Warehouse"
              onChange={(e) => setWarehouseId(e.target.value)}
              size="small"
            >
              {warehouses.filter((w) => !w.contractor_id).map((wh) => (
                <MenuItem key={wh.id} value={wh.id}>{wh.code} - {wh.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ flex: 2 }}>
            <InputLabel>Material</InputLabel>
            <Select
              value={materialId}
              label="Material"
              onChange={(e) => setMaterialId(e.target.value)}
              size="small"
            >
              {(materials || []).map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.code} - {m.name} ({m.unit})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            sx={{ flex: 1 }}
            label="Qty each"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Box>

        {materialId && quantity && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Chip label={`Available: ${available} ${selectedMaterial?.unit || ''}`} color={available >= totalNeeded ? 'success' : 'error'} size="small" />
            <Chip label={`Total needed: ${totalNeeded.toFixed(2)}`} size="small" variant="outlined" />
            <Chip label={`${selectedContractors.size} contractors selected`} size="small" variant="outlined" />
          </Box>
        )}

        {/* Contractor selection */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Contractors</Typography>
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={selectedContractors.size === (contractors || []).length && (contractors || []).length > 0}
                    indeterminate={selectedContractors.size > 0 && selectedContractors.size < (contractors || []).length}
                    onChange={handleToggleAll}
                  />
                </TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(contractors || []).map((c) => (
                <TableRow key={c.id} hover onClick={() => handleToggle(c.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={selectedContractors.has(c.id)} />
                  </TableCell>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {submitting && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={(progress.done / progress.total) * 100} />
            <Typography variant="caption" color="text.secondary">
              Processing {progress.done} of {progress.total}...
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || selectedContractors.size === 0 || !materialId || !quantity}
        >
          {submitting ? 'Issuing...' : `Issue to ${selectedContractors.size} Contractors`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
