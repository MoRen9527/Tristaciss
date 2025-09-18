import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import Dashboard from '../components/dashboard/Dashboard';
import TopNavBar from '../components/navigation/TopNavBar';
import '../styles/HomePage.css';

const DashboardOnlyPage: React.FC = () => {
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#001428',
      backgroundImage: `
        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)
      `,
    }}>
      {/* 顶部导航栏 */}
      <TopNavBar />
      
      {/* 动态星空背景 */}
      <Box className="stars-background" sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
        {Array.from({ length: 150 }).map((_, i) => (
          <Box
            key={i}
            className="star"
            sx={{
              position: 'absolute',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              backgroundColor: '#fff',
              borderRadius: '50%',
              animation: `twinkle ${Math.random() * 4 + 2}s infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </Box>
      
      {/* 星云背景效果 */}
      <Box className="nebula-background" sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} />
      
      {/* 主要内容区域 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        p: 2,
        overflow: 'hidden'
      }}>
        {/* 页面标题 */}
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography 
            variant="h4" 
            sx={{ 
              color: '#39ff14',
              textShadow: '0 0 10px rgba(57, 255, 20, 0.7)',
              letterSpacing: '2px',
              fontWeight: 300
            }}
          >
            🧠 赛博大脑监控中心
          </Typography>
        </Box>
        
        {/* 仪表盘容器 */}
        <Paper sx={{ 
          flex: 1,
          backgroundColor: 'rgba(0, 20, 40, 0.8)',
          border: '2px solid #39ff14',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 0 30px rgba(57, 255, 20, 0.3), inset 0 0 35px rgba(57, 255, 20, 0.1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #39ff14, transparent)',
            animation: 'scanLine 4s infinite linear',
          }
        }}>
          <Dashboard />
        </Paper>
      </Box>
    </Box>
  );
};

export default DashboardOnlyPage;