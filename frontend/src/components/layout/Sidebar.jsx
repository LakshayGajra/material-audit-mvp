import { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  LocalShipping as StockIcon,
  Warehouse as WarehouseIcon,
  Receipt as POIcon,
  RemoveCircle as RejectIcon,
  CheckCircle as FGRIcon,
  Inventory2 as FGInventoryIcon,
  FactCheck as AuditIcon,
  Warning as AnomalyIcon,
  Category as ProductIcon,
  Tune as ThresholdIcon,
  School as LearnIcon,
  Build as MaterialIcon,
  People as ContractorIcon,
  Store as SupplierIcon,
  ShoppingCart as ProcurementIcon,
  Engineering as OpsIcon,
  VerifiedUser as VerifyIcon,
  AdminPanelSettings as AdminIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

const SIDEBAR_WIDTH = 260;

// View modes for testing different user perspectives
const VIEW_MODES = {
  all: {
    label: 'All Views',
    description: 'Full access to all features',
    color: 'default',
  },
  warehouse: {
    label: 'Warehouse',
    description: 'Warehouse & procurement operations',
    color: 'info',
  },
  contractor: {
    label: 'Contractor Ops',
    description: 'Contractor material management',
    color: 'success',
  },
  auditor: {
    label: 'Auditor',
    description: 'Inventory verification',
    color: 'warning',
  },
  admin: {
    label: 'Admin',
    description: 'System configuration',
    color: 'error',
  },
};

// Full navigation configuration with view mode visibility
const fullNavigationConfig = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    views: ['all', 'warehouse', 'contractor', 'auditor', 'admin'],
  },
  {
    id: 'procurement',
    label: 'Procurement',
    icon: ProcurementIcon,
    views: ['all', 'warehouse', 'admin'],
    children: [
      { id: 'pos', label: 'Purchase Orders', icon: POIcon },
      { id: 'suppliers', label: 'Suppliers', icon: SupplierIcon },
    ],
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    icon: WarehouseIcon,
    views: ['all', 'warehouse', 'admin'],
    children: [
      { id: 'warehouses', label: 'Inventory', icon: InventoryIcon },
    ],
  },
  {
    id: 'contractor',
    label: 'Contractor Ops',
    icon: OpsIcon,
    views: ['all', 'contractor', 'admin'],
    children: [
      { id: 'stock', label: 'Issue Materials', icon: StockIcon },
      { id: 'rejections', label: 'Rejections', icon: RejectIcon },
      { id: 'fgr', label: 'Receive FG', icon: FGRIcon },
    ],
  },
  {
    id: 'finishedgoods',
    label: 'Finished Goods',
    icon: FGInventoryIcon,
    views: ['all', 'warehouse', 'contractor', 'admin'],
    children: [
      { id: 'fginventory', label: 'FG Inventory', icon: InventoryIcon },
      { id: 'products', label: 'Products & BOM', icon: ProductIcon },
    ],
  },
  {
    id: 'verification',
    label: 'Verification',
    icon: VerifyIcon,
    views: ['all', 'auditor', 'admin'],
    children: [
      { id: 'inventory-checks', label: 'Inventory Checks', icon: AuditIcon },
      { id: 'anomalies', label: 'Anomalies', icon: AnomalyIcon },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    icon: SettingsIcon,
    views: ['all', 'admin'],
    children: [
      { id: 'materials', label: 'Materials', icon: MaterialIcon },
      { id: 'contractors', label: 'Contractors', icon: ContractorIcon },
      { id: 'thresholds', label: 'Thresholds', icon: ThresholdIcon },
    ],
  },
];

export default function Sidebar({ activeModule, activeSubPage, onNavigate }) {
  // Load view mode from localStorage or default to 'all'
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('viewMode');
    return saved && VIEW_MODES[saved] ? saved : 'all';
  });

  const [expanded, setExpanded] = useState(() => {
    // Start with all sections expanded
    const initial = {};
    fullNavigationConfig.forEach((item) => {
      if (item.children) {
        initial[item.id] = true;
      }
    });
    return initial;
  });

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  // Filter navigation based on current view mode
  const navigationConfig = fullNavigationConfig.filter(
    (item) => item.views.includes(viewMode)
  );

  const handleToggle = (moduleId) => {
    setExpanded((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleNavClick = (moduleId, subPageId = null) => {
    onNavigate({ module: moduleId, subPage: subPageId });
  };

  const isActive = (moduleId, subPageId = null) => {
    if (subPageId) {
      return activeModule === moduleId && activeSubPage === subPageId;
    }
    return activeModule === moduleId && !activeSubPage;
  };

  const handleViewModeChange = (event) => {
    const newMode = event.target.value;
    setViewMode(newMode);

    // Navigate to dashboard when switching views to avoid being on a hidden page
    onNavigate({ module: 'dashboard', subPage: null });
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Logo / Brand */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <InventoryIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            fontSize: '1.1rem',
          }}
        >
          Material Audit
        </Typography>
      </Box>

      <Divider />

      {/* View Mode Selector */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.secondary',
            mb: 0.5,
            fontWeight: 500,
          }}
        >
          <ViewIcon sx={{ fontSize: 14 }} />
          View Mode
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            value={viewMode}
            onChange={handleViewModeChange}
            sx={{
              '& .MuiSelect-select': {
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              },
            }}
          >
            {Object.entries(VIEW_MODES).map(([key, config]) => (
              <MenuItem key={key} value={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Chip
                    label={config.label}
                    size="small"
                    color={config.color}
                    sx={{ minWidth: 90 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {config.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider />

      {/* Navigation */}
      <List component="nav" sx={{ px: 1, py: 1, flexGrow: 1, overflow: 'auto' }}>
        {navigationConfig.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expanded[item.id];
          const isItemActive = isActive(item.id);

          return (
            <Box key={item.id}>
              <ListItemButton
                onClick={() => {
                  if (hasChildren) {
                    handleToggle(item.id);
                    // Navigate to first child if not already in this module
                    if (activeModule !== item.id) {
                      handleNavClick(item.id, item.children[0].id);
                    }
                  } else {
                    handleNavClick(item.id);
                  }
                }}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  py: 1,
                  bgcolor: isItemActive ? 'primary.main' : 'transparent',
                  color: isItemActive ? 'white' : 'text.primary',
                  '&:hover': {
                    bgcolor: isItemActive ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isItemActive ? 'white' : 'text.secondary',
                  }}
                >
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isItemActive || activeModule === item.id ? 600 : 500,
                  }}
                />
                {hasChildren && (
                  isExpanded ? (
                    <ExpandLess sx={{ fontSize: 20, color: 'text.secondary' }} />
                  ) : (
                    <ExpandMore sx={{ fontSize: 20, color: 'text.secondary' }} />
                  )
                )}
              </ListItemButton>

              {/* Sub-items */}
              {hasChildren && (
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = isActive(item.id, child.id);

                      return (
                        <ListItemButton
                          key={child.id}
                          onClick={() => handleNavClick(item.id, child.id)}
                          sx={{
                            pl: 4,
                            py: 0.75,
                            borderRadius: 1,
                            mb: 0.25,
                            bgcolor: isChildActive ? 'primary.lighter' : 'transparent',
                            color: isChildActive ? 'primary.main' : 'text.secondary',
                            '&:hover': {
                              bgcolor: isChildActive ? 'primary.lighter' : 'action.hover',
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 28,
                              color: isChildActive ? 'primary.main' : 'text.disabled',
                            }}
                          >
                            <ChildIcon sx={{ fontSize: 18 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{
                              fontSize: '0.8125rem',
                              fontWeight: isChildActive ? 600 : 400,
                            }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Collapse>
              )}
            </Box>
          );
        })}
      </List>

      {/* Learn Section at Bottom */}
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        <ListItemButton
          onClick={() => handleNavClick('learn')}
          sx={{
            borderRadius: 1,
            py: 1,
            bgcolor: activeModule === 'learn' ? 'primary.main' : 'transparent',
            color: activeModule === 'learn' ? 'white' : 'text.primary',
            '&:hover': {
              bgcolor: activeModule === 'learn' ? 'primary.dark' : 'action.hover',
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 36,
              color: activeModule === 'learn' ? 'white' : 'text.secondary',
            }}
          >
            <LearnIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Learn"
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: activeModule === 'learn' ? 600 : 500,
            }}
          />
        </ListItemButton>
      </List>
    </Drawer>
  );
}

export { SIDEBAR_WIDTH };
