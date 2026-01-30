import { useState, useEffect } from 'react';
import { CssBaseline, ThemeProvider, Grid } from '@mui/material';
import { getContractors, getMaterials, getFinishedGoods } from './api';
import theme from './theme';
import { Layout } from './components/layout';

// Page components
import DashboardPage from './components/DashboardPage';
import IssueMaterialForm from './components/IssueMaterialForm';
import ContractorInventory from './components/ContractorInventory';
import ContractorList from './components/ContractorList';
import WarehousePage from './components/WarehousePage';
import PurchaseOrdersPage from './components/PurchaseOrdersPage';
import RejectionsPage from './components/RejectionsPage';
import FinishedGoodsReceiptPage from './components/FinishedGoodsReceiptPage';
import FinishedGoodsInventoryPage from './components/FinishedGoodsInventoryPage';
import AuditsPage from './components/AuditsPage';
import ReconciliationPage from './components/ReconciliationPage';
import AnomalyList from './components/AnomalyList';
import FinishedGoodsPage from './components/FinishedGoodsPage';
import BOMManagement from './components/BOMManagement';
import ThresholdsPage from './components/ThresholdsPage';
import MaterialsPage from './components/MaterialsPage';
import LearnPage from './components/LearnPage';

function App() {
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
    // Dashboard
    if (activeModule === 'dashboard') {
      return <DashboardPage onNavigate={handleNavigate} />;
    }

    // Inventory module
    if (activeModule === 'inventory') {
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
                <ContractorList contractors={contractors} onContractorCreated={loadContractors} />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <ContractorInventory
                  contractors={contractors}
                  refreshKey={refreshKey}
                />
              </Grid>
            </Grid>
          );
        case 'warehouses':
          return (
            <WarehousePage
              materials={materials}
              refreshKey={refreshKey}
            />
          );
        case 'pos':
          return (
            <PurchaseOrdersPage
              materials={materials}
              refreshKey={refreshKey}
            />
          );
        case 'rejections':
          return (
            <RejectionsPage
              contractors={contractors}
              materials={materials}
              refreshKey={refreshKey}
            />
          );
        case 'fgr':
          return (
            <FinishedGoodsReceiptPage
              refreshKey={refreshKey}
            />
          );
        case 'fginventory':
          return (
            <FinishedGoodsInventoryPage
              refreshKey={refreshKey}
            />
          );
      }
    }

    // Audits module
    if (activeModule === 'audits') {
      switch (activeSubPage) {
        case 'audits':
        default:
          return (
            <AuditsPage
              contractors={contractors}
              refreshKey={refreshKey}
            />
          );
        case 'reconciliation':
          return (
            <ReconciliationPage
              contractors={contractors}
              materials={materials}
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout
        activeModule={activeModule}
        activeSubPage={activeSubPage}
        onNavigate={handleNavigate}
      >
        {renderContent()}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
