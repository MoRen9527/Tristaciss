import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Fade, Slide } from '@mui/material';
import InfoCard from '../dashboard/InfoCard';
import DynamicCard from '../dashboard/DynamicCard';
import { RootState } from '../../store';
import { pushCard, removeCard } from '../../store/dynamicCardSlice';

interface InfoCardSystemProps {
  onKeywordTrigger?: (keyword: string) => void;
}

// 预定义的信息卡模板
const CARD_TEMPLATES = {
  // 英文关键字
  '/system': {
    id: 'system',
    title: '系统状态',
    type: 'systemStatus',
    icon: 'monitor',
    trigger: '用户调用',
    data: {
      cpuUsage: 45,
      memoryUsage: 68,
      serviceStatus: 'normal',
      uptime: '2天 14小时'
    }
  },
  '/conversation': {
    id: 'conversation',
    title: '对话分析',
    type: 'conversationAnalysis',
    icon: 'analytics',
    trigger: '用户调用',
    data: {
      messageCount: 24,
      userEngagement: 85,
      averageResponseTime: 1.2,
      emotion: '积极',
      sentiment: 'positive',
      topicTrends: ['技术咨询', 'AI开发', '系统优化']
    }
  },
  '/knowledge': {
    id: 'knowledge',
    title: '知识库状态',
    type: 'dataVisualization',
    icon: 'chart',
    trigger: '用户调用',
    data: {
      dataPoints: 15420,
      accuracy: 94.5,
      trends: 'upward',
      lastUpdate: Date.now()
    }
  },
  '/model': {
    id: 'modelViz',
    title: '模型可视化',
    type: 'modelInfo',
    icon: 'brain',
    trigger: '用户调用',
    data: {
      modelName: 'DeepSeek Chat',
      version: '3.1',
      accuracy: 96.8,
      responseTime: 1200,
      confidence: 94.2,
      tokenUsage: 15420
    }
  },
  '/security': {
    id: 'security',
    title: '安全监控',
    type: 'security',
    icon: 'security',
    trigger: '用户调用',
    data: {
      securityLevel: 'high',
      threatLevel: 'low',
      lastScan: '2分钟前',
      blockedAttacks: 0,
      encryption: 'AES-256',
      authStatus: 'verified'
    }
  },
  '/logs': {
    id: 'logs',
    title: '系统日志',
    type: 'systemLogs',
    icon: 'logs',
    trigger: '用户调用',
    data: {
      totalLogs: 8924,
      errorCount: 2,
      warningCount: 5,
      logLevel: 'INFO',
      retention: '30天',
      lastError: null
    }
  },
  '/workflow': {
    id: 'workflow',
    title: '工作流状态',
    type: 'workflow',
    icon: 'workflow',
    trigger: '用户调用',
    data: {
      activeWorkflows: 3,
      efficiency: 92,
      completedTasks: 18,
      pendingTasks: 5,
      nextAction: '数据分析任务',
      estimatedCompletion: '15分钟'
    }
  },
  '/profile': {
    id: 'profile',
    title: '用户档案',
    type: 'userProfile',
    icon: 'user',
    trigger: '用户调用',
    data: {
      userName: '星际探索者',
      userLevel: '高级用户',
      sessionTime: '2小时 15分钟',
      totalSessions: 47,
      activityScore: 85,
      preferredTopics: ['AI技术', '系统优化', '数据分析']
    }
  },
  '/groupchat': {
    id: 'groupChat',
    title: '群聊模型选择',
    type: 'groupChat',
    icon: 'group',
    trigger: '用户调用',
    data: {
      selectedModels: [],
      availableModels: [],
      chatMode: 'group',
      lastUpdate: Date.now(),
      modelCount: 0
    }
  },
  
  // 中文关键字（映射到相同的卡片）
  '/系统': {
    id: 'system',
    title: '系统状态',
    type: 'systemStatus',
    icon: 'monitor',
    trigger: '用户调用',
    data: {
      cpuUsage: 45,
      memoryUsage: 68,
      serviceStatus: 'normal',
      uptime: '2天 14小时'
    }
  },
  '/对话': {
    id: 'conversation',
    title: '对话分析',
    type: 'conversationAnalysis',
    icon: 'analytics',
    trigger: '用户调用',
    data: {
      messageCount: 24,
      userEngagement: 85,
      averageResponseTime: 1.2,
      emotion: '积极',
      sentiment: 'positive',
      topicTrends: ['技术咨询', 'AI开发', '系统优化']
    }
  },
  '/知识库': {
    id: 'knowledge',
    title: '知识库状态',
    type: 'dataVisualization',
    icon: 'chart',
    trigger: '用户调用',
    data: {
      dataPoints: 15420,
      accuracy: 94.5,
      trends: 'upward',
      lastUpdate: Date.now()
    }
  },
  '/模型': {
    id: 'modelViz',
    title: '模型可视化',
    type: 'modelInfo',
    icon: 'brain',
    trigger: '用户调用',
    data: {
      modelName: 'DeepSeek Chat',
      version: '3.1',
      accuracy: 96.8,
      responseTime: 1200,
      confidence: 94.2,
      tokenUsage: 15420
    }
  },
  '/安全': {
    id: 'security',
    title: '安全监控',
    type: 'security',
    icon: 'security',
    trigger: '用户调用',
    data: {
      securityLevel: 'high',
      threatLevel: 'low',
      lastScan: '2分钟前',
      blockedAttacks: 0,
      encryption: 'AES-256',
      authStatus: 'verified'
    }
  },
  '/日志': {
    id: 'logs',
    title: '系统日志',
    type: 'systemLogs',
    icon: 'logs',
    trigger: '用户调用',
    data: {
      totalLogs: 8924,
      errorCount: 2,
      warningCount: 5,
      logLevel: 'INFO',
      retention: '30天',
      lastError: null
    }
  },
  '/工作流': {
    id: 'workflow',
    title: '工作流状态',
    type: 'workflow',
    icon: 'workflow',
    trigger: '用户调用',
    data: {
      activeWorkflows: 3,
      efficiency: 92,
      completedTasks: 18,
      pendingTasks: 5,
      nextAction: '数据分析任务',
      estimatedCompletion: '15分钟'
    }
  },
  '/档案': {
    id: 'profile',
    title: '用户档案',
    type: 'userProfile',
    icon: 'user',
    trigger: '用户调用',
    data: {
      userName: '星际探索者',
      userLevel: '高级用户',
      sessionTime: '2小时 15分钟',
      totalSessions: 47,
      activityScore: 85,
      preferredTopics: ['AI技术', '系统优化', '数据分析']
    }
  },
  '/群聊': {
    id: 'groupChat',
    title: '群聊模型选择',
    type: 'groupChat',
    icon: 'group',
    trigger: '用户调用',
    data: {
      selectedModels: [],
      availableModels: [],
      chatMode: 'group',
      lastUpdate: Date.now(),
      modelCount: 0
    }
  },
  
  // 帮助命令
  '/help': {
    id: 'help',
    title: '命令帮助',
    type: 'help',
    icon: 'help',
    trigger: '用户调用',
    data: {
      commands: [
        { command: '/system', description: '显示系统状态信息', alias: '/系统' },
        { command: '/conversation', description: '显示对话分析数据', alias: '/对话' },
        { command: '/knowledge', description: '显示知识库状态', alias: '/知识库' },
        { command: '/model', description: '显示AI模型信息', alias: '/模型' },
        { command: '/security', description: '显示安全监控状态', alias: '/安全' },
        { command: '/logs', description: '显示系统日志信息', alias: '/日志' },
        { command: '/workflow', description: '显示工作流状态', alias: '/工作流' },
        { command: '/profile', description: '显示用户档案信息', alias: '/档案' },
        { command: '/groupchat', description: '显示群聊模型选择器', alias: '/群聊' },
        { command: '/help', description: '显示此帮助信息', alias: '/帮助' }
      ],
      totalCommands: 10,
      supportLanguages: ['English', '中文'],
      usage: '在聊天中输入命令即可触发对应的信息卡片'
    }
  },
  '/帮助': {
    id: 'help',
    title: '命令帮助',
    type: 'help',
    icon: 'help',
    trigger: '用户调用',
    data: {
      commands: [
        { command: '/system', description: '显示系统状态信息', alias: '/系统' },
        { command: '/conversation', description: '显示对话分析数据', alias: '/对话' },
        { command: '/knowledge', description: '显示知识库状态', alias: '/知识库' },
        { command: '/model', description: '显示AI模型信息', alias: '/模型' },
        { command: '/security', description: '显示安全监控状态', alias: '/安全' },
        { command: '/logs', description: '显示系统日志信息', alias: '/日志' },
        { command: '/workflow', description: '显示工作流状态', alias: '/工作流' },
        { command: '/profile', description: '显示用户档案信息', alias: '/档案' },
        { command: '/groupchat', description: '显示群聊模型选择器', alias: '/群聊' },
        { command: '/help', description: '显示此帮助信息', alias: '/帮助' }
      ],
      totalCommands: 10,
      supportLanguages: ['English', '中文'],
      usage: '在聊天中输入命令即可触发对应的信息卡片'
    }
  }
};

const InfoCardSystem: React.FC<InfoCardSystemProps> = ({ onKeywordTrigger }) => {
  const dispatch = useDispatch();
  const { cards } = useSelector((state: RootState) => state.dynamicCards);
  const [visibleCards, setVisibleCards] = useState<string[]>([]);
  
  // 调试信息
  React.useEffect(() => {
    console.log('InfoCardSystem: 当前 cards 状态:', cards);
    console.log('InfoCardSystem: cards 详细信息:', JSON.stringify(cards, null, 2));
  }, [cards]);

  // 当 cards 发生变化时，自动更新 visibleCards
  React.useEffect(() => {
    const newCardIds = cards.map(card => card.id);
    setVisibleCards(newCardIds);
  }, [cards]);

  // 处理关键字触发
  const handleKeywordTrigger = (keyword: string) => {
    // 确保关键词以斜杠开头
    const normalizedKeyword = keyword.startsWith('/') ? keyword : `/${keyword}`;
    const template = CARD_TEMPLATES[normalizedKeyword as keyof typeof CARD_TEMPLATES];
    
    console.log('触发关键词:', normalizedKeyword, '找到模板:', !!template);
    
    if (template) {
      const cardId = `${template.id}_${Date.now()}`;
      
      dispatch(pushCard({
        cardType: template.id,
        trigger: `用户调用: ${keyword}`,
        timestamp: Date.now()
      }));
      
      setVisibleCards(prev => [...prev, cardId]);
      
      if (onKeywordTrigger) {
        onKeywordTrigger(keyword);
      }
    }
  };

  // 处理卡片确认
  const handleConfirm = (cardId: string) => {
    console.log('确认卡片:', cardId);
    // 这里可以添加确认逻辑
  };

  // 处理卡片拒绝
  const handleReject = (cardId: string) => {
    dispatch(removeCard(cardId));
    setVisibleCards(prev => prev.filter(id => id !== cardId));
  };

  // 监听全局关键字事件（可以通过自定义事件实现）
  useEffect(() => {
    const handleGlobalKeyword = (event: CustomEvent) => {
      handleKeywordTrigger(event.detail.keyword);
    };

    window.addEventListener('infocard-trigger', handleGlobalKeyword as EventListener);
    
    return () => {
      window.removeEventListener('infocard-trigger', handleGlobalKeyword as EventListener);
    };
  }, []);

  // 暴露触发方法到全局
  useEffect(() => {
    (window as any).triggerInfoCard = handleKeywordTrigger;
    
    return () => {
      delete (window as any).triggerInfoCard;
    };
  }, []);

  return (
    <Box sx={{ 
      position: 'relative',
      width: '100%',
      height: '100%'
    }}>
      {/* 信息卡容器 */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(0, 0, 0, 0.1)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0, 255, 255, 0.3)',
          borderRadius: '3px',
        },
      }}>
        {cards.map((card, index) => (
          <Slide
            key={card.id}
            direction="left"
            in={true}
            timeout={300 + index * 100}
          >
            <Box>
              <Fade in={true} timeout={500 + index * 100}>
                <Box>
                  <DynamicCard 
                    card={card} 
                    index={index}
                    isFirst={index === 0}
                  />
                </Box>
              </Fade>
            </Box>
          </Slide>
        ))}
        
        {cards.length === 0 && (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'rgba(255, 255, 255, 0.5)',
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              🔮 信息卡系统就绪
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              使用关键字调用信息卡：
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>
              英文：/system /conversation /knowledge /model /security /logs /workflow /profile /groupchat /help
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              中文：/系统 /对话 /知识库 /模型 /安全 /日志 /工作流 /档案 /群聊 /帮助
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* 帮助提示 */}
      {cards.length > 0 && (
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          backgroundColor: 'rgba(0, 255, 255, 0.1)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: 1,
          p: 1,
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          💡 点击卡片右上角图标可在新标签页打开
        </Box>
      )}
    </Box>
  );
};

export default InfoCardSystem;

// 全局触发函数
export const triggerInfoCard = (keyword: string) => {
  const event = new CustomEvent('infocard-trigger', {
    detail: { keyword }
  });
  window.dispatchEvent(event);
};

// 可用的关键字列表
export const AVAILABLE_KEYWORDS = Object.keys(CARD_TEMPLATES);