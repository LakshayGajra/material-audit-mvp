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
  Tabs,
  Tab,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Refresh as RefreshIcon,
  Warehouse as WarehouseIcon,
  Business as CompanyIcon,
  Engineering as ContractorIcon,
  Category as FGIcon,
} from '@mui/icons-material';
import {
  getWarehouses,
  createWarehouse,
  getWarehouseInventory,
  getWarehouseFGInventory,
  getLowStockItems,
  addWarehouseInventory,
  getContractors,
  getErrorMessage,
} from '../api';
import { DataTable } from './common';
import useAutoDismiss from '../hooks/useAutoDismiss';

export default function WarehousePage({ materials, refreshKey }) {
  const [warehouses, setWarehouses] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [inventory, setInventory] = useState([]);
  const [fgInventory, setFgInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useAutoDismiss(success, setSuccess);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('all');

  // Tab state for inventory view
  const [inventoryTab, setInventoryTab] = useState(0);

  // Dialog states
  const [warehouseDialog, setWarehouseDialog] = useState(false);
  const [inventoryDialog, setInventoryDialog] = useState(false);

  // Form states
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    code: '',
    location: '',
    owner_type: 'company',
    contractor_id: '',
    can_hold_materials: true,
    can_hold_finished_goods: true,
  });
  const [newInventory, setNewInventory] = useState({
    material_id: '',
    current_quantity: '',
    unit_of_measure: '',
    reorder_point: '',
    reorder_quantity: '',
  });

  useEffect(() => {
    loadWarehouses();
    loadContractors();
  }, [refreshKey]);

  useEffect(() => {
    loadWarehouses();
  }, [ownerTypeFilter]);

  useEffect(() => {
    if (selectedWarehouse) {
      loadWarehouseInventory(selectedWarehouse);
      loadWarehouseFGInventory(selectedWarehouse);
      loadLowStockItems(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const loadContractors = async () => {
    try {
      const res = await getContractors();
      setContractors(res.data || []);
    } catch (err) {
      console.error('Failed to load contractors:', err);
    }
  };

  const loadWarehouses = async () => {
    try {
      const params = {};
      if (ownerTypeFilter !== 'all') {
        params.owner_type = ownerTypeFilter;
      }
      const res = await getWarehouses(params);
      const data = res.data || [];
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load warehouses'));
      setWarehouses([]);
    }
  };

  const loadWarehouseInventory = async (warehouseId) => {
    setLoading(true);
    try {
      const res = await getWarehouseInventory(warehouseId);
      setInventory(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load inventory'));
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouseFGInventory = async (warehouseId) => {
    try {
      const res = await getWarehouseFGInventory(warehouseId);
      setFgInventory(res.data || []);
    } catch (err) {
      // FG inventory might not be enabled for this warehouse
      setFgInventory([]);
    }
  };

  const loadLowStockItems = async (warehouseId) => {
    try {
      const res = await getLowStockItems(warehouseId);
      setLowStockItems((res.data || []).map((item) => item.material_id));
    } catch (err) {
      setLowStockItems([]);
    }
  };

  const handleCreateWarehouse = async () => {
    try {
      const data = {
        ...newWarehouse,
        contractor_id: newWarehouse.owner_type === 'contractor' ? parseInt(newWarehouse.contractor_id) : null,
      };
      await createWarehouse(data);
      setSuccess('Warehouse created successfully');
      setWarehouseDialog(false);
      setNewWarehouse({
        name: '',
        code: '',
        location: '',
        owner_type: 'company',
        contractor_id: '',
        can_hold_materials: true,
        can_hold_finished_goods: true,
      });
      loadWarehouses();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create warehouse'));
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
      setError(getErrorMessage(err, 'Failed to add inventory'));
    }
  };

  const isLowStock = (materialId) => lowStockItems.includes(materialId);

  const selectedWarehouseData = warehouses.find((w) => w.id === selectedWarehouse);

  // Count warehouses by type
  const companyCount = warehouses.filter(w => w.owner_type === 'company').length;
  const contractorCount = warehouses.filter(w => w.owner_type === 'contractor').length;

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

      {/* Summary Cards */}
      <Grid size={12}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Warehouses
                </Typography>
                <Typography variant="h4">{warehouses.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CompanyIcon color="primary" />
                  <Typography color="text.secondary">Company</Typography>
                </Box>
                <Typography variant="h4" color="primary.main">{companyCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ContractorIcon color="success" />
                  <Typography color="text.secondary">Contractor</Typography>
                </Box>
                <Typography variant="h4" color="success.main">{contractorCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Warehouse Selection and Actions */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Owner Type Filter */}
            <ToggleButtonGroup
              value={ownerTypeFilter}
              exclusive
              onChange={(e, val) => val && setOwnerTypeFilter(val)}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="company">
                <CompanyIcon sx={{ mr: 0.5 }} fontSize="small" />
                Company
              </ToggleButton>
              <ToggleButton value="contractor">
                <ContractorIcon sx={{ mr: 0.5 }} fontSize="small" />
                Contractor
              </ToggleButton>
            </ToggleButtonGroup>

            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel>Select Warehouse</InputLabel>
              <Select
                value={selectedWarehouse}
                label="Select Warehouse"
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                {warehouses.map((wh) => (
                  <MenuItem key={wh.id} value={wh.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {wh.owner_type === 'company' ? (
                        <CompanyIcon fontSize="small" color="primary" />
                      ) : (
                        <ContractorIcon fontSize="small" color="success" />
                      )}
                      {wh.name} ({wh.code})
                      {wh.contractor_name && (
                        <Chip label={wh.contractor_code} size="small" variant="outlined" />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <IconButton onClick={() => {
              loadWarehouseInventory(selectedWarehouse);
              loadWarehouseFGInventory(selectedWarehouse);
            }} title="Refresh">
              <RefreshIcon />
            </IconButton>
          </Box>

          {/* Selected Warehouse Info */}
          {selectedWarehouseData && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={selectedWarehouseData.owner_type === 'company' ? <CompanyIcon /> : <ContractorIcon />}
                label={selectedWarehouseData.owner_type === 'company' ? 'Company Warehouse' : 'Contractor Warehouse'}
                color={selectedWarehouseData.owner_type === 'company' ? 'primary' : 'success'}
                variant="outlined"
              />
              {selectedWarehouseData.contractor_name && (
                <Chip
                  label={`Contractor: ${selectedWarehouseData.contractor_name}`}
                  variant="outlined"
                />
              )}
              {selectedWarehouseData.location && (
                <Chip label={`Location: ${selectedWarehouseData.location}`} variant="outlined" />
              )}
              {selectedWarehouseData.can_hold_materials && (
                <Chip icon={<InventoryIcon />} label="Materials" size="small" />
              )}
              {selectedWarehouseData.can_hold_finished_goods && (
                <Chip icon={<FGIcon />} label="Finished Goods" size="small" />
              )}
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Warehouse Inventory */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Tabs value={inventoryTab} onChange={(e, v) => setInventoryTab(v)}>
              <Tab
                icon={<InventoryIcon />}
                iconPosition="start"
                label={`Materials (${inventory.length})`}
              />
              <Tab
                icon={<FGIcon />}
                iconPosition="start"
                label={`Finished Goods (${fgInventory.length})`}
                disabled={!selectedWarehouseData?.can_hold_finished_goods}
              />
            </Tabs>
            {inventoryTab === 0 && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setInventoryDialog(true)}
                disabled={!selectedWarehouse || !selectedWarehouseData?.can_hold_materials}
              >
                Add Material
              </Button>
            )}
          </Box>

          {lowStockItems.length > 0 && inventoryTab === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {lowStockItems.length} item(s) are below reorder point
            </Alert>
          )}

          {/* Materials Tab */}
          {inventoryTab === 0 && (
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
                  id: 'status',
                  label: 'Status',
                  sortable: false,
                  render: (val, row) =>
                    isLowStock(row.material_id) ? (
                      <Chip label="Low Stock" color="warning" size="small" icon={<WarningIcon />} />
                    ) : (
                      <Chip label="OK" color="success" size="small" />
                    ),
                },
              ]}
              data={inventory}
              searchPlaceholder="Search materials..."
              searchFields={['material_code', 'material_name']}
              getRowStyle={(row) => ({
                backgroundColor: isLowStock(row.material_id) ? 'rgba(245, 158, 11, 0.08)' : 'inherit',
              })}
              emptyState={{
                icon: WarehouseIcon,
                title: loading ? 'Loading...' : 'No material inventory',
                description: selectedWarehouse
                  ? 'Add materials to track stock levels.'
                  : 'Select a warehouse to view inventory.',
              }}
            />
          )}

          {/* Finished Goods Tab */}
          {inventoryTab === 1 && (
            <DataTable
              columns={[
                { id: 'finished_good_code', label: 'FG Code' },
                { id: 'finished_good_name', label: 'Finished Good' },
                {
                  id: 'current_quantity',
                  label: 'Current Qty',
                  align: 'right',
                  render: (val) => val?.toLocaleString(),
                },
                { id: 'unit_of_measure', label: 'Unit' },
                {
                  id: 'last_receipt_date',
                  label: 'Last Receipt',
                  render: (val) => val ? new Date(val).toLocaleDateString() : '-',
                },
              ]}
              data={fgInventory}
              searchPlaceholder="Search finished goods..."
              searchFields={['finished_good_code', 'finished_good_name']}
              emptyState={{
                icon: FGIcon,
                title: 'No finished goods inventory',
                description: 'Finished goods will appear here when received.',
              }}
            />
          )}
        </Paper>
      </Grid>

      {/* Create Warehouse Dialog */}
      <Dialog open={warehouseDialog} onClose={() => setWarehouseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Warehouse</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Warehouse Code"
              value={newWarehouse.code}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
              required
              fullWidth
              placeholder="e.g., WH-001"
            />
            <TextField
              label="Warehouse Name"
              value={newWarehouse.name}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Location"
              value={newWarehouse.location}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Owner Type</InputLabel>
              <Select
                value={newWarehouse.owner_type}
                label="Owner Type"
                onChange={(e) => setNewWarehouse({
                  ...newWarehouse,
                  owner_type: e.target.value,
                  contractor_id: '',
                })}
              >
                <MenuItem value="company">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CompanyIcon color="primary" />
                    Company Warehouse
                  </Box>
                </MenuItem>
                <MenuItem value="contractor">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ContractorIcon color="success" />
                    Contractor Warehouse
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {newWarehouse.owner_type === 'contractor' && (
              <FormControl fullWidth required>
                <InputLabel>Contractor</InputLabel>
                <Select
                  value={newWarehouse.contractor_id}
                  label="Contractor"
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, contractor_id: e.target.value })}
                >
                  {contractors.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newWarehouse.can_hold_materials}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, can_hold_materials: e.target.checked })}
                  />
                }
                label="Can hold materials"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={newWarehouse.can_hold_finished_goods}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, can_hold_finished_goods: e.target.checked })}
                  />
                }
                label="Can hold finished goods"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarehouseDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateWarehouse}
            variant="contained"
            disabled={
              !newWarehouse.name ||
              !newWarehouse.code ||
              (newWarehouse.owner_type === 'contractor' && !newWarehouse.contractor_id)
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Inventory Dialog */}
      <Dialog open={inventoryDialog} onClose={() => setInventoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Material Inventory</DialogTitle>
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
