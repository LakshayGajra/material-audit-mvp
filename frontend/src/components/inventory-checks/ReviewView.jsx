import { useMemo } from 'react';
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
  DoneAll as AcceptAllIcon,
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

function getRowColor(variancePercent) {
  const abs = Math.abs(variancePercent);
  if (abs > 20) return 'rgba(211, 47, 47, 0.12)';   // red
  if (abs > 10) return 'rgba(245, 124, 0, 0.12)';   // orange
  if (abs > 5) return 'rgba(251, 192, 45, 0.12)';    // yellow
  if (abs > 2) return 'rgba(56, 142, 60, 0.08)';     // light green
  return 'inherit';
}

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
  // Auto-sort lines by abs(variance_percent) descending
  const sortedLines = useMemo(() => {
    if (!reviewCheck?.lines) return [];
    return [...reviewCheck.lines].sort((a, b) => {
      const aVar = Math.abs(parseFloat(a.variance_percent) || 0);
      const bVar = Math.abs(parseFloat(b.variance_percent) || 0);
      return bVar - aVar;
    });
  }, [reviewCheck?.lines]);

  const handleAcceptAllMatching = () => {
    const updated = { ...resolutions };
    for (const line of sortedLines) {
      const absVar = Math.abs(parseFloat(line.variance_percent) || 0);
      if (absVar <= 2) {
        updated[line.id] = {
          ...updated[line.id],
          resolution: 'accept',
        };
      }
    }
    setResolutions(updated);
  };

  if (reviewCheck) {
    const matchingCount = sortedLines.filter(
      (l) => Math.abs(parseFloat(l.variance_percent) || 0) <= 2
    ).length;

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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {matchingCount > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AcceptAllIcon />}
                  onClick={handleAcceptAllMatching}
                >
                  Accept All Matching ({matchingCount})
                </Button>
              )}
              <Chip label={STATUS_LABELS[reviewCheck.status]} color={STATUS_COLORS[reviewCheck.status]} />
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Review each variance and decide: Accept (adjust inventory), Keep System (flag as loss), or Investigate.
            Lines are sorted by severity. Rows are color-coded by variance level.
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
                {sortedLines.map((line) => {
                  const variancePercent = parseFloat(line.variance_percent) || 0;
                  return (
                    <TableRow
                      key={line.id}
                      sx={{ bgcolor: getRowColor(variancePercent) }}
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
                        <Typography
                          fontWeight={Math.abs(variancePercent) > 5 ? 700 : 400}
                          color={
                            Math.abs(variancePercent) > 20 ? 'error.main' :
                            Math.abs(variancePercent) > 10 ? 'warning.main' :
                            Math.abs(variancePercent) > 5 ? 'warning.dark' :
                            'inherit'
                          }
                        >
                          {variancePercent.toFixed(1)}%
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
