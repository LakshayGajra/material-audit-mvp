import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Alert,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  LocalShipping as ShippingIcon,
  Warehouse as WarehouseIcon,
  Receipt as POIcon,
  RemoveCircle as RejectIcon,
  FactCheck as AuditIcon,
  Sync as ReconcileIcon,
  Warning as AnomalyIcon,
  Category as ProductIcon,
  Tune as ThresholdIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
  LightbulbOutlined as TipIcon,
  PlayArrow as StepIcon,
} from '@mui/icons-material';

const sections = [
  {
    id: 'overview',
    title: 'Getting Started',
    icon: DashboardIcon,
    content: {
      description: 'Material Audit MVP helps you track construction materials, manage inventory, and detect discrepancies between expected and actual material usage.',
      steps: [
        'Set up your warehouses and materials in the Setup module',
        'Create contractors who will receive materials',
        'Issue materials from warehouses to contractors',
        'Track production and monitor for anomalies',
        'Conduct audits and reconciliations to ensure accuracy',
      ],
      tip: 'Start by setting up your Products & BOM (Bill of Materials) to define what materials are needed for each finished product.',
    },
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: DashboardIcon,
    content: {
      description: 'The Dashboard provides a real-time overview of your entire operation at a glance.',
      features: [
        { name: 'Open Anomalies', desc: 'Number of unresolved inventory discrepancies that need attention' },
        { name: 'Low Stock Items', desc: 'Materials that have fallen below their reorder point' },
        { name: 'Pending Approvals', desc: 'Purchase orders and rejections waiting for approval' },
        { name: 'Quick Actions', desc: 'One-click access to common tasks like issuing materials or starting audits' },
        { name: 'Anomaly Trend', desc: 'Visual chart showing anomaly patterns over the last 7 days' },
      ],
      tip: 'Check the Dashboard daily to stay on top of critical issues and pending tasks.',
    },
  },
  {
    id: 'inventory-stock',
    title: 'Stock & Issue',
    icon: ShippingIcon,
    parent: 'Inventory',
    content: {
      description: 'Issue materials from your warehouses to contractors for their construction projects.',
      steps: [
        'Select the source warehouse',
        'Choose the contractor receiving the materials',
        'Select the material and enter the quantity',
        'Click "Issue Material" to complete the transfer',
      ],
      features: [
        { name: 'Available Stock', desc: 'Shows real-time availability for each material in the selected warehouse' },
        { name: 'Contractor Inventory', desc: 'View current material holdings for any contractor' },
        { name: 'Contractor List', desc: 'Quick reference of all registered contractors' },
      ],
      tip: 'The system prevents issuing more materials than available in the warehouse.',
    },
  },
  {
    id: 'inventory-warehouses',
    title: 'Warehouses',
    icon: WarehouseIcon,
    parent: 'Inventory',
    content: {
      description: 'Manage your warehouse locations and track inventory levels at each location.',
      steps: [
        'Create warehouses with unique codes and locations',
        'Add inventory items to each warehouse',
        'Set reorder points to get low-stock alerts',
        'Monitor stock levels across all locations',
      ],
      features: [
        { name: 'Low Stock Alerts', desc: 'Items below reorder point are highlighted in orange' },
        { name: 'Reorder Quantity', desc: 'Suggested order quantity when restocking is needed' },
        { name: 'Multi-warehouse', desc: 'Manage multiple warehouse locations independently' },
      ],
      tip: 'Set appropriate reorder points based on lead time and usage patterns.',
    },
  },
  {
    id: 'inventory-pos',
    title: 'Purchase Orders',
    icon: POIcon,
    parent: 'Inventory',
    content: {
      description: 'Create and manage purchase orders to replenish warehouse inventory from suppliers.',
      workflow: [
        { status: 'DRAFT', action: 'Create PO with line items', next: 'Submit for approval' },
        { status: 'SUBMITTED', action: 'Review and verify details', next: 'Approve or Cancel' },
        { status: 'APPROVED', action: 'Send to supplier', next: 'Record goods receipt' },
        { status: 'PARTIALLY_RECEIVED', action: 'More goods arriving', next: 'Record remaining items' },
        { status: 'FULLY_RECEIVED', action: 'All items received', next: 'PO complete' },
      ],
      features: [
        { name: 'Suppliers', desc: 'Manage your list of material suppliers' },
        { name: 'Goods Receipt', desc: 'Record actual quantities received vs ordered' },
        { name: 'Rejection Tracking', desc: 'Track rejected items during goods receipt' },
      ],
      tip: 'Always verify received quantities against the PO before accepting goods.',
    },
  },
  {
    id: 'inventory-rejections',
    title: 'Rejections',
    icon: RejectIcon,
    parent: 'Inventory',
    content: {
      description: 'Track materials rejected during goods receipt or returned by contractors.',
      steps: [
        'Record rejection with reason and quantity',
        'Specify the material and source (supplier or contractor)',
        'Submit for approval',
        'Track rejection status and resolution',
      ],
      features: [
        { name: 'Rejection Reasons', desc: 'Document why materials were rejected (damaged, wrong spec, etc.)' },
        { name: 'Approval Workflow', desc: 'Rejections require manager approval' },
        { name: 'History', desc: 'Complete audit trail of all rejections' },
      ],
      tip: 'Document rejection reasons clearly for supplier quality discussions.',
    },
  },
  {
    id: 'audits-audits',
    title: 'Audits',
    icon: AuditIcon,
    parent: 'Audits',
    content: {
      description: 'Conduct physical inventory audits to verify contractor material holdings match system records.',
      steps: [
        'Create a new audit for a contractor',
        'Physically count materials at the contractor site',
        'Enter actual quantities found',
        'System calculates expected vs actual variance',
        'Review and analyze discrepancies',
      ],
      features: [
        { name: 'Blind Audit', desc: 'Auditor enters counts without seeing expected values' },
        { name: 'Variance Calculation', desc: 'Automatic comparison with system records' },
        { name: 'Threshold Alerts', desc: 'Variances exceeding thresholds are flagged' },
      ],
      tip: 'Conduct surprise audits periodically for better accuracy.',
    },
  },
  {
    id: 'audits-reconciliation',
    title: 'Reconciliation',
    icon: ReconcileIcon,
    parent: 'Audits',
    content: {
      description: 'Reconcile inventory discrepancies by adjusting system records to match physical counts.',
      steps: [
        'Select contractor and material with discrepancy',
        'Enter the actual physical quantity',
        'Provide reason for adjustment',
        'Submit for review and approval',
      ],
      features: [
        { name: 'Adjustment Types', desc: 'Increase or decrease system quantity' },
        { name: 'Reason Codes', desc: 'Categorize why adjustment is needed' },
        { name: 'Approval Required', desc: 'All reconciliations need manager sign-off' },
      ],
      tip: 'Investigate root cause before making adjustments to prevent recurring issues.',
    },
  },
  {
    id: 'audits-anomalies',
    title: 'Anomalies',
    icon: AnomalyIcon,
    parent: 'Audits',
    content: {
      description: 'Monitor and resolve inventory anomalies detected by the system.',
      types: [
        { type: 'Shortage', desc: 'Contractor has less material than expected based on BOM calculations' },
        { type: 'Excess', desc: 'Contractor has more material than expected' },
        { type: 'Negative Inventory', desc: 'System shows negative quantity (data error)' },
      ],
      features: [
        { name: 'Variance %', desc: 'Shows how far off actual is from expected' },
        { name: 'Filter by Status', desc: 'View unresolved, resolved, or all anomalies' },
        { name: 'Resolution', desc: 'Mark anomalies as resolved after investigation' },
      ],
      tip: 'Prioritize anomalies with high variance percentages for investigation.',
    },
  },
  {
    id: 'setup-products',
    title: 'Products & BOM',
    icon: ProductIcon,
    parent: 'Setup',
    content: {
      description: 'Define finished products and their Bill of Materials (material requirements).',
      steps: [
        'Create finished goods (buildings, structures, etc.)',
        'For each product, define required materials',
        'Specify quantity of each material per unit produced',
        'System uses BOM to calculate expected consumption',
      ],
      features: [
        { name: 'Finished Goods', desc: 'End products that contractors produce' },
        { name: 'Bill of Materials', desc: 'Recipe of materials needed per unit' },
        { name: 'Consumption Calculation', desc: 'Auto-calculate material usage from production' },
      ],
      tip: 'Accurate BOM data is critical for anomaly detection - review and update regularly.',
    },
  },
  {
    id: 'setup-thresholds',
    title: 'Thresholds',
    icon: ThresholdIcon,
    parent: 'Setup',
    content: {
      description: 'Configure variance thresholds that determine when anomalies are flagged.',
      features: [
        { name: 'Global Threshold', desc: 'Default variance % that triggers anomaly (e.g., 2%)' },
        { name: 'Per-Material', desc: 'Override threshold for specific materials' },
        { name: 'Per-Contractor', desc: 'Different thresholds for different contractors' },
      ],
      steps: [
        'Set a reasonable global threshold (typically 2-5%)',
        'Adjust for high-value materials (tighter threshold)',
        'Adjust for materials with natural variance (looser threshold)',
      ],
      tip: 'Start with stricter thresholds and loosen if too many false positives occur.',
    },
  },
];

export default function LearnPage({ onNavigate }) {
  const [expanded, setExpanded] = useState('overview');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const renderContent = (content) => (
    <Box>
      <Typography color="text.secondary" paragraph>
        {content.description}
      </Typography>

      {content.steps && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            How to use:
          </Typography>
          <List dense>
            {content.steps.map((step, idx) => (
              <ListItem key={idx} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Chip
                    label={idx + 1}
                    size="small"
                    sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                  />
                </ListItemIcon>
                <ListItemText primary={step} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {content.workflow && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Workflow:
          </Typography>
          {content.workflow.map((step, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1,
                p: 1.5,
                bgcolor: 'background.default',
                borderRadius: 1,
              }}
            >
              <Chip
                label={step.status.replace('_', ' ')}
                size="small"
                color={
                  step.status === 'APPROVED' || step.status === 'FULLY_RECEIVED'
                    ? 'success'
                    : step.status === 'SUBMITTED'
                    ? 'info'
                    : 'default'
                }
              />
              <ArrowIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
              <Typography variant="body2">{step.action}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {content.types && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Anomaly Types:
          </Typography>
          {content.types.map((type, idx) => (
            <Box key={idx} sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {type.type}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {type.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {content.features && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Key Features:
          </Typography>
          <List dense>
            {content.features.map((feature, idx) => (
              <ListItem key={idx} sx={{ py: 0.5, alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                  <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={feature.name}
                  secondary={feature.desc}
                  primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.8125rem' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {content.tip && (
        <Alert
          severity="info"
          icon={<TipIcon />}
          sx={{ mt: 2 }}
        >
          <Typography variant="body2">
            <strong>Tip:</strong> {content.tip}
          </Typography>
        </Alert>
      )}
    </Box>
  );

  // Group sections by parent
  const groupedSections = sections.reduce((acc, section) => {
    const parent = section.parent || 'General';
    if (!acc[parent]) acc[parent] = [];
    acc[parent].push(section);
    return acc;
  }, {});

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Learn How to Use Material Audit
        </Typography>
        <Typography color="text.secondary">
          This guide will help you understand how to use each feature of the application.
          Click on any section below to learn more.
        </Typography>
      </Paper>

      {/* Getting Started */}
      {groupedSections['General']?.map((section) => {
        const Icon = section.icon;
        return (
          <Accordion
            key={section.id}
            expanded={expanded === section.id}
            onChange={handleChange(section.id)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Icon color="primary" />
                <Typography sx={{ fontWeight: 500 }}>{section.title}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {renderContent(section.content)}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Other sections grouped by parent */}
      {['Inventory', 'Audits', 'Setup'].map((parentName) => (
        <Box key={parentName} sx={{ mt: 3 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}
          >
            {parentName}
          </Typography>
          {groupedSections[parentName]?.map((section) => {
            const Icon = section.icon;
            return (
              <Accordion
                key={section.id}
                expanded={expanded === section.id}
                onChange={handleChange(section.id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Icon color="primary" />
                    <Typography sx={{ fontWeight: 500 }}>{section.title}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {renderContent(section.content)}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      ))}

      {/* Quick Start CTA */}
      <Paper sx={{ p: 3, mt: 4, textAlign: 'center', bgcolor: 'primary.lighter' }}>
        <Typography variant="h6" gutterBottom>
          Ready to get started?
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Head to the Dashboard to see your current status and take action.
        </Typography>
        <Button
          variant="contained"
          startIcon={<DashboardIcon />}
          onClick={() => onNavigate?.({ module: 'dashboard' })}
        >
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}
