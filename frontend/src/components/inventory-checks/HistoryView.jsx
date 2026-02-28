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
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import WorkflowStepper from '../common/WorkflowStepper';

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

export default function HistoryView({
  checks,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  viewDetails,
}) {
  return (
    <Grid size={12}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Check History</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                size="small"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="counting">Counting</MenuItem>
                <MenuItem value="review">Review</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                size="small"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="audit">Audit</MenuItem>
                <MenuItem value="self_report">Self Report</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Check #</TableCell>
                <TableCell>Contractor</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Check Date</TableCell>
                <TableCell>Initiated By</TableCell>
                <TableCell>Lines/Variances</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No inventory checks found.
                  </TableCell>
                </TableRow>
              ) : (
                checks.map((check) => (
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
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[check.status]}
                        color={STATUS_COLORS[check.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <WorkflowStepper type="inventoryCheck" status={check.status} compact />
                    </TableCell>
                    <TableCell>{check.check_date}</TableCell>
                    <TableCell>{check.initiated_by || '-'}</TableCell>
                    <TableCell>
                      {check.total_lines}
                      {check.lines_with_variance > 0 && (
                        <Chip
                          label={`${check.lines_with_variance} var`}
                          color="warning"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => viewDetails(check.id)}
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconButton>
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
