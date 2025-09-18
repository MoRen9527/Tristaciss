import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogActions, Typography, Box, IconButton } from '@mui/material';
import { Warning, Error, Info, CheckCircle, Close } from '@mui/icons-material';
import { keyframes } from '@mui/system';
import SciFiButton from './SciFiButton';

const scanLine = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const glowPulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

interface SciFiNotificationProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const SciFiNotification: React.FC<SciFiNotificationProps> = ({
  open,
  onClose,
  title,
  message,
  type = 'error',
  autoClose = false,
  autoCloseDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [open, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: <Error />,
          color: '#ff4444',
          borderColor: 'rgba(255, 68, 68, 0.5)',
          glowColor: 'rgba(255, 68, 68, 0.3)'
        };
      case 'warning':
        return {
          icon: <Warning />,
          color: '#ffaa00',
          borderColor: 'rgba(255, 170, 0, 0.5)',
          glowColor: 'rgba(255, 170, 0, 0.3)'
        };
      case 'info':
        return {
          icon: <Info />,
          color: '#00aaff',
          borderColor: 'rgba(0, 170, 255, 0.5)',
          glowColor: 'rgba(0, 170, 255, 0.3)'
        };
      case 'success':
        return {
          icon: <CheckCircle />,
          color: '#00ff88',
          borderColor: 'rgba(0, 255, 136, 0.5)',
          glowColor: 'rgba(0, 255, 136, 0.3)'
        };
      default:
        return {
          icon: <Error />,
          color: '#ff4444',
          borderColor: 'rgba(255, 68, 68, 0.5)',
          glowColor: 'rgba(255, 68, 68, 0.3)'
        };
    }
  };

  const typeConfig = getTypeConfig();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)',
          border: `2px solid ${typeConfig.borderColor}`,
          borderRadius: '8px',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden',
          transform: isVisible ? 'scale(1)' : 'scale(0.8)',
          opacity: isVisible ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 0 30px ${typeConfig.glowColor}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${typeConfig.color}, transparent)`,
            animation: `${scanLine} 2s infinite`,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: `1px solid ${typeConfig.color}`,
            borderRadius: '8px',
            opacity: 0.3,
            animation: `${glowPulse} 2s infinite`,
            pointerEvents: 'none',
          }
        }
      }}
    >
      {/* 关闭按钮 */}
      <IconButton
        onClick={handleClose}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: typeConfig.color,
          zIndex: 1,
          '&:hover': {
            background: `${typeConfig.color}20`,
            transform: 'scale(1.1)',
          }
        }}
      >
        <Close />
      </IconButton>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* 图标 */}
          <Box
            sx={{
              color: typeConfig.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 40,
              height: 40,
              borderRadius: '50%',
              border: `2px solid ${typeConfig.color}`,
              background: `${typeConfig.color}10`,
              filter: `drop-shadow(0 0 10px ${typeConfig.color})`,
              animation: `${glowPulse} 2s infinite`,
            }}
          >
            {typeConfig.icon}
          </Box>

          {/* 内容 */}
          <Box sx={{ flex: 1, pt: 0.5 }}>
            {title && (
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  mb: 1,
                  textShadow: `0 0 10px ${typeConfig.color}`,
                }}
              >
                {title}
              </Typography>
            )}
            <Typography
              variant="body1"
              sx={{
                color: '#e0e0e0',
                fontFamily: 'monospace',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
              }}
            >
              {message}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <SciFiButton
          onClick={handleClose}
          glowColor={typeConfig.color}
          variant="outlined"
          sx={{ minWidth: 100 }}
        >
          确定
        </SciFiButton>
      </DialogActions>

      {/* 装饰性角落 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 20,
          height: 20,
          borderTop: `3px solid ${typeConfig.color}`,
          borderLeft: `3px solid ${typeConfig.color}`,
          opacity: 0.7,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 20,
          height: 20,
          borderTop: `3px solid ${typeConfig.color}`,
          borderRight: `3px solid ${typeConfig.color}`,
          opacity: 0.7,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 20,
          height: 20,
          borderBottom: `3px solid ${typeConfig.color}`,
          borderLeft: `3px solid ${typeConfig.color}`,
          opacity: 0.7,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 20,
          height: 20,
          borderBottom: `3px solid ${typeConfig.color}`,
          borderRight: `3px solid ${typeConfig.color}`,
          opacity: 0.7,
        }}
      />
    </Dialog>
  );
};

export default SciFiNotification;