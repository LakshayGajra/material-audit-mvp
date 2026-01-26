import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteIcon from '@mui/icons-material/Delete';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * Confirmation dialog for destructive actions
 *
 * @param {boolean} open - Whether dialog is open
 * @param {Function} onClose - Close handler
 * @param {Function} onConfirm - Confirm handler
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message
 * @param {string} confirmLabel - Confirm button label (default: 'Confirm')
 * @param {string} cancelLabel - Cancel button label (default: 'Cancel')
 * @param {string} variant - 'warning' | 'danger' | 'delete' (affects colors)
 * @param {boolean} loading - Show loading state on confirm button
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  loading = false,
}) {
  const variantConfig = {
    warning: {
      icon: <WarningAmberIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
      color: 'warning',
      bgcolor: 'warning.lighter',
    },
    danger: {
      icon: <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />,
      color: 'error',
      bgcolor: 'error.lighter',
    },
    delete: {
      icon: <DeleteIcon sx={{ fontSize: 48, color: 'error.main' }} />,
      color: 'error',
      bgcolor: 'error.lighter',
    },
  };

  const config = variantConfig[variant] || variantConfig.warning;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: variant === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            }}
          >
            {config.icon}
          </Box>
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography color="text.secondary">{message}</Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">
          {cancelLabel}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={config.color}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
