import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import TypewriterMessage from './TypewriterMessage';
import { getUsdToCnyRate } from '../../services/exchangeRate';

interface GroupChatMessage {
  id: string;
  provider: string;
  aiName: string;
  content: string;
  timestamp: Date;
  isComplete: boolean;
  model?: string;
  performance?: {
    first_token_time?: number;
    response_time?: number;
    tokens_per_second?: number;
  };
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
    cache?: number;
    input_cost?: number;
    output_cost?: number;
    cache_cost?: number;
    total_cost_cny?: number;
  };
}

interface GroupChatMessagesProps {
  responses: any[];
  onComplete?: () => void;
  isLoading?: boolean;
}

const GroupChatMessages: React.FC<GroupChatMessagesProps> = ({ responses, onComplete, isLoading = false }) => {
  const [usdToCnyRate, setUsdToCnyRate] = useState<number>(7.2);

  // 初始化汇率
  useEffect(() => {
    const initExchangeRate = async () => {
      try {
        const rate = getUsdToCnyRate();
        setUsdToCnyRate(rate);
      } catch (error) {
        console.warn('获取汇率失败，使用默认值 7.2:', error);
      }
    };
    
    initExchangeRate();
    
    // 每小时更新一次汇率
    const interval = setInterval(initExchangeRate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 重要修复：完全依赖Redux传入的responses，不再监听事件
  // 这样避免了双重处理导致的重复和消失问题
  const displayedMessages: GroupChatMessage[] = responses.map((response, index) => ({
    id: `${response.provider || 'unknown'}-${response.timestamp || Date.now()}-${index}`,
    provider: response.provider || 'unknown',
    aiName: response.aiName || response.ai_name || response.provider || 'AI',
    content: response.content || response.response || '',
    timestamp: response.timestamp ? new Date(response.timestamp) : new Date(),
    isComplete: true,
    model: response.model,
    // 🔥 关键修复：确保性能和 token 信息正确传递
    performance: response.performance || response.usage?.performance,
    tokens: response.tokens || response.usage
  }));

  // 移除频繁的调试日志，减少性能影响
  // console.log('🔍 [GroupChat Debug] 渲染消息数量:', displayedMessages.length);

  // 当所有响应都完成时调用onComplete
  useEffect(() => {
    if (responses.length > 0 && onComplete) {
      onComplete();
    }
  }, [responses.length, onComplete]);

  // 检查用户是否在底部附近
  const isNearBottom = () => {
    const container = document.querySelector('[data-messages-container]');
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // 100px的误差范围
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // 当消息内容更新时滚动到底部（仅当用户在底部附近时）
  useEffect(() => {
    const scrollToBottom = () => {
      const messagesContainer = document.querySelector('[data-messages-container]');
      if (messagesContainer && isNearBottom()) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    };
    
    // 延迟滚动，确保DOM更新完成
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [displayedMessages]);

  const getProviderDisplayName = (provider: string, aiName: string) => {
    // 如果aiName已经包含了完整的显示名称，直接使用
    if (aiName && aiName.includes('-')) {
      return aiName;
    }
    
    // 如果是OpenRouter特定模型，显示具体模型名
    if (provider.startsWith('openrouter:')) {
      const modelId = provider.split(':')[1];
      const modelName = modelId.split('/').pop() || modelId;
      return `OpenRouter-${modelName}`;
    }
    
    return aiName || provider;
  };

  const getProviderColor = (provider: string) => {
    if (provider.startsWith('openrouter')) return '#8b5cf6';
    if (provider.includes('deepseek')) return '#1976d2';
    if (provider.includes('glm')) return '#4caf50';
    if (provider.includes('claude')) return '#ff6b35';
    if (provider.includes('gpt')) return '#10a37f';
    return '#666';
  };

  const formatCost = (cost: number) => {
    if (cost < 0.0001) {
      return cost.toExponential(2);
    }
    return cost.toFixed(4);
  };

  // 🔥 完全移除"等待AI回复..."显示，因为底部已有状态显示
  // 如果没有响应，则不显示任何内容
  if (!responses || responses.length === 0) {
    return null;
  }

  return (
    <Box sx={{ width: '100%' }}>
      {displayedMessages.map((message, index) => (
        <TypewriterMessage
          key={message.id}
          message={message}
          getProviderDisplayName={getProviderDisplayName}
          getProviderColor={getProviderColor}
          formatCost={formatCost}
          usdToCnyRate={usdToCnyRate}
          delay={index * 500} // 每个消息延迟500ms开始，创造依次出现的效果
        />
      ))}
    </Box>
  );
};

export default GroupChatMessages;