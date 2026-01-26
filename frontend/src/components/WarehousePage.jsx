import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
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
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Refresh as RefreshIcon,
  Warehouse as WarehouseIcon,
} from '@mui/icons-material';
import {
  getWarehouses,
  createWarehouse,
  getWarehouseInventory,
  getLowStockItems,
  addWarehouseInventory,
  updateWarehouseInventory,
} from '../api';
import { DataTable } from './common';

export default function WarehousePage({ materials, refreshKey }) {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [warehouseDialog, setWarehouseDialog] = useState(false);
  const [inventoryDialog, setInventoryDialog] = useState(false);

  // Form states
  const [newWarehouse, setNewWarehouse] = useState({ name: '', code: '', location: '' });
  const [newInventory, setNewInventory] = useState({
    material_id: '',
    current_quantity: '',
    unit_of_measure: '',
    reorder_point: '',
    reorder_quantity: '',
  });

  useEffect(() => {
    loadWarehouses();
  }, [refreshKey]);

  useEffect(() => {
    if (selectedWarehouse) {
      loadWarehouseInventory(selectedWarehouse);
      loadLowStockItems(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();
      const data = res.data.items || res.data;
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load warehouses');
    }
  };

  const loadWarehouseInventory = async (warehouseId) => {
    setLoading(true);
    try {
      const res = await getWarehouseInventory(warehouseId);
      setInventory(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadLowStockItems = async (warehouseId) => {
    try {
      const res = await getLowStockItems(warehouseId);
      setLowStockItems(res.data.map((item) => item.material_id));
    } catch (err) {
      // Low stock endpoint might not exist, ignore error
      setLowStockItems([]);
    }
  };

  const handleCreateWarehouse = async () => {
    try {
      await createWarehouse(newWarehouse);
      setSuccess('Warehouse created successfully');
      setWarehouseDialog(false);
      setNewWarehouse({ name: '', code: '', location: '' });
      loadWarehouses();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create warehouse');
    }
  };

  const handleAddInventory = async () => {
    try {
      await addWarehouseInventory(selectedWarehouse, {
        ...newInventory,
        warehouse_id: selectedWarehouse,
        material_id: parseInt(newInventory.material_id),
        current_quantity: parseFloat(newInventory.current_quantity),
        reorder_point: parseFloat(newInventory.reorder_point) || 0,
        reorder_quantity: parseFloat(newInventory.reorder_quantity) || 0,
      });
      setSuccess('Inventory added successfully');
      setInventoryDialog(false);
      setNewInventory({
        material_id: '',
        current_quantity: '',
        unit_of_measure: '',
        reorder_point: '',
        reorder_quantity: '',
      });
      loadWarehouseInventory(selectedWarehouse);
      loadLowStockItems(selectedWarehouse);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add inventory');
    }
  };

  const isLowStock = (materialId) => lowStockItems.includes(materialId);

  const selectedWarehouseData = warehouses.find((w) => w.id === selectedWarehouse);

  return (
    <Grid container spacing={3}>
      {error && (
        <Grid size={12}>
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Grid>
      )}
      {success && (
        <Grid size={12}>
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Grid>
      )}

      {/* Warehouse Selection and Actions */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">Warehouse Management</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setWarehouseDialog(true)}
              size="small"
            >
              New Warehouse
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel>Select Warehouse</InputLabel>
              <Select
                value={selectedWarehouse}
                label="Select Warehouse"
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                {warehouses.map((wh) => (
                  <MenuItem key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedWarehouseData && (
              <Typography variant="body2" color="text.secondary">
                Location: {selectedWarehouseData.location || 'N/A'}
              </Typography>
            )}
            <IconButton onClick={() => loadWarehouseInventory(selectedWarehouse)} title="Refresh">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Paper>
      </Grid>

      {/* Warehouse Inventory */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Warehouse Inventory
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setInventoryDialog(true)}
              disabled={!selectedWarehouse}
            >
              Add Inventory
            </Button>
          </Box>

          {lowStockItems.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {lowStockItems.length} item(s) are below reorder point
            </Alert>
          )}

          <DataTable
            columns={[
              { id: 'material_code', label: 'Material Code' },
              { id: 'material_name', label: 'Material Name' },
              {
                id: 'current_quantity',
                label: 'Current Qty',
                align: 'right',
                render: (val, row) => (
                  <Typography
                    component="span"
                    color={isLowStock(row.material_id) ? 'warning.main' : 'inherit'}
                    fontWeight={isLowStock(row.material_id) ? 600 : 'normal'}
                  >
                    {val?.toLocaleString()}
                  </Typography>
                ),
              },
              { id: 'unit_of_measure', label: 'Unit' },
              {
                id: 'reorder_point',
                label: 'Reorder Point',
                align: 'right',
                render: (val) => val?.toLocaleString(),
              },
              {
                id: 'reorder_quantity',
                label: 'Reorder Qty',
                align: 'right',
                render: (val) => val?.toLocaleString(),
              },
              {
                id: 'status',
                label: 'Status',
                sortable: false,
                render: (val, row) =>
                  isLowStock(row.material_id) ? (
                    <Chip
                      label="Low Stock"
                      color="warning"
                      size="small"
                      icon={<WarningIcon />}
                    />
                  ) : (
                    <Chip label="OK" color="success" size="small" />
                  ),
              },
            ]}
            data={inventory}
            searchPlaceholder="Search inventory..."
            searchFields={['material_code', 'material_name']}
            getRowStyle={(row) => ({
              backgroundColor: isLowStock(row.material_id)
                ? 'rgba(245, 158, 11, 0.08)'
                : 'inherit',
            })}
            emptyState={{
              icon: WarehouseIcon,
              title: loading ? 'Loading...' : 'No inventory items',
              description: selectedWarehouse
                ? 'Add inventory items to track stock levels.'
                : 'Select a warehouse to view inventory.',
              actionLabel: selectedWarehouse ? 'Add Inventory' : undefined,
              onAction: selectedWarehouse ? () => setInventoryDialog(true) : undefined,
            }}
          />
        </Paper>
      </Grid>

      {/* Create Warehouse Dialog */}
      <Dialog open={warehouseDialog} onClose={() => setWarehouseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Warehouse</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Warehouse Name"
              value={newWarehouse.name}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Warehouse Code"
              value={newWarehouse.code}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Location"
              value={newWarehouse.location}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarehouseDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateWarehouse}
            variant="contained"
            disabled={!newWarehouse.name || !newWarehouse.code}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Inventory Dialog */}
      <Dialog open={inventoryDialog} onClose={() => setInventoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Inventory Item</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Material</InputLabel>
              <Select
                value={newInventory.material_id}
                label="Material"
                onChange={(e) => {
                  const mat = materials.find((m) => m.id === e.target.value);
                  setNewInventory({
                    ...newInventory,
                    material_id: e.target.value,
                    unit_of_measure: mat?.unit || '',
                  });
                }}
              >
                {materials.map((mat) => (
                  <MenuItem key={mat.id} value={mat.id}>
                    {mat.code} - {mat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Current Quantity"
              type="number"
              value={newInventory.current_quantity}
              onChange={(e) => setNewInventory({ ...newInventory, current_quantity: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Unit of Measure"
              value={newInventory.unit_of_measure}
              onChange={(e) => setNewInventory({ ...newInventory, unit_of_measure: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Reorder Point"
              type="number"
              value={newInventory.reorder_point}
              onChange={(e) => setNewInventory({ ...newInventory, reorder_point: e.target.value })}
              fullWidth
              helperText="Alert when quantity falls below this level"
            />
            <TextField
              label="Reorder Quantity"
              type="number"
              value={newInventory.reorder_quantity}
              onChange={(e) => setNewInventory({ ...newInventory, reorder_quantity: e.target.value })}
              fullWidth
              helperText="Suggested quantity to reorder"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInventoryDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddInventory}
            variant="contained"
            disabled={!newInventory.material_id || !newInventory.current_quantity}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
