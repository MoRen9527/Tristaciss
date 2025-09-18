import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
interface QuickCommandCardProps {
  card: any;
  onUpdate?: (cardId: string, data: any) => void;
  onClose?: (cardId: string) => void;
}

const QuickCommandCard: React.FC<QuickCommandCardProps> = ({ card, onUpdate, onClose }) => {
  // 安全访问card数据，提供默认值
  const safeCard = card || {
    id: 'quickCommand',
    data: {
      commands: [],
      description: '点击关键字或输入关键字快速调用信息卡',
      lastUpdate: new Date().toISOString()
    }
  };

  const cardData = safeCard.data || {
    commands: [],
    description: '点击关键字或输入关键字快速调用信息卡',
    lastUpdate: new Date().toISOString()
  };

  // 快速命令列表
  const quickCommands = [
    { key: '/system', label: '系统', color: '#00ff88' },
    { key: '/conversation', label: '对话', color: '#00ccff' },
    { key: '/knowledge', label: '知识', color: '#ff6b35' },
    { key: '/model', label: '模型', color: '#a855f7' },
    { key: '/security', label: '安全', color: '#ef4444' },
    { key: '/logs', label: '日志', color: '#f59e0b' },
    { key: '/workflow', label: '工作流', color: '#10b981' },
    { key: '/profile', label: '配置', color: '#8b5cf6' },
    { key: '/help', label: '帮助', color: '#06b6d4' },
    { key: '/清理', label: '清理', color: '#f97316' },
    { key: '/知识库', label: '知识库', color: '#84cc16' },
    { key: '/服务', label: '服务', color: '#ec4899' },
    { key: '/安全', label: '安全', color: '#ef4444' },
    { key: '/日志', label: '日志', color: '#f59e0b' },
    { key: '/工作流', label: '工作流', color: '#10b981' },
    { key: '/优化', label: '优化', color: '#6366f1' },
    { key: '/帮助', label: '帮助', color: '#06b6d4' }
  ];

  const handleClose = () => {
    if (onClose) {
      onClose(safeCard.id);
    }
  };

  const handleCommandClick = (command: string) => {
    // 这里可以触发命令执行或者其他操作
    console.log('Quick command clicked:', command);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        border: '1px solid #00ff88',
        borderRadius: '12px',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #00ff88, #00ccff, #ff6b35)',
          animation: 'pulse 2s ease-in-out infinite alternate'
        },
        '@keyframes pulse': {
          '0%': { opacity: 0.6 },
          '100%': { opacity: 1 }
        }
      }}
    >
      {/* 头部 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SpeedIcon sx={{ color: '#00ff88', mr: 1, fontSize: '20px' }} />
        <Typography
          variant="h6"
          sx={{
            color: '#00ff88',
            fontWeight: 'bold',
            fontSize: '16px',
            flex: 1,
            fontFamily: 'monospace'
          }}
        >
          信息卡快速调用
        </Typography>
        <Tooltip title="关闭">
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              color: '#ff6b6b',
              '&:hover': {
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                transform: 'scale(1.1)'
              }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 描述信息 */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <InfoIcon sx={{ color: '#00ccff', mr: 1, fontSize: '16px' }} />
          <Typography
            variant="body2"
            sx={{
              color: '#00ccff',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
          >
            点击关键字或输入关键字快速调用信息卡（支持中英文）
          </Typography>
        </Box>
      </Box>

      {/* 快速命令网格 */}
      <Grid container spacing={1}>
        {quickCommands.map((cmd, index) => (
          <Grid item xs={6} sm={4} md={3} key={index}>
            <Chip
              label={cmd.label}
              size="small"
              onClick={() => handleCommandClick(cmd.key)}
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: cmd.color,
                border: `1px solid ${cmd.color}`,
                fontSize: '10px',
                height: '24px',
                width: '100%',
                fontFamily: 'monospace',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: cmd.color,
                  color: '#000',
                  transform: 'scale(1.05)',
                  boxShadow: `0 0 10px ${cmd.color}`
                },
                '&:active': {
                  transform: 'scale(0.95)'
                }
              }}
            />
          </Grid>
        ))}
      </Grid>

      {/* 底部提示 */}
      <Box
        sx={{
          mt: 2,
          pt: 1,
          borderTop: '1px solid rgba(0, 255, 136, 0.2)',
          textAlign: 'center'
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '10px',
            fontFamily: 'monospace'
          }}
        >
          在右侧命令输入框输入关键字或点击上方标签快速调用
        </Typography>
      </Box>
    </Paper>
  );
};

export default QuickCommandCard;