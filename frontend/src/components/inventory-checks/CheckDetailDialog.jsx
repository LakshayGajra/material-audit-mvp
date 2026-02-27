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
} from '@mui/material';

const STATUS_COLORS = {
  draft: 'default',
  counting: 'warning',
  review: 'info',
  resolved: 'success',
};

const STATUS_LABELS = {
  draft: 'Draft',
  counting: 'Counting',
  review: 'Under Review',
  resolved: 'Resolved',
};

export default function CheckDetailDialog({
  detailDialog,
  setDetailDialog,
  selectedCheck,
  getVarianceColor,
}) {
  return (
    <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="lg" fullWidth>
      <DialogTitle>
        {selectedCheck?.check_number}
        <Chip
          label={STATUS_LABELS[selectedCheck?.status]}
          color={STATUS_COLORS[selectedCheck?.status]}
          size="small"
          sx={{ ml: 2 }}
        />
      </DialogTitle>
      <DialogContent>
        {selectedCheck && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={3}>
                <Typography variant="body2" color="text.secondary">Contractor</Typography>
                <Typography>{selectedCheck.contractor_name}</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="body2" color="text.secondary">Check Type</Typography>
                <Typography>{selectedCheck.check_type === 'audit' ? 'Audit' : 'Self Report'}</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="body2" color="text.secondary">Check Date</Typography>
                <Typography>{selectedCheck.check_date}</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="body2" color="text.secondary">Blind Count</Typography>
                <Typography>{selectedCheck.is_blind ? 'Yes' : 'No'}</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="body2" color="text.secondary">Initiated By</Typography>
                <Typography>{selectedCheck.initiated_by || '-'}</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="body2" color="text.secondary">Counted By</Typography>
                <Typography>{selectedCheck.counted_by || '-'}</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="body2" color="text.secondary">Reviewed By</Typography>
                <Typography>{selectedCheck.reviewed_by || '-'}</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="body2" color="text.secondary">Total Variance</Typography>
                <Typography>{parseFloat(selectedCheck.total_variance_value || 0).toFixed(2)}</Typography>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>Line Items</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Expected</TableCell>
                    <TableCell align="right">Actual</TableCell>
                    <TableCell align="right">Variance</TableCell>
                    <TableCell align="right">Variance %</TableCell>
                    <TableCell>Resolution</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedCheck.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.material_code} - {line.material_name}</TableCell>
                      <TableCell align="right">{parseFloat(line.expected_quantity).toFixed(2)}</TableCell>
                      <TableCell align="right">
                        {line.actual_quantity !== null ? parseFloat(line.actual_quantity).toFixed(2) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography color={getVarianceColor(parseFloat(line.variance))}>
                          {line.variance !== null ? parseFloat(line.variance).toFixed(2) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {line.variance_percent !== null ? `${parseFloat(line.variance_percent).toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {line.resolution ? (
                          <Chip
                            label={line.resolution}
                            size="small"
                            color={line.resolution === 'accept' ? 'success' : line.resolution === 'investigate' ? 'warning' : 'default'}
                          />
                        ) : '-'}
                      </TableCell>
                      <TableCell>{line.resolution_notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDetailDialog(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
