import React from 'react';
import { Button } from '@mui/material';
import { keyframes } from '@mui/system';

const neonGlow = keyframes`
  0%, 100% {
    box-shadow: 
      0 0 5px currentColor,
      0 0 10px currentColor,
      0 0 15px currentColor,
      inset 0 0 5px rgba(0, 255, 255, 0.1);
  }
  50% {
    box-shadow: 
      0 0 10px currentColor,
      0 0 20px currentColor,
      0 0 30px currentColor,
      inset 0 0 10px rgba(0, 255, 255, 0.2);
  }
`;

interface SciFiButtonProps {
  children: React.ReactNode;
  variant?: 'outlined' | 'contained' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  glowColor?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  sx?: any;
  [key: string]: any;
}

const SciFiButton: React.FC<SciFiButtonProps> = ({ 
  children, 
  variant = 'outlined', 
  color = 'primary',
  glowColor = '#00ffff',
  ...props 
}) => {
  return (
    <Button
      variant={variant}
      {...props}
      sx={{
        borderColor: glowColor,
        color: glowColor,
        background: variant === 'contained' 
          ? `linear-gradient(45deg, ${glowColor}20, ${glowColor}10)` 
          : 'transparent',
        borderWidth: 2,
        borderStyle: 'solid',
        borderRadius: 0,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: glowColor,
          color: variant === 'contained' ? '#000' : glowColor,
          background: variant === 'contained' 
            ? glowColor 
            : `${glowColor}20`,
          animation: `${neonGlow} 1.5s ease-in-out infinite`,
        },
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${glowColor}40, transparent)`,
          transition: 'left 0.5s',
        },
        '&:hover:before': {
          left: '100%',
        },
        ...props.sx,
      }}
    >
      {children}
    </Button>
  );
};

export default SciFiButton;