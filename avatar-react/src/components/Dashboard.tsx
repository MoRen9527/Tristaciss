import React from 'react';
import { Box, Typography } from '@mui/material';

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  return (
    <Box>
      <Typography variant="h5">Dashboard</Typography>
    </Box>
  );
};

export default Dashboard;