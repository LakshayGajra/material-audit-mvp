import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Chip,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { getAnomalies, resolveAnomaly, getErrorMessage } from '../api';
import { DataTable } from './common';

export default function AnomalyList() {
  const [anomalies, setAnomalies] = useState([]);
  const [filter, setFilter] = useState('unresolved');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAnomalies();
  }, [filter]);

  const loadAnomalies = async () => {
    try {
      const resolved = filter === 'all' ? undefined : filter === 'resolved';
      const res = await getAnomalies(resolved);
      setAnomalies(res.data || []);
    } catch (err) {
      console.error('Failed to load anomalies:', err);
      setAnomalies([]);
    }
  };

  const handleResolve = async (anomalyId) => {
    setError('');
    try {
      await resolveAnomaly(anomalyId);
      setSuccess('Anomaly resolved successfully');
      loadAnomalies();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resolve anomaly'));
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  const columns = [
    {
      id: 'created_at',
      label: 'Date',
      render: (val) => formatDate(val),
    },
    {
      id: 'contractor_name',
      label: 'Contractor',
    },
    {
      id: 'material_name',
      label: 'Material',
      render: (val, row) => `${row.material_code} - ${val}`,
    },
    {
      id: 'anomaly_type',
      label: 'Type',
      render: (val) => (
        <Chip
          label={val}
          size="small"
          color={val === 'shortage' ? 'error' : 'warning'}
        />
      ),
    },
    {
      id: 'expected_quantity',
      label: 'Expected',
      align: 'right',
      render: (val) => val?.toFixed(2),
    },
    {
      id: 'actual_quantity',
      label: 'Actual',
      align: 'right',
      render: (val) => val?.toFixed(2),
    },
    {
      id: 'variance_percent',
      label: 'Variance %',
      align: 'right',
      render: (val) => (
        <Typography
          component="span"
          sx={{ color: 'error.main', fontWeight: 600 }}
        >
          {val?.toFixed(2)}%
        </Typography>
      ),
    },
    {
      id: 'resolved',
      label: 'Status',
      render: (val) =>
        val ? (
          <Chip
            icon={<CheckCircleIcon />}
            label="Resolved"
            size="small"
            color="success"
            variant="outlined"
          />
        ) : (
          <Chip label="Open" size="small" color="error" />
        ),
    },
  ];

  const renderRowActions = (row) => {
    if (row.resolved) {
      return (
        <Typography variant="caption" color="text.secondary">
          {row.resolved_at ? formatDate(row.resolved_at) : ''}
        </Typography>
      );
    }
    return (
      <Tooltip title="Mark as resolved">
        <IconButton
          size="small"
          color="success"
          onClick={(e) => {
            e.stopPropagation();
            handleResolve(row.id);
          }}
        >
          <CheckCircleIcon />
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Anomalies</Typography>
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

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={anomalies}
        searchPlaceholder="Search anomalies..."
        searchFields={['contractor_name', 'material_code', 'material_name', 'anomaly_type']}
        renderRowActions={renderRowActions}
        getRowStyle={(row) => ({
          bgcolor: row.resolved ? 'action.hover' : 'inherit',
        })}
        emptyState={{
          icon: WarningIcon,
          title: filter === 'unresolved' ? 'No open anomalies' : 'No anomalies found',
          description:
            filter === 'unresolved'
              ? 'All anomalies have been resolved. Great job!'
              : 'Anomalies will appear here when inventory discrepancies are detected.',
        }}
      />
    </Paper>
  );
}
