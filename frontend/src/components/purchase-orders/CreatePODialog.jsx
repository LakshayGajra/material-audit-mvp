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
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

export default function CreatePODialog({
  createDialog,
  setCreateDialog,
  newPO,
  setNewPO,
  newLine,
  setNewLine,
  suppliers,
  warehouses,
  materials,
  handleCreatePO,
  handleAddLine,
  handleRemoveLine,
}) {
  return (
    <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>Create Purchase Order</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={6}>
              <FormControl fullWidth required>
                <InputLabel>Supplier</InputLabel>
                <Select
                  value={newPO.supplier_id}
                  label="Supplier"
                  onChange={(e) => setNewPO({ ...newPO, supplier_id: e.target.value })}
                >
                  {suppliers.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth required>
                <InputLabel>Destination Warehouse</InputLabel>
                <Select
                  value={newPO.warehouse_id}
                  label="Destination Warehouse"
                  onChange={(e) => setNewPO({ ...newPO, warehouse_id: e.target.value })}
                >
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Expected Delivery"
                type="date"
                value={newPO.expected_delivery}
                onChange={(e) => setNewPO({ ...newPO, expected_delivery: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Notes"
                value={newPO.notes}
                onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Line Items</Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid size={4}>
              <FormControl fullWidth>
                <InputLabel>Material</InputLabel>
                <Select
                  value={newLine.material_id}
                  label="Material"
                  onChange={(e) => setNewLine({ ...newLine, material_id: e.target.value })}
                >
                  {materials.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.code} - {m.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={3}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={newLine.quantity}
                onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
              />
            </Grid>
            <Grid size={3}>
              <TextField
                fullWidth
                label="Unit Price"
                type="number"
                value={newLine.unit_price}
                onChange={(e) => setNewLine({ ...newLine, unit_price: e.target.value })}
              />
            </Grid>
            <Grid size={2}>
              <Button variant="outlined" onClick={handleAddLine} fullWidth>Add</Button>
            </Grid>
          </Grid>

          {newPO.lines.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {newPO.lines.map((line, idx) => {
                    const mat = materials.find((m) => m.id === parseInt(line.material_id));
                    return (
                      <TableRow key={idx}>
                        <TableCell>{mat?.name || line.material_id}</TableCell>
                        <TableCell align="right">{line.quantity}</TableCell>
                        <TableCell align="right">${line.unit_price}</TableCell>
                        <TableCell align="right">
                          ${(parseFloat(line.quantity) * parseFloat(line.unit_price)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleRemoveLine(idx)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
        <Button
          onClick={handleCreatePO}
          variant="contained"
          disabled={!newPO.supplier_id || !newPO.warehouse_id || newPO.lines.length === 0}
        >
          Create PO
        </Button>
      </DialogActions>
    </Dialog>
  );
}
