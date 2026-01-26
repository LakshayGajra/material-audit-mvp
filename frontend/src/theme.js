import { createTheme } from '@mui/material';

// Simplified color palette - status colors only
const statusColors = {
  error: '#dc2626',      // Red - errors, critical, anomalies
  warning: '#f59e0b',    // Amber - warnings, low stock
  success: '#16a34a',    // Green - success, OK status
  info: '#2563eb',       // Blue - informational
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#1e40af',       // Deeper blue - less saturated
      light: '#3b82f6',
      lighter: '#dbeafe',    // Very light blue for backgrounds
      dark: '#1e3a8a',
    },
    secondary: {
      main: '#64748b',       // Slate gray
      light: '#94a3b8',
      dark: '#475569',
    },
    error: {
      main: statusColors.error,
      light: '#fecaca',
      dark: '#b91c1c',
    },
    warning: {
      main: statusColors.warning,
      light: '#fef3c7',
      dark: '#d97706',
    },
    success: {
      main: statusColors.success,
      light: '#bbf7d0',
      dark: '#15803d',
    },
    info: {
      main: statusColors.info,
      light: '#dbeafe',
      dark: '#1d4ed8',
    },
    background: {
      default: '#f8fafc',    // Very light gray background
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',    // Slate 800
      secondary: '#64748b',  // Slate 500
    },
    divider: '#e2e8f0',      // Slate 200 - subtle dividers
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    // Simplified type scale - fewer sizes
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '0.9375rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
      color: '#64748b',
    },
    button: {
      textTransform: 'none',  // No uppercase buttons
      fontWeight: 500,
    },
    caption: {
      fontSize: '0.75rem',
      color: '#64748b',
    },
  },

  shape: {
    borderRadius: 8,         // Slightly rounded corners
  },

  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',  // Very subtle shadow
    '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    ...Array(20).fill('0 10px 15px -3px rgb(0 0 0 / 0.1)'),
  ],

  components: {
    // AppBar - cleaner header
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        },
      },
    },

    // Paper - reduce heavy borders/shadows
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid #e2e8f0',
          backgroundImage: 'none',
        },
      },
    },

    // Card - minimal styling
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid #e2e8f0',
          '&:hover': {
            borderColor: '#cbd5e1',
          },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },

    // Tables - cleaner look
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f8fafc',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: '#475569',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 16px',
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #f1f5f9',
          padding: '14px 16px',
          fontSize: '0.875rem',
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
          '&:last-child td': {
            borderBottom: 0,
          },
        },
      },
    },

    // Buttons - cleaner, more whitespace
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: '0.875rem',
        },
        contained: {
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          },
        },
        outlined: {
          borderColor: '#e2e8f0',
          '&:hover': {
            borderColor: '#cbd5e1',
            backgroundColor: '#f8fafc',
          },
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.8125rem',
        },
      },
    },

    // Chips - consistent status colors
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        sizeSmall: {
          height: 24,
        },
        colorSuccess: {
          backgroundColor: '#dcfce7',
          color: '#15803d',
        },
        colorWarning: {
          backgroundColor: '#fef3c7',
          color: '#b45309',
        },
        colorError: {
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
        },
        colorInfo: {
          backgroundColor: '#dbeafe',
          color: '#1d4ed8',
        },
      },
    },

    // Tabs - cleaner styling
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 2,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9375rem',
          minHeight: 44,
          padding: '12px 20px',
          '&.Mui-selected': {
            fontWeight: 600,
          },
        },
      },
    },

    // Text fields - cleaner inputs
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#e2e8f0',
            },
            '&:hover fieldset': {
              borderColor: '#cbd5e1',
            },
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& fieldset': {
            borderColor: '#e2e8f0',
          },
          '&:hover fieldset': {
            borderColor: '#cbd5e1',
          },
        },
      },
    },

    // Select - consistent with text fields
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
    },

    // Alerts - status colors only
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.875rem',
        },
        standardSuccess: {
          backgroundColor: '#f0fdf4',
          color: '#15803d',
        },
        standardWarning: {
          backgroundColor: '#fffbeb',
          color: '#b45309',
        },
        standardError: {
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
        },
        standardInfo: {
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
        },
      },
    },

    // Dialogs - more spacing
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 600,
          padding: '20px 24px 16px',
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 20px',
          gap: 8,
        },
      },
    },

    // Form controls - more spacing
    MuiFormControl: {
      defaultProps: {
        size: 'small',
      },
    },

    // Divider - subtle
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#f1f5f9',
        },
      },
    },

    // IconButton - consistent sizing
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: '#f1f5f9',
          },
        },
      },
    },

    // List items - better spacing
    MuiListItem: {
      styleOverrides: {
        root: {
          paddingTop: 10,
          paddingBottom: 10,
        },
      },
    },

    // Container - max width and spacing
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingTop: 24,
          paddingBottom: 32,
        },
      },
    },
  },
});

export default theme;
