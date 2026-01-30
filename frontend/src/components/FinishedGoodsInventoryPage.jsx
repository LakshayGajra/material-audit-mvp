import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Alert,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { Inventory as InventoryIcon } from '@mui/icons-material';
import { getFinishedGoodsInventory, getWarehouses, getErrorMessage } from '../api';
import { DataTable } from './common';

export default function FinishedGoodsInventoryPage({ refreshKey }) {
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarehouses();
    loadInventory();
  }, [refreshKey]);

  useEffect(() => {
    loadInventory();
  }, [warehouseFilter]);

  const loadWarehouses = async () => {
    try {
      const res = await getWarehouses();
      setWarehouses(res.data?.items || res.data || []);
    } catch (err) {
      console.error('Failed to load warehouses', err);
      setWarehouses([]);
    }
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      const params = warehouseFilter ? { warehouse_id: warehouseFilter } : {};
      const res = await getFinishedGoodsInventory(params);
      setInventory(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load finished goods inventory'));
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((sum, item) => sum + (item.current_quantity || 0), 0);
  const warehousesWithStock = new Set(inventory.map((i) => i.warehouse_id)).size;

  return (
    <Grid container spacing={3}>
      {error && (
        <Grid size={12}>
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Grid>
      )}

      {/* Summary Cards */}
      <Grid size={12}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">{totalItems}</Typography>
              <Typography variant="body2" color="text.secondary">Inventory Items</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">{totalQuantity.toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">Total Quantity</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">{warehousesWithStock}</Typography>
              <Typography variant="body2" color="text.secondary">Warehouses with Stock</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Grid>

      {/* Header */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Finished Goods Inventory</Typography>
          </Box>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Warehouse</InputLabel>
            <Select
              value={warehouseFilter}
              label="Filter by Warehouse"
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <MenuItem value="">All Warehouses</MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      </Grid>

      {/* Inventory Table */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <DataTable
            columns={[
              { id: 'finished_good_code', label: 'Code' },
              { id: 'finished_good_name', label: 'Finished Good' },
              { id: 'warehouse_name', label: 'Warehouse' },
              {
                id: 'current_quantity',
                label: 'Quantity',
                align: 'right',
                render: (val, row) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                    {val?.toLocaleString()}
                    {row.unit_of_measure && (
                      <Typography variant="caption" color="text.secondary">
                        {row.unit_of_measure}
                      </Typography>
                    )}
                  </Box>
                ),
              },
              {
                id: 'last_receipt_date',
                label: 'Last Receipt',
                render: (val) => val || 'Never',
              },
              {
                id: 'stock_status',
                label: 'Status',
                render: (_, row) => {
                  const qty = row.current_quantity || 0;
                  if (qty === 0) {
                    return <Chip label="Out of Stock" color="error" size="small" />;
                  } else if (qty < 10) {
                    return <Chip label="Low Stock" color="warning" size="small" />;
                  }
                  return <Chip label="In Stock" color="success" size="small" />;
                },
              },
            ]}
            data={inventory}
            searchPlaceholder="Search inventory..."
            searchFields={['finished_good_code', 'finished_good_name', 'warehouse_name']}
            emptyState={{
              icon: InventoryIcon,
              title: 'No finished goods in inventory',
              description: 'Finished goods will appear here after completing FGRs.',
            }}
          />
        </Paper>
      </Grid>
    </Grid>
  );
}
