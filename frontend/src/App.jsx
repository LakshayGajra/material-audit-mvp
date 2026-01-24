import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  AppBar,
  Toolbar,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import { getContractors, getMaterials, getFinishedGoods } from './api';
import ContractorList from './components/ContractorList';
import IssueMaterialForm from './components/IssueMaterialForm';
import ContractorInventory from './components/ContractorInventory';
import FinishedGoodsPage from './components/FinishedGoodsPage';
import ReportProductionForm from './components/ReportProductionForm';
import ProductionHistory from './components/ProductionHistory';
import BOMManagement from './components/BOMManagement';
import AnomalyList from './components/AnomalyList';
import WarehousePage from './components/WarehousePage';
import PurchaseOrdersPage from './components/PurchaseOrdersPage';
import RejectionsPage from './components/RejectionsPage';
import AuditsPage from './components/AuditsPage';
import ThresholdsPage from './components/ThresholdsPage';
import ReconciliationPage from './components/ReconciliationPage';
import DashboardPage from './components/DashboardPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  const [tab, setTab] = useState(0);
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
      setContractors(res.data);
    } catch (err) {
      console.error('Failed to load contractors:', err);
    }
  };

  const loadMaterials = async () => {
    try {
      const res = await getMaterials();
      setMaterials(res.data);
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  };

  const loadFinishedGoods = async () => {
    try {
      const res = await getFinishedGoods();
      setFinishedGoods(res.data);
    } catch (err) {
      console.error('Failed to load finished goods:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    loadContractors();
    loadMaterials();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <InventoryIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Material Audit MVP</Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Dashboard" />
            <Tab label="Materials" />
            <Tab label="Production" />
            <Tab label="Finished Goods" />
            <Tab label="BOM" />
            <Tab label="Warehouse" />
            <Tab label="Purchase Orders" />
            <Tab label="Rejections" />
            <Tab label="Audits" />
            <Tab label="Reconciliation" />
            <Tab label="Anomalies" />
            <Tab label="Thresholds" />
          </Tabs>
        </Box>

        {/* Tab 0: Dashboard */}
        {tab === 0 && (
          <DashboardPage onNavigate={(tabIndex) => setTab(tabIndex)} />
        )}

        {/* Tab 1: Materials */}
        {tab === 1 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <IssueMaterialForm
                contractors={contractors}
                materials={materials}
                onSuccess={handleRefresh}
              />
              <ContractorList contractors={contractors} />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <ContractorInventory
                contractors={contractors}
                refreshKey={refreshKey}
              />
            </Grid>
          </Grid>
        )}

        {/* Tab 2: Production */}
        {tab === 2 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <ReportProductionForm
                contractors={contractors}
                finishedGoods={finishedGoods}
                onSuccess={handleRefresh}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <ProductionHistory
                contractors={contractors}
                refreshKey={refreshKey}
              />
            </Grid>
          </Grid>
        )}

        {/* Tab 3: Finished Goods */}
        {tab === 3 && (
          <FinishedGoodsPage />
        )}

        {/* Tab 4: BOM */}
        {tab === 4 && (
          <BOMManagement
            finishedGoods={finishedGoods}
            materials={materials}
          />
        )}

        {/* Tab 5: Warehouse */}
        {tab === 5 && (
          <WarehousePage
            materials={materials}
            refreshKey={refreshKey}
          />
        )}

        {/* Tab 6: Purchase Orders */}
        {tab === 6 && (
          <PurchaseOrdersPage
            materials={materials}
            refreshKey={refreshKey}
          />
        )}

        {/* Tab 7: Rejections */}
        {tab === 7 && (
          <RejectionsPage
            contractors={contractors}
            materials={materials}
            refreshKey={refreshKey}
          />
        )}

        {/* Tab 8: Audits */}
        {tab === 8 && (
          <AuditsPage
            contractors={contractors}
            refreshKey={refreshKey}
          />
        )}

        {/* Tab 9: Reconciliation */}
        {tab === 9 && (
          <ReconciliationPage
            contractors={contractors}
            materials={materials}
            refreshKey={refreshKey}
          />
        )}

        {/* Tab 10: Anomalies */}
        {tab === 10 && (
          <AnomalyList />
        )}

        {/* Tab 11: Thresholds */}
        {tab === 11 && (
          <ThresholdsPage
            contractors={contractors}
            materials={materials}
            refreshKey={refreshKey}
          />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
