import React from 'react';
import { Box, Typography, LinearProgress, SxProps, Theme } from '@mui/material';
import './SciFiCard.css';

interface SciFiCardProps {
  icon?: React.ReactNode;
  title?: string;
  value?: string | number;
  subtitle?: string;
  progress?: number;
  sx?: SxProps<Theme>;
}

/**
 * 科幻风格卡片组件
 */
const SciFiCard: React.FC<SciFiCardProps> = ({ 
  icon, 
  title, 
  value, 
  subtitle, 
  progress, 
  sx = {} 
}) => {
  return (
    <Box className="sci-fi-card" sx={sx}>
      <Box className="card-header">
        {icon && <Box className="card-icon">{icon}</Box>}
        <Typography variant="h6" className="card-title">
          {title}
        </Typography>
      </Box>
      
      <Typography variant="h4" className="card-value">
        {value}
      </Typography>
      
      {subtitle && (
        <Typography variant="body2" className="card-subtitle">
          {subtitle}
        </Typography>
      )}
      
      {progress !== undefined && (
        <LinearProgress
          variant="determinate"
          value={progress}
          className="card-progress"
        />
      )}
      
      {/* 科幻装饰元素 */}
      <Box className="card-corner top-left"></Box>
      <Box className="card-corner top-right"></Box>
      <Box className="card-corner bottom-left"></Box>
      <Box className="card-corner bottom-right"></Box>
      <Box className="card-scan-line"></Box>
    </Box>
  );
};

export default SciFiCard;