import React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

const BasicHeader = ({
  activeTab,
  changeActiveTab,
  tabTitles,
}: {
  activeTab: number;
  changeActiveTab: (event: React.SyntheticEvent, activeTab: number) => void;
  tabTitles: string[];
}) => {
  return (
    <Tabs value={activeTab} onChange={changeActiveTab} variant="fullWidth">
      {tabTitles.map((title: string, index: number) => (
        <Tab
          key={index}
          label={title}
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
