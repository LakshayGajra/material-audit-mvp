import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import PersonIcon from '@mui/icons-material/Person';
import { getContractorInventory } from '../api';
import { DataTable, EmptyState } from './common';

export default function ContractorInventory({ contractors, refreshKey }) {
  const [selectedContractor, setSelectedContractor] = useState('');
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    if (selectedContractor) {
      loadInventory();
    }
  }, [selectedContractor, refreshKey]);

  const loadInventory = async () => {
    try {
      const res = await getContractorInventory(selectedContractor);
      setInventory(res.data || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setInventory([]);
    }
  };

  const columns = [
    { id: 'material_code', label: 'Material Code' },
    { id: 'material_name', label: 'Material Name' },
    {
      id: 'quantity',
      label: 'Quantity',
      align: 'right',
      render: (val) => val?.toLocaleString(),
    },
    {
      id: 'last_updated',
      label: 'Last Updated',
      render: (val) => (val ? new Date(val).toLocaleString() : '-'),
    },
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Contractor Inventory
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Contractor</InputLabel>
        <Select
          value={selectedContractor}
          label="Select Contractor"
          onChange={(e) => setSelectedContractor(e.target.value)}
        >
          {(contractors || []).map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.code} - {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedContractor ? (
        <DataTable
          columns={columns}
          data={inventory}
          searchPlaceholder="Search materials..."
          searchFields={['material_code', 'material_name']}
          emptyState={{
            icon: InventoryIcon,
            title: 'No inventory',
            description: 'This contractor has no materials issued yet.',
          }}
        />
      ) : (
        <EmptyState
          icon={PersonIcon}
          title="Select a contractor"
          description="Choose a contractor from the dropdown to view their inventory."
        />
      )}
    </Paper>
  );
}
