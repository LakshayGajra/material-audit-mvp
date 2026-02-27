import {
  Paper,
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
  Alert,
  Box,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Send as SendIcon,
} from '@mui/icons-material';

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

export default function CountingView({
  checks,
  countingCheck,
  setCountingCheck,
  counts,
  setCounts,
  startCounting,
  handleSaveDraft,
  handleSubmitCounts,
  loading,
}) {
  if (countingCheck) {
    return (
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6">
                {countingCheck.check_number}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {countingCheck.contractor_name} ({countingCheck.contractor_code}) |
                Type: {countingCheck.check_type === 'audit' ? 'Audit' : 'Self Report'} |
                {countingCheck.is_blind ? ' Blind Count' : ' With Expected Values'}
              </Typography>
            </Box>
            <Chip label={STATUS_LABELS[countingCheck.status]} color={STATUS_COLORS[countingCheck.status]} />
          </Box>

          {countingCheck.is_blind && (
            <Alert severity="info" sx={{ mb: 3 }}>
              This is a blind count. Expected quantities are hidden to ensure unbiased counting.
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Material Code</TableCell>
                  <TableCell>Material Name</TableCell>
                  <TableCell>Unit</TableCell>
                  {!countingCheck.is_blind && (
                    <TableCell align="right">Expected</TableCell>
                  )}
                  <TableCell align="right">Physical Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {countingCheck.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.material_code}</TableCell>
                    <TableCell>{line.material_name}</TableCell>
                    <TableCell>{line.material_unit}</TableCell>
                    {!countingCheck.is_blind && (
                      <TableCell align="right">{line.expected_quantity?.toFixed(2)}</TableCell>
                    )}
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={counts[line.id] ?? ''}
                        onChange={(e) =>
                          setCounts({
                            ...counts,
                            [line.id]: e.target.value,
                          })
                        }
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              disabled={loading}
            >
              Save Draft
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleSubmitCounts}
              disabled={loading}
            >
              Submit for Review
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setCountingCheck(null);
                setCounts({});
              }}
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      </Grid>
    );
  }

  return (
    <Grid size={12}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Active Checks</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Inventory checks in counting status. Click to continue counting.
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Check #</TableCell>
                <TableCell>Contractor</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Blind</TableCell>
                <TableCell>Check Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checks.filter(c => c.status === 'counting' || c.status === 'draft').length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No active checks. Click "New Check" to start one.
                  </TableCell>
                </TableRow>
              ) : (
                checks
                  .filter(c => c.status === 'counting' || c.status === 'draft')
                  .map((check) => (
                    <TableRow key={check.id}>
                      <TableCell>{check.check_number}</TableCell>
                      <TableCell>{check.contractor_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={check.check_type === 'audit' ? 'Audit' : 'Self Report'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{check.is_blind ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{check.check_date}</TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[check.status]}
                          color={STATUS_COLORS[check.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => startCounting(check.id)}
                        >
                          Continue
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Grid>
  );
}
