import { useState, useEffect } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import AuditsPage from '../AuditsPage';
import ReconciliationPage from '../ReconciliationPage';
import AnomalyList from '../AnomalyList';

export default function AuditsModule({
  contractors,
  materials,
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
          <Tab label="Audits" />
          <Tab label="Reconciliation" />
          <Tab label="Anomalies" />
        </Tabs>
      </Box>

      {/* Sub-tab 0: Audits */}
      {subTab === 0 && (
        <AuditsPage
          contractors={contractors}
          refreshKey={refreshKey}
        />
      )}

      {/* Sub-tab 1: Reconciliation */}
      {subTab === 1 && (
        <ReconciliationPage
          contractors={contractors}
          materials={materials}
          refreshKey={refreshKey}
        />
      )}

      {/* Sub-tab 2: Anomalies */}
      {subTab === 2 && (
        <AnomalyList />
      )}
    </Box>
  );
}
