import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  PlayArrow as StartIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getDashboardSummary, getAnomalies } from '../api';

const SEVERITY_COLORS = {
  CRITICAL: '#d32f2f',
  HIGH: '#f57c00',
  MEDIUM: '#fbc02d',
  LOW: '#388e3c',
};

const ACTIVITY_ICONS = {
  issuance: <ShippingIcon color="primary" />,
  production: <InventoryIcon color="success" />,
  anomaly: <WarningIcon color="error" />,
  audit: <AssessmentIcon color="info" />,
};

export default function DashboardPage({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anomalyHistory, setAnomalyHistory] = useState([]);

  useEffect(() => {
    loadDashboard();
    loadAnomalyTrend();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await getDashboardSummary();
      setSummary(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadAnomalyTrend = async () => {
    try {
      const res = await getAnomalies();
      // Group anomalies by date for trend chart
      const anomalies = res.data || [];
      const byDate = {};
      anomalies.forEach((a) => {
        const date = a.created_at?.split('T')[0] || 'Unknown';
        byDate[date] = (byDate[date] || 0) + 1;
      });

      // Convert to array and sort
      const trend = Object.entries(byDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Last 7 days

      setAnomalyHistory(trend);
    } catch (err) {
      console.error('Failed to load anomaly trend', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const severityData = summary?.anomalies?.by_severity
    ? [
        { name: 'Critical', value: summary.anomalies.by_severity.CRITICAL, color: SEVERITY_COLORS.CRITICAL },
        { name: 'High', value: summary.anomalies.by_severity.HIGH, color: SEVERITY_COLORS.HIGH },
        { name: 'Medium', value: summary.anomalies.by_severity.MEDIUM, color: SEVERITY_COLORS.MEDIUM },
        { name: 'Low', value: summary.anomalies.by_severity.LOW, color: SEVERITY_COLORS.LOW },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <Grid container spacing={3}>
      {/* Summary Cards Row 1 */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">{summary?.anomalies?.open || 0}</Typography>
                <Typography variant="body2">Open Anomalies</Typography>
              </Box>
              <WarningIcon sx={{ fontSize: 48, opacity: 0.7 }} />
            </Box>
            {summary?.anomalies?.by_severity && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {summary.anomalies.by_severity.CRITICAL > 0 && (
                  <Chip label={`${summary.anomalies.by_severity.CRITICAL} Critical`} size="small" color="error" />
                )}
                {summary.anomalies.by_severity.HIGH > 0 && (
                  <Chip label={`${summary.anomalies.by_severity.HIGH} High`} size="small" color="warning" />
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">{summary?.warehouses?.low_stock_items || 0}</Typography>
                <Typography variant="body2">Low Stock Items</Typography>
              </Box>
              <InventoryIcon sx={{ fontSize: 48, opacity: 0.7 }} />
            </Box>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Across {summary?.warehouses?.total || 0} warehouses
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">
                  {(summary?.purchase_orders?.pending_approval || 0) +
                    (summary?.rejections?.pending_approval || 0)}
                </Typography>
                <Typography variant="body2">Pending Approvals</Typography>
              </Box>
              <CheckIcon sx={{ fontSize: 48, opacity: 0.7 }} />
            </Box>
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
              <Chip label={`${summary?.purchase_orders?.pending_approval || 0} POs`} size="small" />
              <Chip label={`${summary?.rejections?.pending_approval || 0} Rej`} size="small" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">
                  {(summary?.audits?.pending_analysis || 0) +
                    (summary?.reconciliations?.pending_review || 0)}
                </Typography>
                <Typography variant="body2">Pending Reviews</Typography>
              </Box>
              <AssessmentIcon sx={{ fontSize: 48, opacity: 0.7 }} />
            </Box>
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
              <Chip label={`${summary?.audits?.pending_analysis || 0} Audits`} size="small" />
              <Chip label={`${summary?.reconciliations?.pending_review || 0} Recon`} size="small" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Quick Actions</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ShippingIcon />}
              onClick={() => onNavigate?.(1)}
              fullWidth
            >
              Issue Material
            </Button>
            <Button
              variant="outlined"
              startIcon={<StartIcon />}
              onClick={() => onNavigate?.(8)}
              fullWidth
            >
              Start Audit
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => onNavigate?.(6)}
              fullWidth
            >
              Create Purchase Order
            </Button>
            <Button
              variant="outlined"
              startIcon={<ReceiptIcon />}
              onClick={() => onNavigate?.(9)}
              fullWidth
            >
              Submit Reconciliation
            </Button>
          </Box>
        </Paper>
      </Grid>

      {/* Anomaly Trend Chart */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Anomaly Trend (Last 7 Days)</Typography>
          {anomalyHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={anomalyHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#d32f2f"
                  name="Anomalies"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
              <Typography color="text.secondary">No anomaly data available</Typography>
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Anomaly Severity Distribution */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Anomaly Severity</Typography>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
              <Typography color="text.secondary">No open anomalies</Typography>
            </Box>
          )}
        </Paper>
      </Grid>

      {/* System Overview */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>System Overview</Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="Warehouses" secondary={`${summary?.warehouses?.total || 0} total`} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Contractors"
                secondary={`${summary?.contractors?.active || 0} active / ${summary?.contractors?.total || 0} total`}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Materials"
                secondary={`${summary?.materials?.in_circulation || 0} in circulation / ${summary?.materials?.total || 0} total`}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Audits In Progress"
                secondary={`${summary?.audits?.in_progress || 0}`}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="POs Awaiting Receipt"
                secondary={`${summary?.purchase_orders?.awaiting_receipt || 0}`}
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>

      {/* Recent Activity */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Recent Activity</Typography>
          {summary?.recent_activity?.length > 0 ? (
            <List dense>
              {summary.recent_activity.slice(0, 5).map((activity, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon>{ACTIVITY_ICONS[activity.type] || <TrendIcon />}</ListItemIcon>
                  <ListItemText
                    primary={activity.description}
                    secondary={new Date(activity.timestamp).toLocaleString()}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">No recent activity</Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
