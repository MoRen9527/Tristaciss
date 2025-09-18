import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface InfoCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, value, icon, color = '#1976d2' }) => {
  return (
    <Card 
      sx={{ 
        minWidth: 200,
        background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
        border: `1px solid ${color}30`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 20px ${color}30`,
        },
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" component="div" sx={{ color: color, fontWeight: 600 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
          {icon && (
            <Box sx={{ color: color, opacity: 0.7 }}>
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default InfoCard;