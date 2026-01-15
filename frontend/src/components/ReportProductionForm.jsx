import { useState } from 'react';
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
  Collapse,
} from '@mui/material';
import { reportProduction } from '../api';

export default function ReportProductionForm({ contractors, finishedGoods, onSuccess }) {
  const [contractorId, setContractorId] = useState('');
  const [finishedGoodId, setFinishedGoodId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [productionDate, setProductionDate] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    try {
      const res = await reportProduction({
        contractor_id: parseInt(contractorId),
        finished_good_id: parseInt(finishedGoodId),
        quantity: parseFloat(quantity),
        production_date: productionDate || null,
      });
      setResult(res.data);
      setContractorId('');
      setFinishedGoodId('');
      setQuantity('');
      setProductionDate('');
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to report production');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Report Production
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <Box sx={{ mb: 2 }}>
          <Alert severity={result.warnings.length > 0 ? "warning" : "success"} sx={{ mb: 1 }}>
            Production reported! {result.quantity} units produced.
          </Alert>

          {result.warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Material Shortages Detected:
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Required</TableCell>
                      <TableCell align="right">Available</TableCell>
                      <TableCell align="right">Shortage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.warnings.map((w, i) => (
                      <TableRow key={i}>
                        <TableCell>{w.material_code} - {w.material_name}</TableCell>
                        <TableCell align="right">{w.required.toFixed(2)}</TableCell>
                        <TableCell align="right">{w.available.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {w.shortage.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Alert>
          )}

          {result.consumptions.length > 0 && (
            <Alert severity="info" icon={false}>
              <Typography variant="subtitle2" gutterBottom>
                Materials Consumed:
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.consumptions.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>{c.material_code} - {c.material_name}</TableCell>
                        <TableCell align="right">{c.quantity_consumed.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Alert>
          )}
        </Box>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Contractor</InputLabel>
          <Select
            value={contractorId}
            label="Contractor"
            onChange={(e) => setContractorId(e.target.value)}
            required
          >
            {contractors.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.code} - {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Finished Good</InputLabel>
          <Select
            value={finishedGoodId}
            label="Finished Good"
            onChange={(e) => setFinishedGoodId(e.target.value)}
            required
          >
            {finishedGoods.map((fg) => (
              <MenuItem key={fg.id} value={fg.id}>
                {fg.code} - {fg.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          sx={{ mb: 2 }}
          inputProps={{ min: 0, step: 0.01 }}
        />

        <TextField
          fullWidth
          label="Production Date"
          type="date"
          value={productionDate}
          onChange={(e) => setProductionDate(e.target.value)}
          sx={{ mb: 2 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <Button type="submit" variant="contained" fullWidth>
          Report Production
        </Button>
      </Box>
    </Paper>
  );
}
