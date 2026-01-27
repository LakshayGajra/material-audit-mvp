import { useState } from 'react';
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
  FactCheck as AuditIcon,
  Sync as ReconcileIcon,
  Warning as AnomalyIcon,
  Category as ProductIcon,
  Tune as ThresholdIcon,
  School as LearnIcon,
  Build as MaterialIcon,
} from '@mui/icons-material';

const SIDEBAR_WIDTH = 240;

const navigationConfig = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: InventoryIcon,
    children: [
      { id: 'stock', label: 'Stock & Issue', icon: StockIcon },
      { id: 'warehouses', label: 'Warehouses', icon: WarehouseIcon },
      { id: 'pos', label: 'Purchase Orders', icon: POIcon },
      { id: 'rejections', label: 'Rejections', icon: RejectIcon },
    ],
  },
  {
    id: 'audits',
    label: 'Audits',
    icon: AssignmentIcon,
    children: [
      { id: 'audits', label: 'Audits', icon: AuditIcon },
      { id: 'reconciliation', label: 'Reconciliation', icon: ReconcileIcon },
      { id: 'anomalies', label: 'Anomalies', icon: AnomalyIcon },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    icon: SettingsIcon,
    children: [
      { id: 'materials', label: 'Materials', icon: MaterialIcon },
      { id: 'products', label: 'Products & BOM', icon: ProductIcon },
      { id: 'thresholds', label: 'Thresholds', icon: ThresholdIcon },
    ],
  },
];

export default function Sidebar({ activeModule, activeSubPage, onNavigate }) {
  const [expanded, setExpanded] = useState({
    inventory: true,
    audits: true,
    setup: true,
  });

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
          p: 2.5,
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

      {/* Navigation */}
      <List component="nav" sx={{ px: 1, py: 1 }}>
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

      {/* Spacer to push Learn to bottom */}
      <Box sx={{ flexGrow: 1 }} />

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
