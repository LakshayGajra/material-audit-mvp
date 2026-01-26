import { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Grid } from '@mui/material';
import FinishedGoodsPage from '../FinishedGoodsPage';
import BOMManagement from '../BOMManagement';
import ThresholdsPage from '../ThresholdsPage';

export default function SetupModule({
  contractors,
  materials,
  finishedGoods,
  refreshKey,
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
          <Tab label="Products & BOM" />
          <Tab label="Thresholds" />
        </Tabs>
      </Box>

      {/* Sub-tab 0: Products & BOM (combines Finished Goods and BOM) */}
      {subTab === 0 && (
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
      )}

      {/* Sub-tab 1: Thresholds */}
      {subTab === 1 && (
        <ThresholdsPage
          contractors={contractors}
          materials={materials}
          refreshKey={refreshKey}
        />
      )}
    </Box>
  );
}
