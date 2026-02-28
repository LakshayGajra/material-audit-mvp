import { useState } from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  TextField,
  IconButton,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as PrevIcon,
  ArrowForward as NextIcon,
  Save as SaveIcon,
  Send as SubmitIcon,
} from '@mui/icons-material';

export default function FullScreenCounting({
  open,
  onClose,
  countingCheck,
  counts,
  setCounts,
  handleSaveDraft,
  handleSubmitCounts,
  loading,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!countingCheck || !countingCheck.lines?.length) return null;

  const lines = countingCheck.lines;
  const total = lines.length;
  const line = lines[currentIndex];
  const progress = ((currentIndex + 1) / total) * 100;

  const countedCount = lines.filter((l) => counts[l.id] !== undefined && counts[l.id] !== '').length;

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6">
            Focus Mode - {countingCheck.check_number}
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {countedCount} of {total} materials counted
          </Typography>
          <Button color="inherit" startIcon={<SaveIcon />} onClick={handleSaveDraft} disabled={loading}>
            Save Draft
          </Button>
          <Button color="inherit" startIcon={<SubmitIcon />} onClick={handleSubmitCounts} disabled={loading} sx={{ ml: 1 }}>
            Submit
          </Button>
        </Toolbar>
      </AppBar>

      <LinearProgress variant="determinate" value={progress} sx={{ height: 6 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, p: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {currentIndex + 1} of {total} materials
        </Typography>

        <Paper
          elevation={3}
          sx={{
            p: 6,
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" gutterBottom fontWeight={600}>
            {line.material_name}
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {line.material_code}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Unit: {line.material_unit}
          </Typography>

          {!countingCheck.is_blind && line.expected_quantity !== undefined && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Expected: {parseFloat(line.expected_quantity).toFixed(2)}
            </Typography>
          )}

          <TextField
            type="number"
            value={counts[line.id] ?? ''}
            onChange={(e) =>
              setCounts({
                ...counts,
                [line.id]: e.target.value,
              })
            }
            placeholder="Enter count"
            inputProps={{ min: 0, step: 0.01, style: { fontSize: '2rem', textAlign: 'center' } }}
            sx={{ width: '100%', maxWidth: 300 }}
            autoFocus
          />
        </Paper>

        <Box sx={{ display: 'flex', gap: 4, mt: 4 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<PrevIcon />}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="contained"
            size="large"
            endIcon={<NextIcon />}
            onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
            disabled={currentIndex === total - 1}
          >
            Next
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
