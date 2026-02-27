import {
  Paper,
  Typography,
  Grid,
  Button,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { DataTable } from '../common';

const STATUS_COLORS = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  APPROVED: 'success',
  PARTIALLY_RECEIVED: 'warning',
  FULLY_RECEIVED: 'success',
  CANCELLED: 'error',
};

export default function POListView({
  orders,
  statusFilter,
  setStatusFilter,
  loadOrders,
  setCreateDialog,
  setSupplierDialog,
  handleViewPO,
  handleSubmitPO,
  handleApprovePO,
  openCancelConfirm,
}) {
  return (
    <>
      {/* Header */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Purchase Orders</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setSupplierDialog(true)}
                size="small"
              >
                New Supplier
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog(true)}
              >
                New Purchase Order
              </Button>
            </Box>
          </Box>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              label="Filter by Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setTimeout(loadOrders, 0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="SUBMITTED">Submitted</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="PARTIALLY_RECEIVED">Partially Received</MenuItem>
              <MenuItem value="FULLY_RECEIVED">Fully Received</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Grid>

      {/* PO List */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <DataTable
            columns={[
              { id: 'po_number', label: 'PO Number' },
              { id: 'supplier_name', label: 'Supplier' },
              { id: 'warehouse_name', label: 'Warehouse' },
              {
                id: 'status',
                label: 'Status',
                render: (val) => (
                  <Chip
                    label={val}
                    color={STATUS_COLORS[val] || 'default'}
                    size="small"
                  />
                ),
              },
              {
                id: 'total_amount',
                label: 'Total',
                align: 'right',
                render: (val) => `$${val?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              },
              {
                id: 'expected_delivery',
                label: 'Expected Delivery',
                render: (val) => val || '-',
              },
            ]}
            data={orders}
            searchPlaceholder="Search purchase orders..."
            searchFields={['po_number', 'supplier_name', 'warehouse_name', 'status']}
            renderRowActions={(po) => (
              <>
                <Tooltip title="View details">
                  <IconButton size="small" onClick={() => handleViewPO(po.id)}>
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                {po.status === 'DRAFT' && (
                  <Tooltip title="Submit for approval">
                    <IconButton size="small" onClick={() => handleSubmitPO(po.id)}>
                      <SendIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                )}
                {po.status === 'SUBMITTED' && (
                  <>
                    <Tooltip title="Approve">
                      <IconButton size="small" onClick={() => handleApprovePO(po.id)}>
                        <CheckIcon color="success" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel">
                      <IconButton size="small" onClick={() => openCancelConfirm(po)}>
                        <CloseIcon color="error" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </>
            )}
            emptyState={{
              icon: ReceiptIcon,
              title: 'No purchase orders',
              description: 'Create your first purchase order to start tracking material procurement.',
              actionLabel: 'New Purchase Order',
              onAction: () => setCreateDialog(true),
            }}
          />
        </Paper>
      </Grid>
    </>
  );
}
