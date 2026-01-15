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
import { getProductionHistory } from '../api';

export default function ProductionHistory({ contractors, refreshKey }) {
  const [selectedContractor, setSelectedContractor] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (selectedContractor) {
      loadHistory();
    }
  }, [selectedContractor, refreshKey]);

  const loadHistory = async () => {
    try {
      const res = await getProductionHistory(selectedContractor);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load production history:', err);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Production History
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
                <TableCell>Date</TableCell>
                <TableCell>Finished Good</TableCell>
                <TableCell align="right">Quantity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No production history found
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.production_date}</TableCell>
                    <TableCell>{item.finished_good_code} - {item.finished_good_name}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!selectedContractor && (
        <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
          Select a contractor to view production history
        </Box>
      )}
    </Paper>
  );
}
