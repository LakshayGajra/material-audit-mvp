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

  const handleIssueSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleProductionSuccess = () => {
    setRefreshKey((k) => k + 1);
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

      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="Materials" />
          <Tab label="Production" />
          <Tab label="Finished Goods" />
          <Tab label="BOM" />
          <Tab label="Anomalies" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <IssueMaterialForm
                contractors={contractors}
                materials={materials}
                onSuccess={handleIssueSuccess}
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

        {tab === 1 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <ReportProductionForm
                contractors={contractors}
                finishedGoods={finishedGoods}
                onSuccess={handleProductionSuccess}
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

        {tab === 2 && (
          <FinishedGoodsPage />
        )}

        {tab === 3 && (
          <BOMManagement
            finishedGoods={finishedGoods}
            materials={materials}
          />
        )}

        {tab === 4 && (
          <AnomalyList />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
