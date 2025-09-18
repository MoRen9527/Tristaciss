import React from 'react';
import { Box, Typography, Button, Chip, Tooltip } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Token as TokenIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import UserAvatar from '../user/UserAvatar';
import './TopNavBar.css';

const TopNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleNavigation = (path: string): void => {
    navigate(path);
  };

  // 格式化数字显示
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <Box className="top-navbar">
      {/* 左侧 Logo 和产品名称 */}
      <Box className="navbar-left">
        <Box className="logo-container">
          <Box className="logo-icon">
            🪐
          </Box>
          <Box className="brand-info">
            <Typography variant="h6" className="brand-name">
              三元宇宙
            </Typography>
            <Typography variant="caption" className="brand-subtitle">
              星球城市空间站
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 中间导航菜单 */}
      <Box className="navbar-center">
        <Box className="nav-menu">
          <Button
            variant={location.pathname === '/' ? 'contained' : 'text'}
            onClick={() => handleNavigation('/')}
            sx={{
              color: location.pathname === '/' ? '#fff' : '#0ff',
              backgroundColor: location.pathname === '/' ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '8px',
              margin: '0 8px',
              '&:hover': {
                backgroundColor: 'rgba(0, 255, 255, 0.1)',
                borderColor: '#0ff'
              }
            }}
          >
            🏠 空间站
          </Button>
          <Button
            variant={location.pathname === '/gamefi' ? 'contained' : 'text'}
            onClick={() => handleNavigation('/gamefi')}
            sx={{
              color: location.pathname === '/gamefi' ? '#fff' : '#0ff',
              backgroundColor: location.pathname === '/gamefi' ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '8px',
              margin: '0 8px',
              '&:hover': {
                backgroundColor: 'rgba(0, 255, 255, 0.1)',
                borderColor: '#0ff'
              }
            }}
          >
            🎮 平行宇宙GameFi
          </Button>
        </Box>
        <Box className="center-decoration">
          <Box className="decoration-line"></Box>
          <Box className="decoration-pulse"></Box>
        </Box>
      </Box>

      {/* 右侧用户信息和头像 */}
      <Box className="navbar-right">
        {/* 用户信息 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, 
          mr: 8,
          fontSize: '12px'
        }}>
          <Typography variant="caption" sx={{ 
            color: '#00ffff', 
            fontSize: '12px',
            fontWeight: 500,
            fontFamily: 'monospace',
            textShadow: '0 0 8px rgba(0, 255, 255, 0.6)',
            whiteSpace: 'nowrap',
            letterSpacing: '0.5px'
          }}>
            欢迎, {user?.username}
          </Typography>
          <Tooltip 
            title="Token余额" 
            arrow
            placement="bottom"
            sx={{
              '& .MuiTooltip-tooltip': {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: '#39ff14',
                border: '1px solid rgba(57, 255, 20, 0.3)',
                fontSize: '11px',
                fontFamily: 'monospace'
              },
              '& .MuiTooltip-arrow': {
                color: 'rgba(0, 0, 0, 0.9)'
              }
            }}
          >
            <Chip 
              icon={<TokenIcon sx={{ fontSize: '14px' }} />}
              label={`${formatNumber(100000000)}`}
              size="small"
              sx={{ 
                height: '24px',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'monospace',
                backgroundColor: 'rgba(57, 255, 20, 0.15)',
                color: '#39ff14',
                border: '1px solid rgba(57, 255, 20, 0.4)',
                borderRadius: '12px',
                boxShadow: '0 0 10px rgba(57, 255, 20, 0.3)',
                cursor: 'pointer',
                '& .MuiChip-label': {
                  px: 1,
                  letterSpacing: '0.3px'
                },
                '& .MuiChip-icon': {
                  fontSize: '14px',
                  filter: 'drop-shadow(0 0 4px rgba(57, 255, 20, 0.8))'
                },
                '&:hover': {
                  backgroundColor: 'rgba(57, 255, 20, 0.25)',
                  boxShadow: '0 0 15px rgba(57, 255, 20, 0.5)'
                }
              }}
            />
          </Tooltip>
          <Chip 
            label="VIP"
            size="small"
            sx={{ 
              height: '24px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'monospace',
              backgroundColor: 'rgba(255, 215, 0, 0.15)',
              color: '#ffd700',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              borderRadius: '12px',
              boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
              '& .MuiChip-label': {
                px: 1,
                letterSpacing: '0.5px',
                textShadow: '0 0 6px rgba(255, 215, 0, 0.8)'
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 215, 0, 0.25)',
                boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)'
              }
            }}
          />
        </Box>
        <UserAvatar />
      </Box>
    </Box>
  );
};

export default TopNavBar;