import {
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Send as SendIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import WorkflowStepper from '../common/WorkflowStepper';

const STATUS_COLORS = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  APPROVED: 'success',
  PARTIALLY_RECEIVED: 'warning',
  FULLY_RECEIVED: 'success',
  CANCELLED: 'error',
};

export default function ViewPODialog({
  viewDialog,
  setViewDialog,
  selectedPO,
  poGRNs,
  subTab,
  setSubTab,
  handleSubmitPO,
  handleApprovePO,
  openCancelConfirm,
  openGRNDialog,
}) {
  return (
    <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        Purchase Order: {selectedPO?.po_number}
        <Chip
          label={selectedPO?.status}
          color={STATUS_COLORS[selectedPO?.status] || 'default'}
          size="small"
          sx={{ ml: 2 }}
        />
      </DialogTitle>
      <DialogContent>
        {selectedPO && (
          <Box>
            <Box sx={{ mb: 3 }}>
              <WorkflowStepper type="po" status={selectedPO.status} />
            </Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">Supplier</Typography>
                <Typography>{selectedPO.supplier_name}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">Warehouse</Typography>
                <Typography>{selectedPO.warehouse_name}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">Expected Delivery</Typography>
                <Typography>{selectedPO.expected_delivery || 'N/A'}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                <Typography variant="h6">
                  ${selectedPO.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
              </Grid>
            </Grid>

            <Tabs value={subTab} onChange={(e, v) => setSubTab(v)} sx={{ mb: 2 }}>
              <Tab label="Line Items" />
              <Tab label="Goods Receipts" />
            </Tabs>

            {subTab === 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Ordered</TableCell>
                      <TableCell align="right">Received</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPO.lines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.material_code} - {line.material_name}</TableCell>
                        <TableCell align="right">{line.quantity}</TableCell>
                        <TableCell align="right">{line.received_quantity || 0}</TableCell>
                        <TableCell align="right">${line.unit_price?.toFixed(2)}</TableCell>
                        <TableCell align="right">${line.total_price?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip label={line.status} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {subTab === 1 && (
              <Box>
                {poGRNs.length === 0 ? (
                  <Typography color="text.secondary">No goods receipts yet</Typography>
                ) : (
                  <List>
                    {poGRNs.map((grn) => (
                      <ListItem key={grn.id} divider>
                        <ListItemText
                          primary={grn.grn_number}
                          secondary={`Received: ${grn.receipt_date} by ${grn.received_by}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {selectedPO?.status === 'DRAFT' && (
          <Button onClick={() => handleSubmitPO(selectedPO.id)} startIcon={<SendIcon />}>
            Submit
          </Button>
        )}
        {selectedPO?.status === 'SUBMITTED' && (
          <>
            <Button onClick={() => handleApprovePO(selectedPO.id)} color="success" startIcon={<CheckIcon />}>
              Approve
            </Button>
            <Button onClick={() => openCancelConfirm(selectedPO)} color="error" startIcon={<CloseIcon />}>
              Cancel
            </Button>
          </>
        )}
        {(selectedPO?.status === 'APPROVED' || selectedPO?.status === 'PARTIALLY_RECEIVED') && (
          <Button onClick={openGRNDialog} color="primary" startIcon={<ShippingIcon />}>
            Record Receipt
          </Button>
        )}
        <Button onClick={() => setViewDialog(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
