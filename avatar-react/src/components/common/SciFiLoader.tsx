import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(0, 255, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 255, 255, 0);
  }
`;

const glow = keyframes`
  0%, 100% {
    text-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff;
  }
  50% {
    text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff;
  }
`;

interface SciFiLoaderProps {
  message?: string;
  size?: number;
}

const SciFiLoader: React.FC<SciFiLoaderProps> = ({ 
  message = "加载中...", 
  size = 60 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: 3,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress
          size={size}
          thickness={2}
          sx={{
            color: '#00ffff',
            animation: `${pulse} 2s infinite`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: size * 0.6,
            height: size * 0.6,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,255,255,0.3) 0%, transparent 70%)',
            animation: `${pulse} 2s infinite 0.5s`,
          }}
        />
      </Box>
      
      <Typography
        variant="h6"
        sx={{
          color: '#00ffff',
          fontFamily: 'monospace',
          animation: `${glow} 2s ease-in-out infinite`,
          letterSpacing: '2px',
        }}
      >
        {message}
      </Typography>
      
      <Box
        sx={{
          display: 'flex',
          gap: 1,
        }}
      >
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#00ffff',
              animation: `${pulse} 1.5s infinite ${index * 0.2}s`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default SciFiLoader;