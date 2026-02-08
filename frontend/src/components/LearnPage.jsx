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
  Card,
  CardContent,
  Grid,
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
  Build as MaterialIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
  LightbulbOutlined as TipIcon,
  PlayArrow as StepIcon,
  People as ContractorIcon,
  Business as CompanyIcon,
  SwapHoriz as TransferIcon,
  Visibility as ViewIcon,
  CheckBox as VerifyIcon,
  ListAlt as FGRIcon,
} from '@mui/icons-material';

const sections = [
  {
    id: 'overview',
    title: 'Getting Started',
    icon: DashboardIcon,
    content: {
      description: 'Material Audit MVP helps you track construction materials, manage inventory across warehouses, and detect discrepancies between expected and actual material usage.',
      steps: [
        'Set up company warehouses and materials in the Setup module',
        'Create contractors and their warehouses',
        'Issue materials from company warehouses to contractor warehouses',
        'Receive finished goods from contractors via FGR',
        'Conduct inventory checks to verify accuracy',
        'Monitor anomalies and resolve discrepancies',
      ],
      tip: 'Use the View Mode selector in the sidebar to see the app from different user perspectives: Warehouse Manager, Contractor Ops, Auditor, or Admin.',
    },
  },
  {
    id: 'key-concepts',
    title: 'Key Concepts',
    icon: TipIcon,
    content: {
      description: 'Understanding these core concepts will help you use the system effectively.',
      features: [
        { name: 'Company Warehouses', desc: 'Central storage locations owned by your company. Materials are purchased and stored here before being issued to contractors.' },
        { name: 'Contractor Warehouses', desc: 'Storage locations linked to specific contractors. When you issue materials to a contractor, they go into their warehouse.' },
        { name: 'Material Issuance', desc: 'Transfer of materials FROM a company warehouse TO a contractor warehouse. Creates audit trail and updates both inventories.' },
        { name: 'Finished Goods Receipt (FGR)', desc: 'Process of receiving completed products from contractors. Inspects quality and adds to company inventory.' },
        { name: 'Bill of Materials (BOM)', desc: 'Recipe defining what raw materials are needed to produce each finished product.' },
        { name: 'Inventory Check', desc: 'Physical verification of inventory at a contractor location. Compares actual counts to system records.' },
      ],
      tip: 'Warehouses are the single source of truth for all inventory - both materials and finished goods.',
    },
  },
  {
    id: 'flow-overview',
    title: 'Material & Goods Flow',
    icon: TransferIcon,
    content: {
      description: 'Understanding how materials and finished goods flow through the system.',
      workflow: [
        { status: 'PURCHASE', action: 'Buy materials from suppliers', next: 'Receive into company warehouse' },
        { status: 'STOCK', action: 'Materials stored in company warehouse', next: 'Issue to contractor' },
        { status: 'ISSUE', action: 'Transfer materials to contractor warehouse', next: 'Contractor uses for production' },
        { status: 'PRODUCE', action: 'Contractor produces finished goods', next: 'Submit for receipt' },
        { status: 'FGR', action: 'Receive & inspect finished goods', next: 'Add to company FG inventory' },
      ],
      tip: 'Each step creates transaction records for full traceability and audit capability.',
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
        { name: 'Low Stock Items', desc: 'Materials that have fallen below their reorder point in any warehouse' },
        { name: 'Pending Approvals', desc: 'Purchase orders, rejections, and inventory checks waiting for action' },
        { name: 'Quick Actions', desc: 'One-click access to common tasks like issuing materials or starting inventory checks' },
        { name: 'Anomaly Trend', desc: 'Visual chart showing anomaly patterns over the last 7 days' },
      ],
      tip: 'Check the Dashboard daily to stay on top of critical issues and pending tasks.',
    },
  },
  {
    id: 'warehouses',
    title: 'Warehouses',
    icon: WarehouseIcon,
    parent: 'Warehouse',
    content: {
      description: 'Manage all warehouse locations - both company-owned and contractor-owned. Each warehouse can hold materials, finished goods, or both.',
      steps: [
        'Create warehouses with unique codes and locations',
        'Choose owner type: Company (standalone) or Contractor (linked)',
        'Configure what each warehouse can hold (materials, finished goods, or both)',
        'Add inventory items and set reorder points',
        'Monitor stock levels across all locations',
      ],
      features: [
        { name: 'Owner Type Filter', desc: 'Filter to see All, Company-only, or Contractor-only warehouses' },
        { name: 'Materials Tab', desc: 'View and manage raw material inventory at each warehouse' },
        { name: 'Finished Goods Tab', desc: 'View finished goods inventory at each warehouse' },
        { name: 'Low Stock Alerts', desc: 'Items below reorder point are highlighted for quick action' },
        { name: 'Contractor Link', desc: 'Contractor warehouses show their linked contractor for easy reference' },
      ],
      tip: 'When creating a contractor, you can auto-create their warehouse. Each contractor should have at least one warehouse to receive materials.',
    },
  },
  {
    id: 'stock-issue',
    title: 'Stock & Issue',
    icon: ShippingIcon,
    parent: 'Warehouse',
    content: {
      description: 'Issue materials from company warehouses to contractor warehouses. This is how contractors receive materials for production.',
      steps: [
        'Select the source warehouse (company warehouse with stock)',
        'Choose the contractor (must have an active warehouse)',
        'System shows the destination warehouse automatically',
        'Select material and enter quantity to issue',
        'Click "Issue Material" to complete the transfer',
      ],
      features: [
        { name: 'Available Stock', desc: 'Real-time availability shown for each material in the source warehouse' },
        { name: 'Destination Preview', desc: 'Shows which contractor warehouse will receive the materials' },
        { name: 'Validation', desc: 'Prevents issuing more than available or to contractors without warehouses' },
        { name: 'Transaction Log', desc: 'Every issuance is recorded with date, quantity, and who issued it' },
      ],
      tip: 'If a contractor shows "No warehouse" warning, create a warehouse for them first in the Warehouses page.',
    },
  },
  {
    id: 'purchase-orders',
    title: 'Purchase Orders',
    icon: POIcon,
    parent: 'Procurement',
    content: {
      description: 'Create and manage purchase orders to replenish company warehouse inventory from suppliers.',
      workflow: [
        { status: 'DRAFT', action: 'Create PO with line items', next: 'Submit for approval' },
        { status: 'SUBMITTED', action: 'Review and verify details', next: 'Approve or Cancel' },
        { status: 'APPROVED', action: 'Send to supplier', next: 'Record goods receipt' },
        { status: 'PARTIALLY_RECEIVED', action: 'Some goods arrived', next: 'Record remaining items' },
        { status: 'FULLY_RECEIVED', action: 'All items received', next: 'PO complete' },
      ],
      features: [
        { name: 'Multi-line POs', desc: 'Order multiple materials in a single purchase order' },
        { name: 'Goods Receipt', desc: 'Record actual quantities received vs ordered' },
        { name: 'Partial Receipts', desc: 'Handle split deliveries across multiple dates' },
      ],
      tip: 'Always verify received quantities against the PO before accepting goods.',
    },
  },
  {
    id: 'suppliers',
    title: 'Suppliers',
    icon: CompanyIcon,
    parent: 'Procurement',
    content: {
      description: 'Manage your list of material suppliers for purchase orders.',
      steps: [
        'Add suppliers with contact information',
        'Link suppliers to purchase orders',
        'Track supplier performance over time',
      ],
      features: [
        { name: 'Supplier Directory', desc: 'Central list of all approved suppliers' },
        { name: 'Contact Info', desc: 'Store phone, email, and address for each supplier' },
        { name: 'Active/Inactive', desc: 'Mark suppliers as inactive without deleting history' },
      ],
      tip: 'Keep supplier information up to date for smooth procurement operations.',
    },
  },
  {
    id: 'contractors',
    title: 'Contractors',
    icon: ContractorIcon,
    parent: 'Contractor Ops',
    content: {
      description: 'Manage contractors who receive materials and produce finished goods. Each contractor has their own warehouse.',
      steps: [
        'Create contractor with unique code and name',
        'System can auto-create a warehouse for the contractor',
        'Issue materials to contractor (goes to their warehouse)',
        'Receive finished goods from contractor via FGR',
        'Conduct inventory checks to verify holdings',
      ],
      features: [
        { name: 'Contractor Warehouse', desc: 'Each contractor has a linked warehouse for their inventory' },
        { name: 'Materials Inventory', desc: 'View raw materials currently held by contractor' },
        { name: 'Finished Goods Inventory', desc: 'View finished goods at contractor location' },
        { name: 'Issuance History', desc: 'Track all materials issued to this contractor' },
      ],
      tip: 'Click "View Inventory" on any contractor to see both their materials and finished goods in tabbed view.',
    },
  },
  {
    id: 'fgr',
    title: 'Finished Goods Receipt (FGR)',
    icon: FGRIcon,
    parent: 'Finished Goods',
    content: {
      description: 'Receive finished goods from contractors after they complete production. FGR includes inspection and quality check.',
      workflow: [
        { status: 'DRAFT', action: 'Create FGR with expected items', next: 'Submit for processing' },
        { status: 'SUBMITTED', action: 'Contractor delivers goods', next: 'Inspect and verify' },
        { status: 'INSPECTED', action: 'Record accepted/rejected quantities', next: 'Complete receipt' },
        { status: 'COMPLETED', action: 'Goods added to inventory', next: 'BOM materials deducted' },
      ],
      features: [
        { name: 'Quality Inspection', desc: 'Record accepted and rejected quantities with reasons' },
        { name: 'BOM Deduction', desc: 'When FGR completes, BOM materials are auto-deducted from contractor inventory' },
        { name: 'Multi-item Receipt', desc: 'Receive multiple finished goods in single FGR' },
        { name: 'Rejection Tracking', desc: 'Track why items were rejected for supplier feedback' },
      ],
      tip: 'Completing an FGR automatically deducts the corresponding BOM materials from the contractor\'s inventory.',
    },
  },
  {
    id: 'fg-inventory',
    title: 'Finished Goods Inventory',
    icon: ProductIcon,
    parent: 'Finished Goods',
    content: {
      description: 'View finished goods inventory across all warehouses. Shows what completed products are in stock.',
      features: [
        { name: 'Company FG Stock', desc: 'Finished goods received from contractors and available for sale/use' },
        { name: 'Contractor FG Stock', desc: 'Finished goods at contractor locations (work in progress)' },
        { name: 'By Warehouse', desc: 'Filter to see FG inventory at specific warehouses' },
        { name: 'Last Receipt Date', desc: 'Shows when each item was last received' },
      ],
      tip: 'Finished goods at contractor warehouses represent work-in-progress before formal receipt.',
    },
  },
  {
    id: 'inventory-checks',
    title: 'Inventory Checks',
    icon: VerifyIcon,
    parent: 'Verification',
    content: {
      description: 'Unified system for verifying inventory accuracy at contractor locations. Combines physical audits with reconciliation.',
      steps: [
        'Create new inventory check for a contractor',
        'Physical count: Visit location and count actual materials',
        'Enter counts for each material (blind mode hides expected values)',
        'System calculates variances and flags items exceeding thresholds',
        'Review variances and decide: accept counts or keep system values',
        'Close the check to finalize inventory adjustments',
      ],
      features: [
        { name: 'Blind Counting', desc: 'Auditor enters counts without seeing expected values for unbiased results' },
        { name: 'Variance Analysis', desc: 'Automatic calculation of difference between counted and expected' },
        { name: 'Threshold Alerts', desc: 'Items exceeding variance thresholds are highlighted for attention' },
        { name: 'Resolution Options', desc: 'Accept physical counts or keep system values with notes' },
        { name: 'Audit Trail', desc: 'Full history of who counted, reviewed, and what decisions were made' },
      ],
      tip: 'Use blind mode for more accurate counts - auditors aren\'t influenced by expected values.',
    },
  },
  {
    id: 'rejections',
    title: 'Rejections',
    icon: RejectIcon,
    parent: 'Verification',
    content: {
      description: 'Track materials rejected during goods receipt or returned by contractors due to quality issues.',
      steps: [
        'Record rejection with reason and quantity',
        'Specify the material and source (supplier or contractor)',
        'Submit for approval',
        'Track rejection status and resolution',
      ],
      features: [
        { name: 'Rejection Reasons', desc: 'Document why materials were rejected (damaged, wrong spec, expired, etc.)' },
        { name: 'Approval Workflow', desc: 'Rejections require manager approval before processing' },
        { name: 'Return Tracking', desc: 'Track materials returned to suppliers for credit/replacement' },
      ],
      tip: 'Document rejection reasons clearly - this data helps with supplier quality reviews.',
    },
  },
  {
    id: 'anomalies',
    title: 'Anomalies',
    icon: AnomalyIcon,
    parent: 'Verification',
    content: {
      description: 'Monitor and resolve inventory anomalies detected by the system during production or audits.',
      types: [
        { type: 'Shortage', desc: 'Contractor has less material than expected based on BOM calculations' },
        { type: 'Excess', desc: 'Contractor has more material than expected' },
        { type: 'Negative Inventory', desc: 'System shows negative quantity (indicates data issue)' },
      ],
      features: [
        { name: 'Variance %', desc: 'Shows how far off actual is from expected' },
        { name: 'Filter by Status', desc: 'View unresolved, resolved, or all anomalies' },
        { name: 'Resolution Notes', desc: 'Document how each anomaly was resolved' },
      ],
      tip: 'Investigate anomalies promptly - they often indicate process issues or theft.',
    },
  },
  {
    id: 'setup-materials',
    title: 'Materials',
    icon: MaterialIcon,
    parent: 'Setup',
    content: {
      description: 'Define raw materials that flow through the system - from purchase to issuance to consumption.',
      steps: [
        'Click "Add Material" to create a new material',
        'Enter a unique material code (e.g., MAT-001)',
        'Enter the material name (e.g., Portland Cement 50kg)',
        'Select the unit of measurement (kg, pcs, m, etc.)',
      ],
      features: [
        { name: 'Material Code', desc: 'Unique identifier used throughout the system' },
        { name: 'Unit of Measurement', desc: 'Standard unit for tracking quantities' },
        { name: 'Active/Inactive', desc: 'Deactivate materials no longer in use' },
      ],
      tip: 'Create all your materials first before setting up warehouses, BOMs, or issuing to contractors.',
    },
  },
  {
    id: 'setup-products',
    title: 'Products & BOM',
    icon: ProductIcon,
    parent: 'Setup',
    content: {
      description: 'Define finished products and their Bill of Materials (material requirements for production).',
      steps: [
        'Create finished goods (the products contractors produce)',
        'For each product, add BOM items with required materials',
        'Specify quantity of each material needed per unit produced',
        'System uses BOM to calculate expected material consumption',
      ],
      features: [
        { name: 'Finished Goods', desc: 'End products like assembled items, constructed units, etc.' },
        { name: 'Bill of Materials', desc: 'Recipe showing what materials make up each product' },
        { name: 'Quantity Per Unit', desc: 'How much of each material is needed for one finished good' },
      ],
      tip: 'Accurate BOM data is critical for anomaly detection - if BOM is wrong, all consumption calculations will be off.',
    },
  },
  {
    id: 'setup-thresholds',
    title: 'Thresholds',
    icon: ThresholdIcon,
    parent: 'Setup',
    content: {
      description: 'Configure variance thresholds that determine when discrepancies are flagged as anomalies.',
      features: [
        { name: 'Global Threshold', desc: 'Default variance % that triggers anomaly (e.g., 2%)' },
        { name: 'Per-Material', desc: 'Override threshold for specific materials (tighter for high-value items)' },
        { name: 'Per-Contractor', desc: 'Different thresholds for contractors based on history' },
      ],
      steps: [
        'Set a reasonable global threshold (typically 2-5%)',
        'Tighten for high-value materials that need close monitoring',
        'Loosen for materials with natural variance (like liquids)',
        'Adjust per-contractor based on their track record',
      ],
      tip: 'Start with stricter thresholds and loosen if you get too many false positives.',
    },
  },
  {
    id: 'view-modes',
    title: 'View Modes',
    icon: ViewIcon,
    parent: 'Tips',
    content: {
      description: 'The app supports different view modes to show relevant features for each user role.',
      features: [
        { name: 'All Features', desc: 'Shows complete navigation - useful for admins and testing' },
        { name: 'Warehouse View', desc: 'Focus on warehouse management, stock levels, and goods receipt' },
        { name: 'Contractor Ops', desc: 'Focus on contractor management, issuances, and FGR' },
        { name: 'Auditor View', desc: 'Focus on inventory checks, verification, and anomalies' },
        { name: 'Admin View', desc: 'Focus on setup, configuration, and system management' },
      ],
      tip: 'Use View Mode selector in sidebar to test how the app appears to different users.',
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
                  step.status === 'APPROVED' || step.status === 'COMPLETED' || step.status === 'FULLY_RECEIVED'
                    ? 'success'
                    : step.status === 'SUBMITTED' || step.status === 'INSPECTED'
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
            Types:
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
        <Typography color="text.secondary" paragraph>
          This guide will help you understand how to use each feature of the application.
          Click on any section below to learn more.
        </Typography>

        {/* Quick Overview Cards */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <WarehouseIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="subtitle2" fontWeight={600}>Warehouses</Typography>
                <Typography variant="body2" color="text.secondary">
                  Company & contractor storage locations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <ShippingIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="subtitle2" fontWeight={600}>Issue Materials</Typography>
                <Typography variant="body2" color="text.secondary">
                  Transfer from company to contractor
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <FGRIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="subtitle2" fontWeight={600}>Receive FG</Typography>
                <Typography variant="body2" color="text.secondary">
                  Get finished goods from contractors
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <VerifyIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="subtitle2" fontWeight={600}>Verify</Typography>
                <Typography variant="body2" color="text.secondary">
                  Inventory checks & anomalies
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Getting Started & Key Concepts */}
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
                {section.id === 'overview' && (
                  <Chip label="Start Here" size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {renderContent(section.content)}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Other sections grouped by parent */}
      {['Warehouse', 'Procurement', 'Contractor Ops', 'Finished Goods', 'Verification', 'Setup', 'Tips'].map((parentName) => (
        groupedSections[parentName]?.length > 0 && (
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
        )
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
