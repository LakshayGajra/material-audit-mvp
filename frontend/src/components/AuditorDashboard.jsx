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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  FactCheck as CheckIcon,
  Warning as AnomalyIcon,
  PlayArrow as StartIcon,
  Refresh as RefreshIcon,
  RateReview as ReviewIcon,
} from '@mui/icons-material';
import {
  getDashboardSummary,
  getContractorRankings,
  getInventoryChecks,
  getErrorMessage,
} from '../api';

export default function AuditorDashboard({ user, onNavigate }) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [myChecks, setMyChecks] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summRes, rankRes, checksRes] = await Promise.all([
        getDashboardSummary(),
        getContractorRankings(),
        getInventoryChecks({ initiated_by: user?.username }),
      ]);
      setSummary(summRes.data);
      setRankings(rankRes.data || []);
      setMyChecks(checksRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load data'));
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

  return (
    <Grid container spacing={3}>
      {error && (
        <Grid size={12}>
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Grid>
      )}

      {/* Summary Cards */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">{summary?.inventory_checks?.in_progress || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Checks In Progress</Typography>
              </Box>
              <CheckIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">{summary?.inventory_checks?.pending_review || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Pending Reviews</Typography>
              </Box>
              <ReviewIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">{summary?.anomalies?.open || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Open Anomalies</Typography>
              </Box>
              <AnomalyIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid size={12}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<StartIcon />}
            onClick={() => onNavigate?.({ module: 'verification', subPage: 'inventory-checks' })}
          >
            Start New Check
          </Button>
          <Button
            variant="outlined"
            startIcon={<ReviewIcon />}
            onClick={() => onNavigate?.({ module: 'verification', subPage: 'inventory-checks' })}
          >
            Review Queue
          </Button>
        </Box>
      </Grid>

      {/* Tabs */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="Contractor Rankings" />
            <Tab label="My Audits" />
          </Tabs>

          {/* Tab 0: Contractor Rankings */}
          {tab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contractor</TableCell>
                    <TableCell align="right">Open Anomalies</TableCell>
                    <TableCell align="right">Max Variance %</TableCell>
                    <TableCell>Last Check Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rankings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No contractors found</TableCell>
                    </TableRow>
                  ) : (
                    rankings.map((r) => (
                      <TableRow key={r.contractor_id}>
                        <TableCell>
                          <Typography fontWeight={500}>{r.contractor_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.contractor_code}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {r.open_anomaly_count > 0 ? (
                            <Chip
                              label={r.open_anomaly_count}
                              color="error"
                              size="small"
                            />
                          ) : (
                            <Chip label="0" color="success" size="small" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={r.max_variance_percent > 10 ? 'error.main' :
                              r.max_variance_percent > 5 ? 'warning.main' : 'text.primary'}
                          >
                            {r.max_variance_percent.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell>{r.last_check_date || 'Never'}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<StartIcon />}
                            onClick={() => onNavigate?.({ module: 'verification', subPage: 'inventory-checks' })}
                          >
                            Start Check
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 1: My Audits */}
          {tab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Check #</TableCell>
                    <TableCell>Contractor</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Lines</TableCell>
                    <TableCell>Variances</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myChecks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">No audits found</TableCell>
                    </TableRow>
                  ) : (
                    myChecks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell>{check.check_number}</TableCell>
                        <TableCell>{check.contractor_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={check.check_type === 'audit' ? 'Audit' : 'Self Report'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={check.status}
                            size="small"
                            color={
                              check.status === 'resolved' ? 'success' :
                              check.status === 'review' ? 'info' :
                              check.status === 'counting' ? 'warning' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{check.check_date}</TableCell>
                        <TableCell>{check.total_lines}</TableCell>
                        <TableCell>
                          {check.lines_with_variance > 0 ? (
                            <Chip label={check.lines_with_variance} color="warning" size="small" />
                          ) : (
                            <Chip label="0" size="small" color="success" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => onNavigate?.({ module: 'verification', subPage: 'inventory-checks' })}
                          >
                            {check.status === 'resolved' ? 'Re-check' : 'Continue'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
