import { useState } from 'react';
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
  Checkbox,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
  DoneAll as BatchIcon,
} from '@mui/icons-material';
import { DataTable } from '../common';
import WorkflowStepper from '../common/WorkflowStepper';

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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState('');

  const submittedOrders = orders.filter((o) => o.status === 'SUBMITTED');
  const allSubmittedSelected = submittedOrders.length > 0 &&
    submittedOrders.every((o) => selectedIds.has(o.id));

  const handleToggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (allSubmittedSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submittedOrders.map((o) => o.id)));
    }
  };

  const handleBatchApprove = async () => {
    const ids = [...selectedIds].filter((id) =>
      orders.find((o) => o.id === id && o.status === 'SUBMITTED')
    );
    if (ids.length === 0) return;

    setBatchLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        await handleApprovePO(id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBatchLoading(false);
    setSelectedIds(new Set());
    setBatchResult(
      failCount > 0
        ? `Approved ${successCount} POs, ${failCount} failed`
        : `Approved ${successCount} POs`
    );
    setTimeout(() => setBatchResult(''), 3000);
    loadOrders();
  };

  const selectedCount = [...selectedIds].filter((id) =>
    orders.find((o) => o.id === id && o.status === 'SUBMITTED')
  ).length;

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

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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

            {/* Batch approve controls */}
            {submittedOrders.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 'auto' }}>
                <Tooltip title={allSubmittedSelected ? 'Deselect all submitted' : 'Select all submitted'}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleToggleAll}
                  >
                    {allSubmittedSelected ? 'Deselect All' : `Select All Submitted (${submittedOrders.length})`}
                  </Button>
                </Tooltip>
                {selectedCount > 0 && (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<BatchIcon />}
                    onClick={handleBatchApprove}
                    disabled={batchLoading}
                  >
                    {batchLoading ? 'Approving...' : `Approve ${selectedCount} POs`}
                  </Button>
                )}
              </Box>
            )}
          </Box>

          {batchResult && (
            <Alert severity="success" sx={{ mt: 2 }}>{batchResult}</Alert>
          )}
        </Paper>
      </Grid>

      {/* PO List */}
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <DataTable
            columns={[
              {
                id: '_select',
                label: '',
                sortable: false,
                width: 40,
                render: (_, po) =>
                  po.status === 'SUBMITTED' ? (
                    <Checkbox
                      size="small"
                      checked={selectedIds.has(po.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleToggle(po.id)}
                    />
                  ) : null,
              },
              { id: 'po_number', label: 'PO Number' },
              { id: 'supplier_name', label: 'Supplier' },
              { id: 'warehouse_name', label: 'Warehouse' },
              {
                id: 'status',
                label: 'Status',
                render: (val) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={val}
                      color={STATUS_COLORS[val] || 'default'}
                      size="small"
                    />
                  </Box>
                ),
              },
              {
                id: '_workflow',
                label: 'Progress',
                sortable: false,
                render: (_, po) => (
                  <WorkflowStepper type="po" status={po.status} compact />
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
