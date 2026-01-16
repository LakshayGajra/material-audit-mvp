import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getAnomalies, resolveAnomaly } from '../api';

export default function AnomalyList() {
  const [anomalies, setAnomalies] = useState([]);
  const [filter, setFilter] = useState('unresolved');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnomalies();
  }, [filter]);

  const loadAnomalies = async () => {
    try {
      const resolved = filter === 'all' ? undefined : filter === 'resolved';
      const res = await getAnomalies(resolved);
      setAnomalies(res.data);
    } catch (err) {
      console.error('Failed to load anomalies:', err);
    }
  };

  const handleResolve = async (anomalyId) => {
    setError('');
    try {
      await resolveAnomaly(anomalyId);
      loadAnomalies();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resolve anomaly');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Anomalies
        </Typography>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(e, v) => v && setFilter(v)}
          size="small"
        >
          <ToggleButton value="unresolved">Unresolved</ToggleButton>
          <ToggleButton value="resolved">Resolved</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Contractor</TableCell>
              <TableCell>Material</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Expected</TableCell>
              <TableCell align="right">Actual</TableCell>
              <TableCell align="right">Variance %</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anomalies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No anomalies found
                </TableCell>
              </TableRow>
            ) : (
              anomalies.map((a) => (
                <TableRow key={a.id} sx={{ bgcolor: a.resolved ? 'action.hover' : 'inherit' }}>
                  <TableCell>{formatDate(a.created_at)}</TableCell>
                  <TableCell>{a.contractor_name}</TableCell>
                  <TableCell>{a.material_code} - {a.material_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={a.anomaly_type}
                      size="small"
                      color={a.anomaly_type === 'shortage' ? 'error' : 'warning'}
                    />
                  </TableCell>
                  <TableCell align="right">{a.expected_quantity.toFixed(2)}</TableCell>
                  <TableCell align="right">{a.actual_quantity.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                    {a.variance_percent.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    {a.resolved ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Resolved"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    ) : (
                      <Chip label="Open" size="small" color="error" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {!a.resolved && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleResolve(a.id)}
                      >
                        Resolve
                      </Button>
                    )}
                    {a.resolved && a.resolved_at && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(a.resolved_at)}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
