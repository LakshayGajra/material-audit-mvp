import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
} from '@mui/material';
import { getContractorInventory } from '../api';

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
      setInventory(res.data);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  };

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
          {contractors.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.code} - {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedContractor && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Material Code</TableCell>
                <TableCell>Material Name</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No inventory found
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.material_code}</TableCell>
                    <TableCell>{item.material_name}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell>
                      {item.last_updated
                        ? new Date(item.last_updated).toLocaleString()
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!selectedContractor && (
        <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
          Select a contractor to view inventory
        </Box>
      )}
    </Paper>
  );
}
