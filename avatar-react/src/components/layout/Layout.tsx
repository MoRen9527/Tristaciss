import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Tooltip,
  Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { logout } from '../../store/authSlice';
import { RootState, AppDispatch } from '../../store';
import './Layout.css';

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  // 切换抽屉菜单
  const toggleDrawer = (): void => {
    setDrawerOpen(!drawerOpen);
  };
  
  // 处理退出登录
  const handleLogout = async (): Promise<void> => {
    try {
      // 直接调用logout，重定向由logout函数处理
      await dispatch(logout());
      // 添加备用重定向方法，确保一定能跳转到登录页面
      setTimeout(() => {
        localStorage.removeItem('token');
        navigate('/login');
        // 如果导航不起作用，尝试直接修改location
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 300);
    } catch (error) {
      console.error('退出登录失败:', error);
      // 即使出错也要尝试重定向到登录页面
      localStorage.removeItem('token');
      navigate('/login');
    }
  };
  
  // 菜单项
  const menuItems: MenuItem[] = [
    { text: '首页', icon: <HomeIcon />, path: '/' },
    { text: '聊天', icon: <ChatIcon />, path: '/chat' },
    { text: '仪表盘', icon: <DashboardIcon />, path: '/dashboard' },
  ];
  
  return (
    <Box className="layout-container">
      {/* 顶部导航栏 */}
      <AppBar position="fixed" className="app-bar">
        <Toolbar className="toolbar">
          {/* 菜单按钮 */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer}
            className="menu-button"
          >
            <MenuIcon />
          </IconButton>
          
          {/* 应用标题 */}
          <Typography variant="h6" className="app-title">
            星际数字助手
          </Typography>
          
          {/* 右侧用户信息 */}
          <Box className="user-section">
            {isAuthenticated ? (
              <>
                <Tooltip title={user?.username || '用户'}>
                  <Avatar className="user-avatar">
                    {user?.username?.charAt(0) || 'U'}
                  </Avatar>
                </Tooltip>
              </>
            ) : (
              <>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  size="small"
                  className="login-button"
                >
                  登录
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* 侧边抽屉菜单 */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        className="drawer"
        classes={{
          paper: 'drawer-paper'
        }}
      >
        {/* 抽屉菜单头部 */}
        <Box className="drawer-header">
          <Typography variant="h6" className="drawer-title">
            星际数字助手
          </Typography>
        </Box>
        
        {/* 菜单列表 */}
        <List className="drawer-list">
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.text} 
              className="drawer-list-item"
              onClick={toggleDrawer}
            >
              <ListItemIcon className="drawer-icon">
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
        
        {/* 用户相关菜单 */}
        {isAuthenticated && (
          <List className="drawer-list user-list">
            <ListItem button className="drawer-list-item">
              <ListItemIcon className="drawer-icon">
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="个人资料" />
            </ListItem>
            
            <ListItem 
              button 
              className="drawer-list-item"
              onClick={handleLogout}
            >
              <ListItemIcon className="drawer-icon">
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="退出登录" />
            </ListItem>
          </List>
        )}
        
        {/* 装饰性元素 */}
        <Box className="drawer-decoration top-left"></Box>
        <Box className="drawer-decoration top-right"></Box>
        <Box className="drawer-decoration bottom-left"></Box>
        <Box className="drawer-decoration bottom-right"></Box>
      </Drawer>
      
      {/* 主内容区域 */}
      <Box className="main-content">
        {children}
      </Box>
    </Box>
  );
};

export default Layout;