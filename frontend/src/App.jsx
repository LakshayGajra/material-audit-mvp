import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  AppBar,
  Toolbar,
  CssBaseline,
  ThemeProvider,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import { getContractors, getMaterials, getFinishedGoods } from './api';
import DashboardPage from './components/DashboardPage';
import InventoryModule from './components/modules/InventoryModule';
import AuditsModule from './components/modules/AuditsModule';
import SetupModule from './components/modules/SetupModule';
import theme from './theme';

function App() {
  const [module, setModule] = useState(0);
  const [subTabs, setSubTabs] = useState({ 1: 0, 2: 0, 3: 0 });
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

  const handleNavigate = (target) => {
    if (typeof target === 'number') {
      setModule(target);
    } else if (target && typeof target === 'object') {
      setModule(target.module);
      if (target.subTab !== undefined) {
        setSubTabs((prev) => ({ ...prev, [target.module]: target.subTab }));
      }
    }
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

      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={module}
            onChange={(e, v) => setModule(v)}
            variant="standard"
          >
            <Tab label="Dashboard" />
            <Tab label="Inventory" />
            <Tab label="Audits" />
            <Tab label="Setup" />
          </Tabs>
        </Box>

        {/* Module 0: Dashboard */}
        {module === 0 && (
          <DashboardPage onNavigate={handleNavigate} />
        )}

        {/* Module 1: Inventory */}
        {module === 1 && (
          <InventoryModule
            contractors={contractors}
            materials={materials}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            initialSubTab={subTabs[1]}
          />
        )}

        {/* Module 2: Audits */}
        {module === 2 && (
          <AuditsModule
            contractors={contractors}
            materials={materials}
            refreshKey={refreshKey}
            initialSubTab={subTabs[2]}
          />
        )}

        {/* Module 3: Setup */}
        {module === 3 && (
          <SetupModule
            contractors={contractors}
            materials={materials}
            finishedGoods={finishedGoods}
            refreshKey={refreshKey}
            initialSubTab={subTabs[3]}
          />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
