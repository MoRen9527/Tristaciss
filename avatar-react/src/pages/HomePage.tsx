import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Typography } from '@mui/material';
import ChatPanel from '../components/chat/ChatPanel';
import Dashboard from '../components/dashboard/Dashboard';
import TopNavBar from '../components/navigation/TopNavBar';
import { logout } from '../store/authSlice';
import '../styles/HomePage.css';
import '../styles/ResizableLayout.css';

const HomePage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector(state => state.auth);
  
  // 引用DOM元素
  const chatPanelRef = useRef(null);
  const dashboardPanelRef = useRef(null);
  const spaceshipEffectsRef = useRef(null);
  const resizeHandleRef = useRef(null);
  
  // 状态管理
  const [stars, setStars] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showMainContent, setShowMainContent] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [loadingText, setLoadingText] = useState('正在启动系统...');
  const [isResizing, setIsResizing] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(33); // 初始宽度百分比
  const [showWidthIndicator, setShowWidthIndicator] = useState(false);
  
  // 处理退出登录
  const handleLogout = async () => {
    try {
      // 记录退出操作，不使用Loading变量
      console.log('正在退出登录...');
      
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
  
  // 生成星星
  const generateStars = () => {
    const newStars = [];
    for (let i = 0; i < 150; i++) {
      newStars.push({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 4
      });
    }
    setStars(newStars);
  };
  
  // 处理鼠标移动和抬起的函数引用
  const handleMouseMoveRef = useRef(null);
  const handleMouseUpRef = useRef(null);

  // 初始化函数引用
  useEffect(() => {
    let containerRect = null;
    
    handleMouseMoveRef.current = (e) => {
      // 缓存容器尺寸信息，避免重复查询DOM
      if (!containerRect) {
        const containerEl = document.querySelector('.main-content');
        if (containerEl) {
          containerRect = containerEl.getBoundingClientRect();
        } else {
          return;
        }
      }
      
      const relativeX = e.clientX - containerRect.left;
      const percent = (relativeX / containerRect.width) * 100;
      const newWidth = Math.max(20, Math.min(80, percent));
      
      setChatPanelWidth(newWidth);
      setShowWidthIndicator(true);
    };

    handleMouseUpRef.current = () => {
      containerRect = null; // 清除缓存，下次拖拽时重新获取
      setIsResizing(false);
      setShowWidthIndicator(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMoveRef.current);
      document.removeEventListener('mouseup', handleMouseUpRef.current);
    };
  }, []); // 移除isResizing依赖，避免状态更新问题

  // 处理拖动调整大小
  const handleMouseDown = useCallback((e) => {
    console.log('Mouse down triggered!'); // 调试信息
    e.preventDefault(); // 防止默认行为
    e.stopPropagation(); // 阻止事件冒泡
    
    console.log('Setting isResizing to true'); // 调试信息
    setIsResizing(true);
    
    // 设置全局鼠标样式和禁止文本选择
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    // 立即绑定事件监听器
    console.log('Binding mousemove and mouseup events'); // 调试信息
    document.addEventListener('mousemove', handleMouseMoveRef.current);
    document.addEventListener('mouseup', handleMouseUpRef.current);
    
    // 测试立即调用一次mousemove来验证
    console.log('Testing immediate mousemove call');
    if (handleMouseMoveRef.current) {
      // 模拟一个mousemove事件来测试
      console.log('handleMouseMoveRef.current exists');
    }
  }, []);

  // 清理事件监听器
  useEffect(() => {
    return () => {
      if (handleMouseMoveRef.current) {
        document.removeEventListener('mousemove', handleMouseMoveRef.current);
      }
      if (handleMouseUpRef.current) {
        document.removeEventListener('mouseup', handleMouseUpRef.current);
      }
    };
  }, []);

  // 启动主内容动画 - 首先定义这个函数，因为它不依赖其他函数
  const startMainContentAnimations = useCallback(() => {
    // 延迟启动面板动画
    setTimeout(() => {
      if (chatPanelRef.current) {
        chatPanelRef.current.classList.add('panel-active');
        chatPanelRef.current.parentElement.classList.add('scan-active');
      }
    }, 500);
    
    setTimeout(() => {
      if (dashboardPanelRef.current) {
        dashboardPanelRef.current.classList.add('panel-active');
        dashboardPanelRef.current.parentElement.classList.add('scan-active');
      }
    }, 500);
  }, []);
  
  // 过渡到主内容 - 第二个定义，因为它依赖startMainContentAnimations
  const transitionToMainContent = useCallback(() => {
    // 开始过渡动画
    setShowEffects(true);
    
    // 隐藏欢迎界面
    setTimeout(() => {
      setShowWelcome(false);
    }, 500);
    
    // 显示主页内容
    setTimeout(() => {
      setShowMainContent(true);
      startMainContentAnimations();
    }, 1000);
  }, [startMainContentAnimations]);
  
  // 欢迎界面序列 - 最后定义，因为它依赖transitionToMainContent
  const startWelcomeSequence = useCallback(() => {
    const steps = [
      { delay: 500, progress: 25, step: 1, text: '初始化系统中...' },
      { delay: 1500, progress: 50, step: 2, text: '连接AI模块中...' },
      { delay: 2500, progress: 75, step: 3, text: '加载仪表盘中...' },
      { delay: 3500, progress: 100, step: 4, text: '启动完成!' },
    ];
    
    steps.forEach((stepData) => {
      setTimeout(() => {
        setLoadingProgress(stepData.progress);
        setStep(stepData.step);
        setLoadingText(stepData.text);
      }, stepData.delay);
    });
    
    // 启动完成后过渡到主页
    setTimeout(() => {
      transitionToMainContent();
    }, 4500);
  }, [transitionToMainContent]);
  
  // 组件挂载时生成星星和启动欢迎序列
  useEffect(() => {
    generateStars();
    startWelcomeSequence();
  }, [startWelcomeSequence]);
  
  return (
    <Box className="home-container">
      {/* 顶部导航栏 - 始终显示 */}
      {showMainContent && <TopNavBar />}
      
      {/* 动态星空背景 - 始终显示 */}
      <Box className="stars-background">
        {stars.map(star => (
          <Box
            key={star.id}
            className="star"
            sx={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`
            }}
          />
        ))}
      </Box>
      
      {/* 星云背景效果 - 始终显示 */}
      <Box className="nebula-background"></Box>
      
      {/* 第一阶段：欢迎界面 */}
      {showWelcome && (
        <Box className="welcome-stage">
          <Box className="welcome-content">
            <Box className="welcome-title-container">
              <Typography 
                variant="h1" 
                className="sci-fi-title"
                sx={{ 
                  fontSize: '2rem',
                  fontWeight: 300,
                  color: '#00ffff',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.7)',
                  letterSpacing: '2px',
                  marginBottom: '1rem'
                }}
              >
                🪐 欢迎来到三元宇宙
              </Typography>
              <Typography  className="sci-fi-subtitle">正在进入星球城市空间站...</Typography>
              <Box className="scanning-line"></Box>
            </Box>
            
            {/* 加载进度指示器 */}
            <Box className="loading-progress">
              <Box className="progress-container">
                <Box className="progress-bar" sx={{ width: `${loadingProgress}%` }}></Box>
              </Box>
              <Typography className="loading-text">{loadingText}</Typography>
            </Box>
            
            {/* 系统初始化信息 */}
            <Box className="system-status sci-fi-border">
              <Box className={`status-line ${step >= 1 ? 'active' : ''}`}>
                <span className="status-icon">●</span>
                <span>正在初始化星球城市系统...</span>
              </Box>
              <Box className={`status-line ${step >= 2 ? 'active' : ''}`}>
                <span className="status-icon">●</span>
                <span>联通星际阿凡达...</span>
              </Box>
              <Box className={`status-line ${step >= 3 ? 'active' : ''}`}>
                <span className="status-icon">●</span>
                <span>共享超维意识空间...</span>
              </Box>
              <Box className={`status-line ${step >= 4 ? 'active' : ''}`}>
                <span className="status-icon">●</span>
                <span>启动完成，准备进入空间站...</span>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
      
      {/* 第二阶段：主页内容 */}
      {showMainContent && (
        <Box className={`main-stage ${showMainContent ? 'active' : ''}`}>
          <Box className="main-content">
            <Box sx={{
                  display: 'flex', 
                  height: '100%', 
                  width: '100%'
                }}>
              {/* 左侧聊天面板 - 可调整宽度 */}
              <Box 
                className={`chat-panel-container sci-fi-gradient content-row ${isResizing ? 'resizing' : ''}`}
                sx={{
                  display: 'flex', 
                  position: 'relative',
                  width: `${chatPanelWidth}%`,
                  flexShrink: 0,
                  flexDirection: 'column',
                  borderRadius: 0, // 移除圆角
                  overflow: 'hidden'
                }}
              >
                <Box className="sci-fi-panel chat-panel" ref={chatPanelRef} sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: 'none', // 移除右侧边框
                  borderRadius: 0 // 移除圆角
                }}>
                  {/* 扫描线效果 */}
                  <Box className="scan-line"></Box>
                  {/* 引擎光晕 */}
                  <Box className="chat-panel-engine-glow"></Box>
                  
                  <ChatPanel />
                </Box>
              </Box>
              
              {/* 宽度调整手柄 - 美化版本 */}
              <Box 
                ref={resizeHandleRef}
                className="resize-handle"
                onMouseDown={handleMouseDown}
                sx={{
                  width: '8px',
                  height: '100%',
                  cursor: 'ew-resize',
                  background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 255, 255, 0.4) 50%, rgba(0, 255, 255, 0.2) 100%)',
                  transition: 'all 0.3s ease',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                  borderLeft: '1px solid rgba(0, 255, 255, 0.3)',
                  borderRight: '1px solid rgba(0, 255, 255, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.4) 0%, rgba(0, 255, 255, 0.7) 50%, rgba(0, 255, 255, 0.4) 100%)',
                    width: '12px',
                    boxShadow: '0 0 15px rgba(0, 255, 255, 0.6)',
                    borderLeft: '1px solid rgba(0, 255, 255, 0.6)',
                    borderRight: '1px solid rgba(0, 255, 255, 0.6)'
                  },
                  '&:active': {
                    background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.6) 0%, rgba(0, 255, 255, 0.9) 50%, rgba(0, 255, 255, 0.6) 100%)',
                    boxShadow: '0 0 20px rgba(0, 255, 255, 0.8)'
                  }
                }}
              >
                {/* 拖拽指示器 - 三条线设计 */}
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  alignItems: 'center'
                }}>
                  {[1, 2, 3].map((i) => (
                    <Box key={i} sx={{
                      width: '2px',
                      height: '8px',
                      backgroundColor: 'rgba(0, 255, 255, 0.8)',
                      borderRadius: '1px',
                      opacity: 0.7,
                      transition: 'all 0.2s ease',
                      '.resize-handle:hover &': {
                        opacity: 1,
                        backgroundColor: 'rgba(0, 255, 255, 1)',
                        boxShadow: '0 0 3px rgba(0, 255, 255, 0.8)'
                      }
                    }} />
                  ))}
                </Box>

                {/* 宽度指示器 */}
                {showWidthIndicator && (
                  <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '20px',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0, 255, 255, 0.95)',
                    color: '#000',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 1002,
                    boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    animation: 'fadeInOut 1.5s ease-in-out'
                  }}>
                    {Math.round(chatPanelWidth)}%
                  </Box>
                )}
              </Box>
              
              {/* 右侧仪表盘（赛博大脑） */}
              <Box 
                className="dashboard-container sci-fi-gradient"
                sx={{ 
                  width: `${100 - chatPanelWidth}%`,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 0, // 移除圆角
                  overflow: 'hidden'
                }}
              >
                <Box className="sci-fi-panel dashboard-panel" ref={dashboardPanelRef} sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: 'none', // 移除左侧边框
                  borderRadius: 0 // 移除圆角
                }}>
                  {/* 扫描线效果 */}
                  <Box className="scan-line"></Box>
                  {/* 引擎光晕 */}
                  <Box className="dashboard-panel-engine-glow"></Box>
                  
                  <Dashboard />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
      
      {/* 飞船航行特效容器 */}
      <Box 
        className={`spaceship-effects-container ${showEffects ? 'active' : ''}`}
        ref={spaceshipEffectsRef}
      >
        {/* 引擎尾焰 */}
        <Box className="engine-glow"></Box>
        {/* 离子尾迹 */}
        <Box className="ion-trail ion-trail-left"></Box>
        <Box className="ion-trail ion-trail-center"></Box>
        <Box className="ion-trail ion-trail-right"></Box>
        {/* 航行轨迹 */}
        <Box className="flight-path"></Box>
      </Box>

    </Box>
  );
};

export default HomePage;