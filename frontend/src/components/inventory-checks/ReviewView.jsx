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
  Select,
  MenuItem,
} from '@mui/material';
import {
  Check as CheckIcon,
  Warning as WarningIcon,
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

export default function ReviewView({
  checks,
  reviewCheck,
  setReviewCheck,
  resolutions,
  setResolutions,
  startReview,
  handleResolve,
  loading,
  getVarianceColor,
}) {
  if (reviewCheck) {
    return (
      <Grid size={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6">
                Review: {reviewCheck.check_number}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {reviewCheck.contractor_name} | Counted by: {reviewCheck.counted_by} |
                {reviewCheck.lines_with_variance} lines with variance
              </Typography>
            </Box>
            <Chip label={STATUS_LABELS[reviewCheck.status]} color={STATUS_COLORS[reviewCheck.status]} />
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Review each variance and decide: Accept (adjust inventory), Keep System (flag as loss), or Investigate.
          </Alert>

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
                {reviewCheck.lines.map((line) => {
                  const hasVariance = line.variance && Math.abs(parseFloat(line.variance)) > 0.01;
                  return (
                    <TableRow
                      key={line.id}
                      sx={{ bgcolor: hasVariance ? 'rgba(255, 152, 0, 0.1)' : 'inherit' }}
                    >
                      <TableCell>
                        {line.material_code} - {line.material_name}
                      </TableCell>
                      <TableCell align="right">{parseFloat(line.expected_quantity).toFixed(2)}</TableCell>
                      <TableCell align="right">{parseFloat(line.actual_quantity).toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Typography color={getVarianceColor(parseFloat(line.variance))}>
                          {parseFloat(line.variance).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color={hasVariance ? 'warning.main' : 'inherit'}>
                          {line.variance_percent ? parseFloat(line.variance_percent).toFixed(1) : 0}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={resolutions[line.id]?.resolution || 'accept'}
                          onChange={(e) =>
                            setResolutions({
                              ...resolutions,
                              [line.id]: {
                                ...resolutions[line.id],
                                resolution: e.target.value,
                              },
                            })
                          }
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="accept">Accept Count</MenuItem>
                          <MenuItem value="keep_system">Keep System</MenuItem>
                          <MenuItem value="investigate">Investigate</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Notes..."
                          value={resolutions[line.id]?.notes || ''}
                          onChange={(e) =>
                            setResolutions({
                              ...resolutions,
                              [line.id]: {
                                ...resolutions[line.id],
                                notes: e.target.value,
                              },
                            })
                          }
                          sx={{ minWidth: 150 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckIcon />}
              onClick={handleResolve}
              disabled={loading}
            >
              Resolve All
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setReviewCheck(null);
                setResolutions({});
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
        <Typography variant="h6" gutterBottom>Review Queue</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Inventory checks submitted for review. Click to review variances and resolve.
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Check #</TableCell>
                <TableCell>Contractor</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Counted By</TableCell>
                <TableCell>Lines</TableCell>
                <TableCell>Variances</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checks.filter(c => c.status === 'review').length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No checks pending review.
                  </TableCell>
                </TableRow>
              ) : (
                checks
                  .filter(c => c.status === 'review')
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
                      <TableCell>{check.counted_by}</TableCell>
                      <TableCell>{check.total_lines}</TableCell>
                      <TableCell>
                        {check.lines_with_variance > 0 ? (
                          <Chip
                            label={check.lines_with_variance}
                            color="warning"
                            size="small"
                            icon={<WarningIcon />}
                          />
                        ) : (
                          <Chip label="0" size="small" color="success" />
                        )}
                      </TableCell>
                      <TableCell>
                        {check.created_at ? new Date(check.created_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => startReview(check.id)}
                        >
                          Review
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
