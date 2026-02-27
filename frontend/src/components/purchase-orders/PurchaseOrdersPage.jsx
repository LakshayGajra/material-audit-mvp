import { Grid, Alert } from '@mui/material';
import { ConfirmDialog } from '../common';
import usePurchaseOrders from './usePurchaseOrders';
import POListView from './POListView';
import CreatePODialog from './CreatePODialog';
import ViewPODialog from './ViewPODialog';
import GRNDialog from './GRNDialog';
import CreateSupplierDialog from './CreateSupplierDialog';

export default function PurchaseOrdersPage({ materials, refreshKey }) {
  const state = usePurchaseOrders(materials, refreshKey);

  return (
    <Grid container spacing={3}>
      {state.error && (
        <Grid size={12}>
          <Alert severity="error" onClose={() => state.setError('')}>{state.error}</Alert>
        </Grid>
      )}
      {state.success && (
        <Grid size={12}>
          <Alert severity="success" onClose={() => state.setSuccess('')}>{state.success}</Alert>
        </Grid>
      )}

      <POListView
        orders={state.orders}
        statusFilter={state.statusFilter}
        setStatusFilter={state.setStatusFilter}
        loadOrders={state.loadOrders}
        setCreateDialog={state.setCreateDialog}
        setSupplierDialog={state.setSupplierDialog}
        handleViewPO={state.handleViewPO}
        handleSubmitPO={state.handleSubmitPO}
        handleApprovePO={state.handleApprovePO}
        openCancelConfirm={state.openCancelConfirm}
      />

      <CreatePODialog
        createDialog={state.createDialog}
        setCreateDialog={state.setCreateDialog}
        newPO={state.newPO}
        setNewPO={state.setNewPO}
        newLine={state.newLine}
        setNewLine={state.setNewLine}
        suppliers={state.suppliers}
        warehouses={state.warehouses}
        materials={materials}
        handleCreatePO={state.handleCreatePO}
        handleAddLine={state.handleAddLine}
        handleRemoveLine={state.handleRemoveLine}
      />

      <ViewPODialog
        viewDialog={state.viewDialog}
        setViewDialog={state.setViewDialog}
        selectedPO={state.selectedPO}
        poGRNs={state.poGRNs}
        subTab={state.subTab}
        setSubTab={state.setSubTab}
        handleSubmitPO={state.handleSubmitPO}
        handleApprovePO={state.handleApprovePO}
        openCancelConfirm={state.openCancelConfirm}
        openGRNDialog={state.openGRNDialog}
      />

      <GRNDialog
        grnDialog={state.grnDialog}
        setGrnDialog={state.setGrnDialog}
        grnData={state.grnData}
        setGrnData={state.setGrnData}
        handleCreateGRN={state.handleCreateGRN}
      />

      <CreateSupplierDialog
        supplierDialog={state.supplierDialog}
        setSupplierDialog={state.setSupplierDialog}
        newSupplier={state.newSupplier}
        setNewSupplier={state.setNewSupplier}
        handleCreateSupplier={state.handleCreateSupplier}
      />

      <ConfirmDialog
        open={state.cancelConfirmDialog}
        onClose={() => {
          state.setCancelConfirmDialog(false);
          state.setPOToCancel(null);
        }}
        onConfirm={state.handleCancelPO}
        title="Cancel Purchase Order?"
        message={`Are you sure you want to cancel PO ${state.poToCancel?.po_number}? This action cannot be undone.`}
        confirmLabel="Cancel PO"
        variant="danger"
      />
    </Grid>
  );
}
