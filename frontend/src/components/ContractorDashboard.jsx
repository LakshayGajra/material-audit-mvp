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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  RemoveCircle as RejectIcon,
  Factory as ProductionIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  getContractorInventorySummary,
  getContractorIssuances,
  getRejections,
  getFinishedGoods,
  getBOM,
  reportProduction,
  getErrorMessage,
} from '../api';
import StatusTimeline from './common/StatusTimeline';

export default function ContractorDashboard({ user, onNavigate, initialTab = 0 }) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [inventorySummary, setInventorySummary] = useState([]);
  const [issuances, setIssuances] = useState([]);
  const [rejections, setRejections] = useState([]);

  // Production form
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [selectedFG, setSelectedFG] = useState('');
  const [bomItems, setBomItems] = useState([]);
  const [prodQty, setProdQty] = useState('');
  const [prodStep, setProdStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const contractorId = user?.contractor_id;

  useEffect(() => {
    if (contractorId) {
      loadData();
    }
  }, [contractorId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, issRes, rejRes, fgRes] = await Promise.all([
        getContractorInventorySummary(contractorId),
        getContractorIssuances(contractorId),
        getRejections({ contractor_id: contractorId }),
        getFinishedGoods(),
      ]);
      setInventorySummary(invRes.data || []);
      setIssuances(issRes.data?.items || issRes.data || []);
      setRejections(rejRes.data?.items || rejRes.data || []);
      setFinishedGoods(fgRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const handleFGSelect = async (fgId) => {
    setSelectedFG(fgId);
    setProdStep(1);
    setProdQty('');
    if (fgId) {
      try {
        const res = await getBOM(fgId);
        setBomItems(res.data || []);
        setProdStep(2);
      } catch {
        setBomItems([]);
      }
    } else {
      setBomItems([]);
    }
  };

  const handleSubmitProduction = async () => {
    if (!selectedFG || !prodQty) return;
    setSubmitting(true);
    try {
      await reportProduction({
        contractor_id: contractorId,
        finished_good_id: parseInt(selectedFG),
        quantity: parseFloat(prodQty),
      });
      setSuccess('Production reported successfully');
      setSelectedFG('');
      setProdQty('');
      setBomItems([]);
      setProdStep(1);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to report production'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!contractorId) {
    return (
      <Alert severity="warning">
        Your account is not linked to a contractor. Please contact an administrator.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const pendingRejections = rejections.filter((r) => r.status === 'REPORTED' || r.status === 'DISPUTED').length;

  return (
    <Grid container spacing={3}>
      {error && (
        <Grid size={12}>
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Grid>
      )}
      {success && (
        <Grid size={12}>
          <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
        </Grid>
      )}

      {/* Summary Cards */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">{inventorySummary.length}</Typography>
                <Typography variant="body2" color="text.secondary">Materials Held</Typography>
              </Box>
              <InventoryIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">{pendingRejections}</Typography>
                <Typography variant="body2" color="text.secondary">Pending Rejections</Typography>
              </Box>
              <RejectIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4">{issuances.length}</Typography>
                <Typography variant="body2" color="text.secondary">Total Issuances</Typography>
              </Box>
              <ShippingIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Tabs */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="My Inventory" />
            <Tab label="My Issuances" />
            <Tab label="My Rejections" />
          </Tabs>

          {/* Tab 0: Inventory Summary */}
          {tab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right">Total Issued</TableCell>
                    <TableCell align="right">Total Consumed</TableCell>
                    <TableCell align="right">Current Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventorySummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No inventory data</TableCell>
                    </TableRow>
                  ) : (
                    inventorySummary.map((item) => (
                      <TableRow key={item.material_id}>
                        <TableCell>{item.material_code} - {item.material_name}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell align="right">{item.total_issued.toFixed(2)}</TableCell>
                        <TableCell align="right">{item.total_consumed.toFixed(2)}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>{item.current_qty.toFixed(2)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 1: Issuances */}
          {tab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Issuance #</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Issued By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {issuances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No issuances</TableCell>
                    </TableRow>
                  ) : (
                    issuances.map((iss) => (
                      <TableRow key={iss.id}>
                        <TableCell>{iss.issuance_number}</TableCell>
                        <TableCell>{iss.material_code} - {iss.material_name}</TableCell>
                        <TableCell align="right">{iss.quantity}</TableCell>
                        <TableCell>{iss.unit_of_measure}</TableCell>
                        <TableCell>{iss.issued_date}</TableCell>
                        <TableCell>{iss.issued_by}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 2: Rejections */}
          {tab === 2 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rejection #</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Timeline</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rejections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No rejections</TableCell>
                    </TableRow>
                  ) : (
                    rejections.map((rej) => (
                      <TableRow key={rej.id}>
                        <TableCell>{rej.rejection_number}</TableCell>
                        <TableCell>{rej.material_code} - {rej.material_name}</TableCell>
                        <TableCell align="right">{rej.quantity} {rej.unit_of_measure}</TableCell>
                        <TableCell>{rej.rejection_reason}</TableCell>
                        <TableCell>
                          <Chip
                            label={rej.status}
                            size="small"
                            color={
                              rej.status === 'RECEIVED' ? 'success' :
                              rej.status === 'DISPUTED' ? 'error' :
                              rej.status === 'APPROVED' || rej.status === 'IN_TRANSIT' ? 'info' :
                              'warning'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <StatusTimeline status={rej.status} />
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

      {/* Quick Production Form */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <ProductionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Quick Production Report
          </Typography>

          <Stepper activeStep={prodStep - 1} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Select Product</StepLabel>
            </Step>
            <Step>
              <StepLabel>Enter Quantity & Confirm</StepLabel>
            </Step>
          </Stepper>

          <Grid container spacing={2} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Finished Good</InputLabel>
                <Select
                  value={selectedFG}
                  label="Finished Good"
                  onChange={(e) => handleFGSelect(e.target.value)}
                >
                  <MenuItem value="">Select...</MenuItem>
                  {finishedGoods.map((fg) => (
                    <MenuItem key={fg.id} value={fg.id}>{fg.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {prodStep >= 2 && (
              <>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={prodQty}
                    onChange={(e) => setProdQty(e.target.value)}
                    fullWidth
                    inputProps={{ min: 1, step: 1 }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={handleSubmitProduction}
                    disabled={!prodQty || submitting}
                    fullWidth
                    sx={{ height: 56 }}
                  >
                    Report
                  </Button>
                </Grid>

                {/* BOM preview */}
                <Grid size={{ xs: 12, md: 3 }}>
                  {bomItems.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                        BOM per unit:
                      </Typography>
                      {bomItems.map((bom) => (
                        <Typography key={bom.id} variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {bom.material_name}: {bom.quantity_required} {bom.unit}
                          {prodQty && (
                            <strong> (total: {(bom.quantity_required * parseFloat(prodQty || 0)).toFixed(2)})</strong>
                          )}
                        </Typography>
                      ))}
                    </Paper>
                  )}
                </Grid>
              </>
            )}
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
}
