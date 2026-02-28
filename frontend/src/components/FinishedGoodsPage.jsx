import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
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
} from '@mui/material';
import { getFinishedGoods, createFinishedGood, getErrorMessage } from '../api';
import useAutoDismiss from '../hooks/useAutoDismiss';

export default function FinishedGoodsPage() {
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useAutoDismiss(success, setSuccess);

  useEffect(() => {
    loadFinishedGoods();
  }, []);

  const loadFinishedGoods = async () => {
    try {
      const res = await getFinishedGoods();
      setFinishedGoods(res.data || []);
    } catch (err) {
      console.error('Failed to load finished goods:', err);
      setFinishedGoods([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await createFinishedGood({ code, name });
      setSuccess('Finished good created!');
      setCode('');
      setName('');
      loadFinishedGoods();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create finished good'));
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Create Finished Good
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" fullWidth>
            Create Finished Good
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Finished Goods List
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {finishedGoods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No finished goods found
                  </TableCell>
                </TableRow>
              ) : (
                finishedGoods.map((fg) => (
                  <TableRow key={fg.id}>
                    <TableCell>{fg.code}</TableCell>
                    <TableCell>{fg.name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
