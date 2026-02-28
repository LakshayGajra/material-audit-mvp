import { useState, useEffect } from 'react';
import { CssBaseline, ThemeProvider, Grid, CircularProgress, Box } from '@mui/material';
import { getContractors, getMaterials, getFinishedGoods } from './api';
import theme from './theme';
import { Layout } from './components/layout';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';

// Page components
import DashboardPage from './components/DashboardPage';
import IssueMaterialForm from './components/IssueMaterialForm';
import ContractorInventory from './components/ContractorInventory';
import ContractorList from './components/ContractorList';
import WarehousePage from './components/WarehousePage';
import PurchaseOrdersPage from './components/purchase-orders/PurchaseOrdersPage';
import SuppliersPage from './components/SuppliersPage';
import RejectionsPage from './components/RejectionsPage';
import FinishedGoodsReceiptPage from './components/FinishedGoodsReceiptPage';
import FinishedGoodsInventoryPage from './components/FinishedGoodsInventoryPage';
import InventoryCheckPage from './components/inventory-checks/InventoryCheckPage';
import AnomalyList from './components/AnomalyList';
import FinishedGoodsPage from './components/FinishedGoodsPage';
import BOMManagement from './components/BOMManagement';
import ThresholdsPage from './components/ThresholdsPage';
import MaterialsPage from './components/MaterialsPage';
import ContractorsPage from './components/ContractorsPage';
import StockTransferPage from './components/StockTransferPage';
import LearnPage from './components/LearnPage';

// Role-based dashboards
import ContractorDashboard from './components/ContractorDashboard';
import AuditorDashboard from './components/AuditorDashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const { user, loading, logout } = useAuth();

  // Navigation state
  const [activeModule, setActiveModule] = useState('dashboard');
  const [activeSubPage, setActiveSubPage] = useState(null);

  // Data state
  const [contractors, setContractors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadContractors();
    loadMaterials();
    loadFinishedGoods();
  }, []);

  const loadContractors = async () => {
    try {
      const res = await getContractors();
      setContractors(res.data || []);
    } catch (err) {
      console.error('Failed to load contractors:', err);
      setContractors([]);
    }
  };

  const loadMaterials = async () => {
    try {
      const res = await getMaterials();
      setMaterials(res.data || []);
    } catch (err) {
      console.error('Failed to load materials:', err);
      setMaterials([]);
    }
  };

  const loadFinishedGoods = async () => {
    try {
      const res = await getFinishedGoods();
      setFinishedGoods(res.data || []);
    } catch (err) {
      console.error('Failed to load finished goods:', err);
      setFinishedGoods([]);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    loadContractors();
    loadMaterials();
    loadFinishedGoods();
  };

  const handleNavigate = (route) => {
    if (typeof route === 'string') {
      // Simple module navigation
      setActiveModule(route);
      setActiveSubPage(null);
    } else if (route && typeof route === 'object') {
      // Module + subPage navigation
      setActiveModule(route.module);
      setActiveSubPage(route.subPage || null);
    }
  };

  // Render the current page based on navigation state
  const renderContent = () => {
    // Dashboard - role-based
    if (activeModule === 'dashboard') {
      if (user?.role === 'contractor') {
        return <ContractorDashboard user={user} onNavigate={handleNavigate} />;
      }
      if (user?.role === 'auditor') {
        return <AuditorDashboard user={user} onNavigate={handleNavigate} />;
      }
      if (user?.role === 'admin') {
        return <AdminDashboard onNavigate={handleNavigate} />;
      }
      return <DashboardPage onNavigate={handleNavigate} />;
    }

    // Procurement module
    if (activeModule === 'procurement') {
      switch (activeSubPage) {
        case 'pos':
        default:
          return (
            <PurchaseOrdersPage
              materials={materials}
              refreshKey={refreshKey}
            />
          );
        case 'suppliers':
          return <SuppliersPage refreshKey={refreshKey} />;
      }
    }

    // Warehouse module
    if (activeModule === 'warehouse') {
      switch (activeSubPage) {
        case 'warehouses':
        default:
          return (
            <WarehousePage
              materials={materials}
              refreshKey={refreshKey}
            />
          );
        case 'transfers':
          return <StockTransferPage />;
      }
    }

    // Contractor Operations module
    if (activeModule === 'contractor') {
      // Contractor role: handle my-inventory subpage
      if (user?.role === 'contractor' && (activeSubPage === 'my-inventory' || activeSubPage === 'stock')) {
        return <ContractorDashboard user={user} onNavigate={handleNavigate} initialTab={0} />;
      }

      switch (activeSubPage) {
        case 'stock':
        default:
          return (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <IssueMaterialForm
                  contractors={contractors}
                  materials={materials}
                  onSuccess={handleRefresh}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <ContractorInventory
                  contractors={contractors}
                  refreshKey={refreshKey}
                />
              </Grid>
            </Grid>
          );
        case 'rejections':
          return (
            <RejectionsPage
              contractors={contractors}
              materials={materials}
              refreshKey={refreshKey}
              contractorId={user?.role === 'contractor' ? user.contractor_id : null}
            />
          );
        case 'fgr':
          return (
            <FinishedGoodsReceiptPage
              refreshKey={refreshKey}
            />
          );
      }
    }

    // Finished Goods module
    if (activeModule === 'finishedgoods') {
      switch (activeSubPage) {
        case 'fginventory':
        default:
          return (
            <FinishedGoodsInventoryPage
              refreshKey={refreshKey}
            />
          );
        case 'products':
          return (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FinishedGoodsPage />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <BOMManagement
                  finishedGoods={finishedGoods}
                  materials={materials}
                />
              </Grid>
            </Grid>
          );
      }
    }

    // Verification module (formerly Audits)
    if (activeModule === 'verification') {
      switch (activeSubPage) {
        case 'inventory-checks':
        default:
          return (
            <InventoryCheckPage
              refreshKey={refreshKey}
            />
          );
        case 'anomalies':
          return <AnomalyList />;
      }
    }

    // Setup module
    if (activeModule === 'setup') {
      switch (activeSubPage) {
        case 'materials':
        default:
          return <MaterialsPage />;
        case 'contractors':
          return (
            <ContractorsPage
              contractors={contractors}
              onContractorCreated={loadContractors}
              refreshKey={refreshKey}
            />
          );
        case 'thresholds':
          return (
            <ThresholdsPage
              contractors={contractors}
              materials={materials}
              refreshKey={refreshKey}
            />
          );
      }
    }

    // Learn page
    if (activeModule === 'learn') {
      return <LearnPage onNavigate={handleNavigate} />;
    }

    // Fallback to dashboard
    return <DashboardPage onNavigate={handleNavigate} />;
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout
        activeModule={activeModule}
        activeSubPage={activeSubPage}
        onNavigate={handleNavigate}
        user={user}
        onLogout={logout}
      >
        {renderContent()}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
