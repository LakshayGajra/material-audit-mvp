import { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Grid } from '@mui/material';
import IssueMaterialForm from '../IssueMaterialForm';
import ContractorInventory from '../ContractorInventory';
import ContractorList from '../ContractorList';
import WarehousePage from '../WarehousePage';
import PurchaseOrdersPage from '../PurchaseOrdersPage';
import RejectionsPage from '../RejectionsPage';

export default function InventoryModule({
  contractors,
  materials,
  refreshKey,
  onRefresh,
  initialSubTab = 0,
  subTabRef,
}) {
  const [subTab, setSubTab] = useState(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (subTabRef) {
      subTabRef.current = setSubTab;
    }
  }, [subTabRef]);

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={subTab}
          onChange={(e, v) => setSubTab(v)}
          variant="standard"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontSize: '0.875rem',
            },
          }}
        >
          <Tab label="Stock & Issue" />
          <Tab label="Warehouses" />
          <Tab label="Purchase Orders" />
          <Tab label="Rejections" />
        </Tabs>
      </Box>

      {/* Sub-tab 0: Stock & Issue (Materials) */}
      {subTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <IssueMaterialForm
              contractors={contractors}
              materials={materials}
              onSuccess={onRefresh}
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

      {/* Sub-tab 1: Warehouses */}
      {subTab === 1 && (
        <WarehousePage
          materials={materials}
          refreshKey={refreshKey}
        />
      )}

      {/* Sub-tab 2: Purchase Orders */}
      {subTab === 2 && (
        <PurchaseOrdersPage
          materials={materials}
          refreshKey={refreshKey}
        />
      )}

      {/* Sub-tab 3: Rejections */}
      {subTab === 3 && (
        <RejectionsPage
          contractors={contractors}
          materials={materials}
          refreshKey={refreshKey}
        />
      )}
    </Box>
  );
}
