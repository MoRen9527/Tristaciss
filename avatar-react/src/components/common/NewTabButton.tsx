import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';

interface NewTabButtonProps {
  url: string;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const NewTabButton: React.FC<NewTabButtonProps> = ({ 
  url, 
  title = '在新标签页打开', 
  size = 'small',
  color = '#00ffff'
}) => {
  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Tooltip title={title} arrow>
      <IconButton
        size={size}
        onClick={handleOpenInNewTab}
        sx={{
          color: color,
          backgroundColor: `${color}10`,
          border: `1px solid ${color}30`,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: `${color}20`,
            borderColor: `${color}60`,
            transform: 'scale(1.05)',
          },
        }}
      >
        <OpenInNewIcon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
};

export default NewTabButton;