import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

export default function GRNDialog({
  grnDialog,
  setGrnDialog,
  grnData,
  setGrnData,
  handleCreateGRN,
}) {
  return (
    <Dialog open={grnDialog} onClose={() => setGrnDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>Record Goods Receipt</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Received By"
            value={grnData.received_by}
            onChange={(e) => setGrnData({ ...grnData, received_by: e.target.value })}
            required
          />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Ordered</TableCell>
                  <TableCell align="right">Already Received</TableCell>
                  <TableCell align="right">Remaining</TableCell>
                  <TableCell align="right">Qty Received</TableCell>
                  <TableCell align="right">Qty Rejected</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grnData.lines.map((line, idx) => (
                  <TableRow key={line.po_line_id}>
                    <TableCell>{line.material_code} - {line.material_name}</TableCell>
                    <TableCell align="right">{line.ordered_qty}</TableCell>
                    <TableCell align="right">{line.received_qty}</TableCell>
                    <TableCell align="right">{line.remaining_qty}</TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={line.quantity_received}
                        onChange={(e) => {
                          const newLines = [...grnData.lines];
                          newLines[idx].quantity_received = e.target.value;
                          newLines[idx].quantity_accepted = e.target.value;
                          setGrnData({ ...grnData, lines: newLines });
                        }}
                        inputProps={{ min: 0, max: line.remaining_qty }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={line.quantity_rejected}
                        onChange={(e) => {
                          const newLines = [...grnData.lines];
                          newLines[idx].quantity_rejected = e.target.value;
                          newLines[idx].quantity_accepted =
                            parseFloat(newLines[idx].quantity_received || 0) -
                            parseFloat(e.target.value || 0);
                          setGrnData({ ...grnData, lines: newLines });
                        }}
                        inputProps={{ min: 0 }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setGrnDialog(false)}>Cancel</Button>
        <Button
          onClick={handleCreateGRN}
          variant="contained"
          disabled={!grnData.received_by || !grnData.lines.some((l) => parseFloat(l.quantity_received) > 0)}
        >
          Create Receipt
        </Button>
      </DialogActions>
    </Dialog>
  );
}
