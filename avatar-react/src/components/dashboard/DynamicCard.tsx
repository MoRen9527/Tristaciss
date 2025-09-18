import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { 
  Box, 
  Typography, 
  IconButton, 
  LinearProgress, 
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Button,
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Monitor as MonitorIcon,
  Analytics as AnalyticsIcon,
  AccountTree as WorkflowIcon,
  BarChart as ChartIcon,
  Person as PersonIcon,
  Psychology as BrainIcon,
  Security as SecurityIcon,
  Description as LogsIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Code as CodeIcon,
  Help as HelpIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import AIProgrammingCard from './AIProgrammingCard';
import GroupChatCard from './GroupChatCard';
import QuickCommandCard from './QuickCommandCard';
import { removeCard, updateCardData, markCardAsRead } from '../../store/dynamicCardSlice';
import NewTabButton from '../common/NewTabButton';
import './DynamicCard.css';

// 图标映射
const ICON_MAP = {
  monitor: MonitorIcon,
  analytics: AnalyticsIcon,
  workflow: WorkflowIcon,
  chart: ChartIcon,
  user: PersonIcon,
  brain: BrainIcon,
  security: SecurityIcon,
  logs: LogsIcon,
  code: CodeIcon,
  help: HelpIcon,
  group: GroupIcon
};

// 获取状态颜色
const getStatusColor = (status) => {
  switch (status) {
    case 'normal': case 'active': case 'high': case 'verified': return 'success';
    case 'warning': case 'medium': return 'warning';
    case 'error': case 'critical': case 'low': return 'error';
    case 'positive': return 'success';
    case 'negative': return 'error';
    default: return 'primary';
  }
};

// 系统状态卡片内容
const SystemStatusContent = ({ data, onUpdate }) => (
  <Box className="dynamic-card-content">
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Box className="metric-item">
          <Typography variant="caption" className="metric-label">CPU使用率</Typography>
          <LinearProgress 
            variant="determinate" 
            value={data.cpuUsage} 
            className="metric-progress"
            color={data.cpuUsage > 80 ? 'error' : 'primary'}
          />
          <Typography variant="body2" className="metric-value">{data.cpuUsage}%</Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <Box className="metric-item">
          <Typography variant="caption" className="metric-label">内存使用率</Typography>
          <LinearProgress 
            variant="determinate" 
            value={data.memoryUsage} 
            className="metric-progress"
            color={data.memoryUsage > 85 ? 'error' : 'primary'}
          />
          <Typography variant="body2" className="metric-value">{data.memoryUsage}%</Typography>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box className="status-info">
          <Chip 
            label={`服务状态: ${data.serviceStatus === 'normal' ? '正常' : '异常'}`}
            color={getStatusColor(data.serviceStatus)}
            size="small"
            className="status-chip"
          />
          <Typography variant="caption" className="uptime-text">
            运行时间: {data.uptime}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// 对话分析卡片内容
const ConversationAnalysisContent = ({ data }) => (
  <Box className="dynamic-card-content">
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <Box className="analysis-metric">
          <Typography variant="h3" className="metric-number">{data.messageCount}</Typography>
          <Typography variant="caption" className="metric-label">消息数量</Typography>
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box className="analysis-metric">
          <Typography variant="h3" className="metric-number">{data.userEngagement}%</Typography>
          <Typography variant="caption" className="metric-label">参与度</Typography>
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box className="analysis-metric">
          <Typography variant="h3" className="metric-number">{data.averageResponseTime}s</Typography>
          <Typography variant="caption" className="metric-label">响应时间</Typography>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Divider className="content-divider" />
        <Box className="sentiment-analysis">
          <Chip 
            label={`情感: ${data.emotion}`}
            color={getStatusColor(data.sentiment)}
            className="sentiment-chip"
          />
          <Box className="topic-trends">
            <Typography variant="caption" className="trends-label">热门话题:</Typography>
            {data.topicTrends.map((topic, index) => (
              <Chip key={index} label={topic} size="small" variant="outlined" className="topic-chip" />
            ))}
          </Box>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// 工作流卡片内容
const WorkflowContent = ({ data }) => (
  <Box className="dynamic-card-content">
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Box className="workflow-stat">
          <Typography variant="h4" className="stat-number">{data.activeWorkflows}</Typography>
          <Typography variant="caption" className="stat-label">活跃工作流</Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <Box className="workflow-stat">
          <Typography variant="h4" className="stat-number">{data.efficiency}%</Typography>
          <Typography variant="caption" className="stat-label">效率</Typography>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box className="task-summary">
          <Box className="task-row">
            <Typography variant="body2">已完成任务: {data.completedTasks}</Typography>
            <Typography variant="body2">待处理任务: {data.pendingTasks}</Typography>
          </Box>
          <Box className="next-action">
            <Typography variant="caption" className="next-label">下一步操作:</Typography>
            <Typography variant="body2" className="next-text">{data.nextAction}</Typography>
            <Typography variant="caption" className="eta-text">预计: {data.estimatedCompletion}</Typography>
          </Box>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// 数据可视化卡片内容
const DataVisualizationContent = ({ data }) => (
  <Box className="dynamic-card-content">
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Box className="data-overview">
          <Typography variant="h4" className="data-count">{data.dataPoints.toLocaleString()}</Typography>
          <Typography variant="caption" className="data-label">数据点</Typography>
          <Chip 
            label={`准确率: ${data.accuracy}%`}
            color="success"
            size="small"
            className="accuracy-chip"
          />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box className="trend-info">
          <Typography variant="body2" className="trend-label">趋势分析:</Typography>
          <Chip 
            label={data.trends === 'upward' ? '上升' : '下降'}
            color={data.trends === 'upward' ? 'success' : 'error'}
            size="small"
          />
          <Typography variant="caption" className="update-time">
            最后更新: {new Date(data.lastUpdate).toLocaleTimeString()}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// 用户档案卡片内容
const UserProfileContent = ({ data }) => (
  <Box className="dynamic-card-content">
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Box className="user-info">
          <Typography variant="h6" className="user-name">{data.userName}</Typography>
          <Chip 
            label={data.userLevel}
            color="primary"
            size="small"
            className="user-level-chip"
          />
        </Box>
      </Grid>
      <Grid item xs={6}>
        <Box className="session-info">
          <Typography variant="body2">本次会话: {data.sessionTime}</Typography>
          <Typography variant="body2">总会话数: {data.totalSessions}</Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <Box className="activity-score">
          <Typography variant="h4" className="score-number">{data.activityScore}</Typography>
          <Typography variant="caption" className="score-label">活跃度</Typography>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box className="preferences">
          <Typography variant="caption" className="pref-label">偏好话题:</Typography>
          <Box className="pref-chips">
            {data.preferredTopics.map((topic, index) => (
              <Chip key={index} label={topic} size="small" variant="outlined" className="pref-chip" />
            ))}
          </Box>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// AI模型信息卡片内容
const ModelInfoContent = ({ data }) => (
  <Box className="dynamic-card-content">
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Box className="model-header">
          <Typography variant="h6" className="model-name">{data.modelName}</Typography>
          <Chip label={`v${data.version}`} size="small" color="primary" />
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box className="model-metric">
          <Typography variant="h4" className="metric-value">{data.accuracy}%</Typography>
          <Typography variant="caption" className="metric-label">准确率</Typography>
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box className="model-metric">
          <Typography variant="h4" className="metric-value">{data.responseTime}ms</Typography>
          <Typography variant="caption" className="metric-label">响应时间</Typography>
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box className="model-metric">
          <Typography variant="h4" className="metric-value">{data.confidence}%</Typography>
          <Typography variant="caption" className="metric-label">置信度</Typography>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2" className="token-usage">
          Token使用量: {data.tokenUsage.toLocaleString()}
        </Typography>
      </Grid>
    </Grid>
  </Box>
);

// 安全监控卡片内容
const SecurityContent = ({ data }) => (
  <Box className="dynamic-card-content">
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Box className="security-level">
          <Typography variant="h5" className="level-text">
            {data.securityLevel === 'high' ? '高' : data.securityLevel === 'medium' ? '中' : '低'}
          </Typography>
          <Typography variant="caption" className="level-label">安全等级</Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <Box className="threat-level">
          <Typography variant="h5" className="threat-text">
            {data.threatLevel === 'low' ? '低' : data.threatLevel === 'medium' ? '中' : '高'}
          </Typography>
          <Typography variant="caption" className="threat-label">威胁等级</Typography>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box className="security-details">
          <Typography variant="body2">最后扫描: {data.lastScan}</Typography>
          <Typography variant="body2">拦截攻击: {data.blockedAttacks} 次</Typography>
          <Typography variant="body2">加密方式: {data.encryption}</Typography>
          <Chip 
            label={data.authStatus === 'verified' ? '已验证' : '未验证'}
            color={getStatusColor(data.authStatus)}
            size="small"
          />
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// 系统日志卡片内容
const SystemLogsContent = ({ data }) => (
  <Box className="dynamic-card-content">
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <Box className="log-count">
          <Typography variant="h4" className="count-number">{data.totalLogs.toLocaleString()}</Typography>
          <Typography variant="caption" className="count-label">总日志数</Typography>
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box className="error-count">
          <Typography variant="h4" className="count-number error">{data.errorCount}</Typography>
          <Typography variant="caption" className="count-label">错误</Typography>
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box className="warning-count">
          <Typography variant="h4" className="count-number warning">{data.warningCount}</Typography>
          <Typography variant="caption" className="count-label">警告</Typography>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box className="log-details">
          <Typography variant="body2">日志级别: {data.logLevel}</Typography>
          <Typography variant="body2">保留期限: {data.retention}</Typography>
          {data.lastError && (
            <Typography variant="body2" className="last-error">
              最后错误: {data.lastError}
            </Typography>
          )}
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// AI编程卡片内容
const AIProgrammingContent = ({ data, onUpdate }) => {
  const handleClose = () => {
    // 关闭AI编程卡片的回调
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <Box className="dynamic-card-content ai-programming-wrapper">
      <AIProgrammingCard data={data} onClose={handleClose} />
    </Box>
  );
};

// 帮助卡片内容
const HelpContent = ({ data }) => (
  <Box className="dynamic-card-content">
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Box className="help-overview">
          <Typography variant="body1" className="help-description">
            {data.usage}
          </Typography>
          <Box className="help-stats">
            <Chip 
              label={`${data.totalCommands} 个命令`}
              color="primary"
              size="small"
              className="help-stat-chip"
            />
            <Chip 
              label={`支持 ${data.supportLanguages.join(' / ')}`}
              color="secondary"
              size="small"
              className="help-stat-chip"
            />
          </Box>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Divider className="content-divider" />
        <Typography variant="h6" className="commands-title">可用命令:</Typography>
        <Box className="commands-list">
          {data.commands.map((cmd, index) => (
            <Box key={index} className="command-item">
              <Box className="command-header">
                <Typography variant="body2" className="command-name">
                  {cmd.command}
                </Typography>
                {cmd.alias && (
                  <Typography variant="caption" className="command-alias">
                    ({cmd.alias})
                  </Typography>
                )}
              </Box>
              <Typography variant="caption" className="command-description">
                {cmd.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box className="help-footer">
          <Typography variant="caption" className="help-tip">
            💡 提示: 在聊天中直接输入命令即可触发对应功能
          </Typography>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// 内容渲染器映射
const CONTENT_RENDERERS = {
  systemStatus: SystemStatusContent,
  conversationAnalysis: ConversationAnalysisContent,
  workflow: WorkflowContent,
  dataVisualization: DataVisualizationContent,
  userProfile: UserProfileContent,
  modelInfo: ModelInfoContent,
  security: SecurityContent,
  systemLogs: SystemLogsContent,
  aiProgramming: AIProgrammingContent,
  help: HelpContent,
  groupChat: GroupChatCard,
  quickCommand: QuickCommandCard
};

const DynamicCard = ({ card, index, isFirst = false }) => {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  
  const IconComponent = ICON_MAP[card.icon] || InfoIcon;
  const ContentRenderer = CONTENT_RENDERERS[card.type];
  
  useEffect(() => {
    if (card.isNew) {
      setAnimateIn(true);
      // 标记为已读
      setTimeout(() => {
        dispatch(markCardAsRead(card.id));
      }, 1000);
    }
  }, [card.isNew, card.id, dispatch]);
  
  const handleClose = () => {
    dispatch(removeCard(card.id));
  };
  
  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const handleRefresh = () => {
    // 模拟数据刷新
    dispatch(updateCardData({
      id: card.id,
      data: {
        ...card.data,
        lastUpdated: Date.now()
      }
    }));
  };
  
  return (
    <Card 
      className={`dynamic-card ${card.type} ${animateIn ? 'animate-in' : ''} ${isFirst ? 'first-card' : ''}`}
      elevation={3}
      style={{
        animationDelay: `${index * 0.1}s`
      } as React.CSSProperties & { '--card-index': number }}
    >
      <CardContent className="card-header">
        <Box className="header-content">
          <Box className="title-section">
            <IconComponent className="card-icon" />
            <Box className="title-text">
              <Typography variant="h6" className="card-title">
                {card.title}
                {card.isNew && <Chip label="新" size="small" color="secondary" className="new-badge" />}
              </Typography>
              <Typography variant="caption" className="card-subtitle">
                {card.trigger} • {new Date(card.timestamp).toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>
          <Box className="header-actions">
            <NewTabButton 
              url={`/info-card/${card.type}`}
              title="在新标签页打开"
              size="small"
              color="#00ffff"
            />
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              className="action-btn refresh-btn"
              title="刷新数据"
            >
              <RefreshIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={handleToggleExpand}
              className="action-btn expand-btn"
              title={expanded ? "收起" : "展开"}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton 
              size="small" 
              onClick={handleClose}
              className="action-btn close-btn"
              title="关闭卡片"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent className="card-body">
          {ContentRenderer && <ContentRenderer data={card.data} onUpdate={handleRefresh} />}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default DynamicCard;