import { Box, AppBar, Toolbar, Typography, Button, Chip } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';

const ROLE_COLORS = {
  admin: 'error',
  contractor: 'success',
  auditor: 'warning',
};

export default function Layout({
  children,
  activeModule,
  activeSubPage,
  onNavigate,
  user,
  onLogout,
}) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        activeSubPage={activeSubPage}
        onNavigate={onNavigate}
        user={user}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Bar */}
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Toolbar variant="dense" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {user?.username}
            </Typography>
            <Chip
              label={user?.role}
              size="small"
              color={ROLE_COLORS[user?.role] || 'default'}
            />
            <Button
              size="small"
              startIcon={<LogoutIcon />}
              onClick={onLogout}
              color="inherit"
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box
          sx={{
            p: 3,
            maxWidth: '100%',
            flexGrow: 1,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
