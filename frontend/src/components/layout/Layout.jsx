import { Box } from '@mui/material';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';

export default function Layout({
  children,
  activeModule,
  activeSubPage,
  onNavigate,
}) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        activeSubPage={activeSubPage}
        onNavigate={onNavigate}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {/* Content Area */}
        <Box
          sx={{
            p: 3,
            maxWidth: '100%',
            minHeight: '100vh',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
