import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  CloudQueue as CloudIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as AIIcon,
  Token as TokenIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../hooks/redux';
import NewTabButton from '../common/NewTabButton';
import InfoCardSystem from '../cards/InfoCardSystem';

interface SystemMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  status: 'good' | 'warning' | 'error';
  icon: React.ReactNode;
}

interface AIProvider {
  name: string;
  status: 'online' | 'offline' | 'error';
  model: string;
  responseTime: number;
  tokensUsed: number;
  tokensLimit: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([
    {
      label: 'CPU使用率',
      value: 45,
      max: 100,
      unit: '%',
      status: 'good',
      icon: <SpeedIcon />
    },
    {
      label: '内存使用',
      value: 2.4,
      max: 8,
      unit: 'GB',
      status: 'good',
      icon: <MemoryIcon />
    },
    {
      label: '存储空间',
      value: 156,
      max: 512,
      unit: 'GB',
      status: 'warning',
      icon: <StorageIcon />
    },
    {
      label: '网络延迟',
      value: 23,
      max: 100,
      unit: 'ms',
      status: 'good',
      icon: <CloudIcon />
    }
  ]);

  const [aiProviders, setAiProviders] = useState<AIProvider[]>([
    {
      name: 'OpenRouter',
      status: 'online',
      model: 'gpt-4-turbo',
      responseTime: 1200,
      tokensUsed: 15420,
      tokensLimit: 100000000
    },
    {
      name: 'OpenAI',
      status: 'online',
      model: 'gpt-3.5-turbo',
      responseTime: 800,
      tokensUsed: 8930,
      tokensLimit: 100000000
    },
    {
      name: 'DeepSeek',
      status: 'online',
      model: 'deepseek-chat',
      responseTime: 950,
      tokensUsed: 5240,
      tokensLimit: 100000000
    },
    {
      name: 'GLM',
      status: 'offline',
      model: 'glm-4',
      responseTime: 0,
      tokensUsed: 0,
      tokensLimit: 100000000
    }
  ]);

  const [autoRefresh, setAutoRefresh] = useState(true);

  // 模拟数据更新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setSystemMetrics(prev => prev.map(metric => ({
        ...metric,
        value: Math.max(0, metric.value + (Math.random() - 0.5) * 10)
      })));

      setAiProviders(prev => prev.map(provider => ({
        ...provider,
        responseTime: provider.status === 'online' 
          ? Math.max(200, provider.responseTime + (Math.random() - 0.5) * 200)
          : 0,
        tokensUsed: provider.status === 'online'
          ? provider.tokensUsed + Math.floor(Math.random() * 10)
          : provider.tokensUsed
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // 主页加载完成时自动触发快速调用卡片
  useEffect(() => {
    // 延迟一点时间确保组件完全加载
    const timer = setTimeout(() => {
      const quickCommandEvent = new CustomEvent('infocard-trigger', {
        detail: { keyword: '/help' }
      });
      window.dispatchEvent(quickCommandEvent);
    }, 1000); // 1秒后触发

    return () => clearTimeout(timer);
  }, []); // 只在组件首次加载时执行

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
      case 'online':
        return '#39ff14';
      case 'warning':
        return '#ffaa00';
      case 'error':
      case 'offline':
        return '#ff4444';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
      case 'online':
        return <CheckIcon sx={{ color: '#39ff14' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#ffaa00' }} />;
      case 'error':
      case 'offline':
        return <ErrorIcon sx={{ color: '#ff4444' }} />;
      default:
        return null;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <Box sx={{ 
      height: '100%', 
      p: 2,
      backgroundColor: 'rgba(0, 20, 40, 0.8)',
      border: '1px solid rgba(57, 255, 20, 0.3)',
      borderRadius: 0, // 移除圆角
      overflow: 'hidden',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    }}>
      {/* 仪表盘头部 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 3,
        pb: 1,
        borderBottom: '1px solid rgba(57, 255, 20, 0.2)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ 
            color: '#39ff14',
            textShadow: '0 0 10px rgba(57, 255, 20, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <TrendingUpIcon />
            超维意识空间
          </Typography>
          <NewTabButton 
            url="/dashboard-only" 
            title="在新标签页打开超维意识空间"
            size="small"
            color="#39ff14"
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#39ff14',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#39ff14',
                  },
                }}
              />
            }
            label={
              <Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>
                自动刷新
              </Typography>
            }
          />
          <IconButton size="small" sx={{ color: '#39ff14' }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>



      {/* 信息卡系统 */}
      <InfoCardSystem />
    </Box>
  );
};

export default Dashboard;