import React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { IAllActivityTabs, IActivityTab } from '../ActivitiesLayout';

const BasicHeader = ({
  activeTab,
  changeActiveTab,
  tabs,
}: {
  activeTab: IActivityTab;
  changeActiveTab: (event: React.SyntheticEvent, key: string) => void;
  tabs: IAllActivityTabs;
}) => {
  return (
    <Tabs value={activeTab.key} onChange={changeActiveTab} variant="fullWidth">
      {Object.keys(tabs).map((tab) => (
        <Tab
          key={tab}
          label={tabs[tab].label}
          value={tab}
          sx={{
            color: '#94a3b8',
            '&.Mui-selected': {
              color: '#818cf8',
              fontWeight: 700,
            },
            textTransform: 'none',
            fontSize: '0.95rem',
          }}
        />
      ))}
    </Tabs>
  );
};

export default BasicHeader;
