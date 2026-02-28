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
  Chip,
  Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
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
  SwapHoriz as TransferIcon,
  AccountBox as MyInventoryIcon,
} from '@mui/icons-material';

const SIDEBAR_WIDTH = 260;

const ROLE_COLORS = {
  admin: 'error',
  contractor: 'success',
  auditor: 'warning',
};

// Map user role to view filter key
function roleToView(role) {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'contractor':
      return 'contractor';
    case 'auditor':
      return 'auditor';
    default:
      return 'all';
  }
}

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
      { id: 'pos', label: 'Purchase Orders', icon: POIcon, views: ['all', 'warehouse', 'admin'] },
      { id: 'suppliers', label: 'Suppliers', icon: SupplierIcon, views: ['all', 'warehouse', 'admin'] },
    ],
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    icon: WarehouseIcon,
    views: ['all', 'warehouse', 'admin'],
    children: [
      { id: 'warehouses', label: 'Inventory', icon: InventoryIcon, views: ['all', 'warehouse', 'admin'] },
      { id: 'transfers', label: 'Stock Transfers', icon: TransferIcon, views: ['all', 'warehouse', 'admin'] },
    ],
  },
  {
    id: 'contractor',
    label: 'Contractor Ops',
    icon: OpsIcon,
    views: ['all', 'contractor', 'admin'],
    children: [
      { id: 'stock', label: 'Issue Materials', icon: StockIcon, views: ['all', 'admin'] },
      { id: 'my-inventory', label: 'My Inventory', icon: MyInventoryIcon, views: ['contractor'] },
      { id: 'rejections', label: 'Rejections', icon: RejectIcon, views: ['all', 'contractor', 'admin'] },
      { id: 'fgr', label: 'Receive FG', icon: FGRIcon, views: ['all', 'contractor', 'admin'] },
    ],
  },
  {
    id: 'finishedgoods',
    label: 'Finished Goods',
    icon: FGInventoryIcon,
    views: ['all', 'warehouse', 'contractor', 'admin'],
    children: [
      { id: 'fginventory', label: 'FG Inventory', icon: InventoryIcon, views: ['all', 'warehouse', 'contractor', 'admin'] },
      { id: 'products', label: 'Products & BOM', icon: ProductIcon, views: ['all', 'warehouse', 'contractor', 'admin'] },
    ],
  },
  {
    id: 'verification',
    label: 'Verification',
    icon: VerifyIcon,
    views: ['all', 'auditor', 'admin'],
    children: [
      { id: 'inventory-checks', label: 'Inventory Checks', icon: AuditIcon, views: ['all', 'auditor', 'admin'] },
      { id: 'anomalies', label: 'Anomalies', icon: AnomalyIcon, views: ['all', 'auditor', 'admin'] },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    icon: SettingsIcon,
    views: ['all', 'admin'],
    children: [
      { id: 'materials', label: 'Materials', icon: MaterialIcon, views: ['all', 'admin'] },
      { id: 'contractors', label: 'Contractors', icon: ContractorIcon, views: ['all', 'admin'] },
      { id: 'thresholds', label: 'Thresholds', icon: ThresholdIcon, views: ['all', 'admin'] },
    ],
  },
];

export default function Sidebar({ activeModule, activeSubPage, onNavigate, user }) {
  const viewMode = roleToView(user?.role);

  const [expanded, setExpanded] = useState(() => {
    // Only expand the active module by default
    const initial = {};
    fullNavigationConfig.forEach((item) => {
      if (item.children) {
        initial[item.id] = item.id === activeModule;
      }
    });
    return initial;
  });

  // Auto-collapse others and expand current when activeModule changes
  useEffect(() => {
    setExpanded((prev) => {
      const next = {};
      fullNavigationConfig.forEach((item) => {
        if (item.children) {
          next[item.id] = item.id === activeModule ? true : (prev[item.id] && item.id === activeModule);
        }
      });
      // Always expand the active module
      if (activeModule) {
        next[activeModule] = true;
      }
      return next;
    });
  }, [activeModule]);

  // Filter navigation based on user role (parent level)
  const navigationConfig = fullNavigationConfig
    .filter((item) => item.views.includes(viewMode))
    .map((item) => {
      if (item.children) {
        // Filter children by role too
        const filteredChildren = item.children.filter(
          (child) => !child.views || child.views.includes(viewMode)
        );
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    // Remove parent items whose children were all filtered out
    .filter((item) => !item.children || item.children.length > 0);

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

      {/* User Info */}
      {user && (
        <>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.875rem',
                bgcolor: `${ROLE_COLORS[user.role] || 'default'}.main`,
              }}
            >
              {user.username[0].toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {user.username}
              </Typography>
              <Chip
                label={user.role}
                size="small"
                color={ROLE_COLORS[user.role] || 'default'}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
          </Box>
          <Divider />
        </>
      )}

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
