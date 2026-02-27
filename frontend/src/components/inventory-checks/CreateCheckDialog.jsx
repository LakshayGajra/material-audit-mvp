import {
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
  Switch,
  FormControlLabel,
} from '@mui/material';

export default function CreateCheckDialog({
  createDialog,
  setCreateDialog,
  newCheck,
  setNewCheck,
  contractors,
  handleCreateCheck,
  loading,
}) {
  return (
    <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Start New Inventory Check</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth required>
            <InputLabel>Contractor</InputLabel>
            <Select
              value={newCheck.contractor_id}
              label="Contractor"
              onChange={(e) => setNewCheck({ ...newCheck, contractor_id: e.target.value })}
            >
              {contractors.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Check Type</InputLabel>
            <Select
              value={newCheck.check_type}
              label="Check Type"
              onChange={(e) => setNewCheck({ ...newCheck, check_type: e.target.value })}
            >
              <MenuItem value="audit">Audit (Company counts)</MenuItem>
              <MenuItem value="self_report">Self Report (Contractor submits)</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={newCheck.is_blind}
                onChange={(e) => setNewCheck({ ...newCheck, is_blind: e.target.checked })}
              />
            }
            label="Blind Count (hide expected quantities)"
          />

          <TextField
            label="Check Date"
            type="date"
            value={newCheck.check_date}
            onChange={(e) => setNewCheck({ ...newCheck, check_date: e.target.value })}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="Initiated By"
            value={newCheck.initiated_by}
            onChange={(e) => setNewCheck({ ...newCheck, initiated_by: e.target.value })}
            fullWidth
            placeholder="Your name"
          />

          <TextField
            label="Notes"
            multiline
            rows={2}
            value={newCheck.notes}
            onChange={(e) => setNewCheck({ ...newCheck, notes: e.target.value })}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
        <Button
          onClick={handleCreateCheck}
          variant="contained"
          disabled={!newCheck.contractor_id || loading}
        >
          Start Check
        </Button>
      </DialogActions>
    </Dialog>
  );
}
