import {
  Grid,
  Paper,
  Alert,
  Box,
  Tabs,
  Tab,
  Button,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import useInventoryChecks from './useInventoryChecks';
import CountingView from './CountingView';
import ReviewView from './ReviewView';
import HistoryView from './HistoryView';
import CreateCheckDialog from './CreateCheckDialog';
import CheckDetailDialog from './CheckDetailDialog';

export default function InventoryCheckPage({ refreshKey }) {
  const state = useInventoryChecks(refreshKey);

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

      {/* View Tabs */}
      <Grid size={12}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs value={state.view} onChange={(e, v) => state.setView(v)}>
              <Tab label="Start / Count" />
              <Tab label="Review Queue" />
              <Tab label="History" />
            </Tabs>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={state.loadChecks} title="Refresh">
                <RefreshIcon />
              </IconButton>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => state.setCreateDialog(true)}
              >
                New Check
              </Button>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* START / COUNT VIEW */}
      {state.view === 0 && (
        <CountingView
          checks={state.checks}
          countingCheck={state.countingCheck}
          setCountingCheck={state.setCountingCheck}
          counts={state.counts}
          setCounts={state.setCounts}
          startCounting={state.startCounting}
          handleSaveDraft={state.handleSaveDraft}
          handleSubmitCounts={state.handleSubmitCounts}
          loading={state.loading}
        />
      )}

      {/* REVIEW VIEW */}
      {state.view === 1 && (
        <ReviewView
          checks={state.checks}
          reviewCheck={state.reviewCheck}
          setReviewCheck={state.setReviewCheck}
          resolutions={state.resolutions}
          setResolutions={state.setResolutions}
          startReview={state.startReview}
          handleResolve={state.handleResolve}
          loading={state.loading}
          getVarianceColor={state.getVarianceColor}
        />
      )}

      {/* HISTORY VIEW */}
      {state.view === 2 && (
        <HistoryView
          checks={state.checks}
          statusFilter={state.statusFilter}
          setStatusFilter={state.setStatusFilter}
          typeFilter={state.typeFilter}
          setTypeFilter={state.setTypeFilter}
          viewDetails={state.viewDetails}
        />
      )}

      <CreateCheckDialog
        createDialog={state.createDialog}
        setCreateDialog={state.setCreateDialog}
        newCheck={state.newCheck}
        setNewCheck={state.setNewCheck}
        contractors={state.contractors}
        handleCreateCheck={state.handleCreateCheck}
        loading={state.loading}
      />

      <CheckDetailDialog
        detailDialog={state.detailDialog}
        setDetailDialog={state.setDetailDialog}
        selectedCheck={state.selectedCheck}
        getVarianceColor={state.getVarianceColor}
      />
    </Grid>
  );
}
