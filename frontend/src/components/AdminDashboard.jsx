import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Box,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Warning as AnomalyIcon,
  Receipt as POIcon,
  RemoveCircle as RejectIcon,
  FactCheck as CheckIcon,
  TrendingUp as TrendIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getDashboardSummary, getAnomalies, getErrorMessage } from '../api';

export default function AdminDashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anomalyTrend, setAnomalyTrend] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summRes, anomRes] = await Promise.all([
        getDashboardSummary(),
        getAnomalies(),
      ]);
      setSummary(summRes.data);

      // Build anomaly trend
      const anomalies = anomRes.data || [];
      const byDate = {};
      anomalies.forEach((a) => {
        const date = a.created_at?.split('T')[0] || 'Unknown';
        byDate[date] = (byDate[date] || 0) + 1;
      });
      const trend = Object.entries(byDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7);
      setAnomalyTrend(trend);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
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

  const actionCards = [
    {
      count: summary?.purchase_orders?.pending_approval || 0,
      label: 'POs pending approval',
      icon: POIcon,
      color: 'info.main',
      bgColor: 'info.light',
      navigate: { module: 'procurement', subPage: 'pos' },
    },
    {
      count: summary?.rejections?.pending_approval || 0,
      label: 'Rejections to review',
      icon: RejectIcon,
      color: 'warning.main',
      bgColor: 'warning.light',
      navigate: { module: 'contractor', subPage: 'rejections' },
    },
    {
      count: summary?.anomalies?.open || 0,
      label: 'Anomalies unresolved',
      icon: AnomalyIcon,
      color: 'error.main',
      bgColor: 'error.light',
      navigate: { module: 'verification', subPage: 'anomalies' },
    },
    {
      count: summary?.inventory_checks?.pending_review || 0,
      label: 'Checks pending review',
      icon: CheckIcon,
      color: 'success.main',
      bgColor: 'success.light',
      navigate: { module: 'verification', subPage: 'inventory-checks' },
    },
  ];

  const totalContractors = summary?.contractors?.total || 0;
  const activeContractors = summary?.contractors?.active || 0;

  return (
    <Grid container spacing={3}>
      {/* Action-Required Cards */}
      {actionCards.map((card) => {
        const Icon = card.icon;
        return (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <Card
              sx={{
                bgcolor: card.count > 0 ? card.bgColor : 'background.paper',
                color: card.count > 0 ? `${card.color.split('.')[0]}.contrastText` : 'text.primary',
              }}
            >
              <CardActionArea onClick={() => onNavigate?.(card.navigate)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h3" fontWeight={700}>{card.count}</Typography>
                      <Typography variant="body2">{card.label}</Typography>
                    </Box>
                    <Icon sx={{ fontSize: 48, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}

      {/* Anomaly Rate Trend */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            <TrendIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Anomaly Rate Trend
          </Typography>
          {anomalyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={anomalyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#d32f2f" name="Anomalies" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
              <Typography color="text.secondary">No anomaly data available</Typography>
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
              <ListItemText
                primary="Warehouses"
                secondary={`${summary?.warehouses?.total || 0} total`}
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
                primary="Contractors"
                secondary={`${activeContractors} active / ${totalContractors} total`}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Contractor Compliance"
                secondary={`${totalContractors - (summary?.anomalies?.contractors_with_anomalies || 0)} / ${totalContractors} with 0 anomalies`}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText
                primary="Checks In Progress"
                secondary={`${summary?.inventory_checks?.in_progress || 0}`}
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>

      {/* Recent Activity */}
      <Grid size={{ xs: 12 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Recent Activity</Typography>
          {summary?.recent_activity?.length > 0 ? (
            <List dense>
              {summary.recent_activity.slice(0, 8).map((activity, idx) => (
                <ListItem key={idx}>
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
