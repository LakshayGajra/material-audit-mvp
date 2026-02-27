import {
  Button,
  TextField,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

export default function CreateSupplierDialog({
  supplierDialog,
  setSupplierDialog,
  newSupplier,
  setNewSupplier,
  handleCreateSupplier,
}) {
  return (
    <Dialog open={supplierDialog} onClose={() => setSupplierDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Supplier</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Supplier Name"
            value={newSupplier.name}
            onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Supplier Code"
            value={newSupplier.code}
            onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Contact Email"
            type="email"
            value={newSupplier.contact_email}
            onChange={(e) => setNewSupplier({ ...newSupplier, contact_email: e.target.value })}
            fullWidth
          />
          <TextField
            label="Contact Phone"
            value={newSupplier.contact_phone}
            onChange={(e) => setNewSupplier({ ...newSupplier, contact_phone: e.target.value })}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSupplierDialog(false)}>Cancel</Button>
        <Button
          onClick={handleCreateSupplier}
          variant="contained"
          disabled={!newSupplier.name || !newSupplier.code}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
