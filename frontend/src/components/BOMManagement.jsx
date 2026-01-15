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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getBOM, addBOMItem, deleteBOMItem } from '../api';

export default function BOMManagement({ finishedGoods, materials }) {
  const [selectedFG, setSelectedFG] = useState('');
  const [bom, setBom] = useState(null);
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (selectedFG) {
      loadBOM();
    } else {
      setBom(null);
    }
  }, [selectedFG]);

  const loadBOM = async () => {
    try {
      const res = await getBOM(selectedFG);
      setBom(res.data);
    } catch (err) {
      console.error('Failed to load BOM:', err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await addBOMItem({
        finished_good_id: parseInt(selectedFG),
        material_id: parseInt(materialId),
        quantity_per_unit: parseFloat(quantity),
      });
      setSuccess('BOM item added!');
      setMaterialId('');
      setQuantity('');
      loadBOM();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add BOM item');
    }
  };

  const handleDelete = async (bomId) => {
    try {
      await deleteBOMItem(bomId);
      loadBOM();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete BOM item');
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Bill of Materials (BOM) Management
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Finished Good</InputLabel>
          <Select
            value={selectedFG}
            label="Select Finished Good"
            onChange={(e) => setSelectedFG(e.target.value)}
          >
            {finishedGoods.map((fg) => (
              <MenuItem key={fg.id} value={fg.id}>
                {fg.code} - {fg.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedFG && (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Typography variant="subtitle1" gutterBottom>
              Add Material to BOM
            </Typography>

            <Box component="form" onSubmit={handleAddItem} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200, flex: 1 }}>
                  <InputLabel>Material</InputLabel>
                  <Select
                    value={materialId}
                    label="Material"
                    onChange={(e) => setMaterialId(e.target.value)}
                    required
                  >
                    {materials.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.code} - {m.name} ({m.unit})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Qty per Unit"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  sx={{ width: 150 }}
                  inputProps={{ min: 0, step: 0.01 }}
                />

                <Button type="submit" variant="contained" sx={{ height: 56 }}>
                  Add
                </Button>
              </Box>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Current BOM Items
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material Code</TableCell>
                    <TableCell>Material Name</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right">Qty per Unit</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!bom || bom.items.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No BOM items defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    bom.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.material_code}</TableCell>
                        <TableCell>{item.material_name}</TableCell>
                        <TableCell>{item.material_unit}</TableCell>
                        <TableCell align="right">{item.quantity_per_unit}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(item.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {!selectedFG && (
          <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
            Select a finished good to manage its BOM
          </Box>
        )}
      </Paper>
    </Box>
  );
}
