import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/index';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Avatar, 
  Button,
  Fade,
  ClickAwayListener,
  Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { logout, checkAuth } from '../../store/authSlice';
import UserSettings from '../settings/UserSettings';
import './UserAvatar.css';

const UserAvatar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const avatarRef = useRef<HTMLDivElement>(null);

  // 计算用户名首字母
  const getUserInitials = (): string => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // 处理头像点击
  const handleAvatarClick = (): void => {
    setMenuOpen(!menuOpen);
  };

  // 关闭菜单
  const handleMenuClose = (): void => {
    setMenuOpen(false);
  };

  // 刷新用户数据
  const handleRefresh = async (): Promise<void> => {
    try {
      await dispatch(checkAuth() as any);
      console.log('用户数据刷新成功');
    } catch (error) {
      console.error('刷新用户数据失败:', error);
    }
    handleMenuClose();
  };

  // 处理退出登录
  const handleLogout = async (): Promise<void> => {
    try {
      await dispatch(logout());
      navigate('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
      localStorage.removeItem('token');
      navigate('/login');
    }
    handleMenuClose();
  };

  return (
    <>
      <ClickAwayListener onClickAway={(event) => {
        // 检查点击的是否是头像按钮或其子元素
        const avatarButton = avatarRef.current;
        if (avatarButton && (avatarButton.contains(event.target as Node) || avatarButton === event.target)) {
          return;
        }
        handleMenuClose();
      }}>
        <Box className="user-avatar-container">
          {/* 用户头像按钮 */}
          <Box 
            ref={avatarRef}
            className="user-avatar-button"
            onClick={handleAvatarClick}
          >
            <Box className="sci-fi-avatar">
              <PersonIcon />
            </Box>
          </Box>


        </Box>
      </ClickAwayListener>

      {/* 用户菜单面板 - 使用Portal渲染到body */}
      {menuOpen && createPortal(
        <Card 
          style={{ 
            position: 'fixed',
            top: '70px',
            right: '20px',
            zIndex: 999999,
            minWidth: '320px',
            maxWidth: '400px',
            background: 'linear-gradient(135deg, rgba(13, 26, 42, 0.95), rgba(1, 11, 20, 0.98))',
            border: '2px solid #00ffff',
            boxShadow: '0 8px 32px rgba(0, 255, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* 用户信息头部 */}
          <Box style={{ position: 'relative', padding: '20px 20px 16px' }}>
            {/* 状态指示器 - 移到右上角 */}
            <Box style={{ 
              position: 'absolute',
              top: '12px',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Box style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'linear-gradient(45deg, #00ff88, #00ffff)',
                boxShadow: '0 0 12px rgba(0, 255, 136, 0.8)',
                animation: 'pulse 2s infinite'
              }} />
            </Box>
            
            <Box style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* 第一行：头像 + 用户名 + 状态 */}
              <Box style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <Box style={{ position: 'relative' }}>
                  <Box style={{
                    position: 'relative',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00ffff, #0080ff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(0, 255, 255, 0.3)',
                    boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)'
                  }}>
                    <PersonIcon style={{ color: '#001122', fontSize: '24px' }} />
                  </Box>
                  <Box style={{
                    position: 'absolute',
                    inset: '-4px',
                    borderRadius: '50%',
                    background: 'conic-gradient(from 0deg, transparent, #00ffff, transparent)',
                    animation: 'spin 3s linear infinite',
                    zIndex: -1
                  }} />
                </Box>
                
                <Box style={{ flex: 1 }}>
                  <Typography style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 600,
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    marginBottom: '2px'
                  }}>
                    {user?.username || '访客'}
                  </Typography>
                  <Typography style={{
                    color: '#00ff88',
                    fontSize: '12px',
                    fontWeight: 500
                  }}>
                    在线
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* 第二行：位置信息 */}
            <Box style={{ marginTop: '8px' }}>
              <Typography style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontStyle: 'italic'
              }}>
                星球城市空间站
              </Typography>
            </Box>
          </Box>

          {/* 菜单内容 */}
          <CardContent style={{ padding: '0 20px 20px' }}>
            {/* 用户详细信息 */}
            <Box style={{ marginBottom: '16px' }}>
              <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Typography style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', textTransform: 'uppercase' }}>
                  用户ID
                </Typography>
                <Typography style={{ color: '#00ffff', fontSize: '11px', fontFamily: 'monospace' }}>
                  {user?.id || 'N/A'}
                </Typography>
              </Box>
              <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Typography style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', textTransform: 'uppercase' }}>
                  邮箱
                </Typography>
                <Typography style={{ color: '#00ffff', fontSize: '11px', fontFamily: 'monospace' }}>
                  {user?.email || 'N/A'}
                </Typography>
              </Box>
              <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', textTransform: 'uppercase' }}>
                  会话时长
                </Typography>
                <Typography style={{ color: '#00ffff', fontSize: '11px', fontFamily: 'monospace' }}>
                  02:34:17
                </Typography>
              </Box>
            </Box>

            <Divider style={{ 
              backgroundColor: 'rgba(0, 255, 255, 0.2)', 
              margin: '16px 0',
              height: '1px'
            }} />

            {/* 操作按钮 */}
            <Box style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Button 
                size="small" 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                style={{
                  flex: 1,
                  borderColor: 'rgba(0, 255, 255, 0.3)',
                  color: '#00ffff',
                  fontSize: '11px',
                  textTransform: 'none',
                  background: 'rgba(0, 255, 255, 0.05)',
                  '&:hover': {
                    borderColor: '#00ffff',
                    background: 'rgba(0, 255, 255, 0.1)'
                  }
                }}
              >
                刷新
              </Button>
              
              <Button 
                size="small" 
                variant="outlined" 
                startIcon={<SettingsIcon />}
                onClick={() => {
                  setSettingsOpen(true);
                  handleMenuClose();
                }}
                style={{
                  flex: 1,
                  borderColor: 'rgba(0, 255, 255, 0.3)',
                  color: '#00ffff',
                  fontSize: '11px',
                  textTransform: 'none',
                  background: 'rgba(0, 255, 255, 0.05)',
                  '&:hover': {
                    borderColor: '#00ffff',
                    background: 'rgba(0, 255, 255, 0.1)'
                  }
                }}
              >
                设置
              </Button>
            </Box>

            <Divider style={{ 
              backgroundColor: 'rgba(0, 255, 255, 0.2)', 
              margin: '16px 0',
              height: '1px'
            }} />

            {/* 退出登录 */}
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              fullWidth
              style={{
                borderColor: 'rgba(255, 64, 64, 0.5)',
                color: '#ff6b6b',
                fontSize: '12px',
                textTransform: 'none',
                background: 'rgba(255, 64, 64, 0.05)',
                '&:hover': {
                  borderColor: '#ff6b6b',
                  background: 'rgba(255, 64, 64, 0.1)'
                }
              }}
            >
              退出登录
            </Button>
          </CardContent>
        </Card>,
        document.body
      )}

      {/* 用户设置面板 */}
      <UserSettings 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </>
  );
};

export default UserAvatar;