import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import MessageContent from './MessageContent';

interface TypewriterMessageProps {
  message: {
    provider: string;
    aiName: string;
    content: string;
    model?: string;
    performance?: any;
    tokens?: any;
    timestamp?: string;
    index?: number;
  };
  delay?: number; // 延迟开始打字的时间（毫秒）
  usdToCnyRate?: number;
}

const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  message,
  delay = 0,
  usdToCnyRate = 7.2
}) => {
  // 内置的辅助函数
  const getProviderDisplayName = (provider: string, aiName: string) => {
    return aiName || provider;
  };

  const getProviderColor = (provider: string) => {
    const colors: { [key: string]: string } = {
      'openrouter': '#00ff88',
      'deepseek': '#1e88e5',
      'glm': '#ff6b35',
      'openai': '#10a37f',
      'anthropic': '#d97706',
      'google': '#4285f4',
      'default': '#00ffff'
    };
    return colors[provider.toLowerCase()] || colors.default;
  };

  const formatCost = (cost: number) => {
    return cost.toFixed(4);
  };
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const content = message.content;
    if (!content) {
      setIsTypingComplete(true);
      setShowStats(true);
      return;
    }

    // 延迟开始打字效果
    const startTimer = setTimeout(() => {
      let currentIndex = 0;
      setDisplayedContent('');
      setIsTypingComplete(false);
      setShowStats(false);

      const typeInterval = setInterval(() => {
        if (currentIndex < content.length) {
          setDisplayedContent(content.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsTypingComplete(true);
          // 打字完成后延迟显示统计信息
          setTimeout(() => setShowStats(true), 300);
        }
      }, 30); // 每30ms显示一个字符，可以调整速度

      return () => clearInterval(typeInterval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [message.content, delay]);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        backgroundColor: 'background.paper',
        border: `2px solid ${getProviderColor(message.provider)}`,
        borderRadius: 2,
        position: 'relative'
      }}
    >
      {/* Provider标签 */}
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={getProviderDisplayName(message.provider, message.aiName)}
          size="small"
          sx={{
            backgroundColor: getProviderColor(message.provider),
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}
        />
        {message.model && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {message.model}
          </Typography>
        )}
      </Box>

      {/* 消息内容 - 使用打字机效果 */}
      <Box sx={{ minHeight: '1.5em' }}>
        <MessageContent content={displayedContent} sender="ai" />
        {/* 打字机光标效果 */}
        {!isTypingComplete && (
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: '2px',
              height: '1.2em',
              backgroundColor: getProviderColor(message.provider),
              marginLeft: '2px',
              animation: 'blink 1s infinite',
              '@keyframes blink': {
                '0%, 50%': { opacity: 1 },
                '51%, 100%': { opacity: 0 }
              }
            }}
          />
        )}
      </Box>

      {/* 性能和费用信息 - 打字完成后显示，与单聊格式完全一致 */}
      {showStats && (message.performance || message.tokens) && (
        <Box sx={{ 
          mt: 2, 
          pt: 1.5,
          borderTop: '1px solid rgba(0, 255, 255, 0.15)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          border: '1px solid rgba(0, 255, 255, 0.15)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 0 10px rgba(0, 255, 255, 0.1)',
          fontSize: '0.75rem',
          opacity: 0,
          animation: 'fadeIn 0.5s ease-in-out forwards',
          '@keyframes fadeIn': {
            '0%': { opacity: 0, transform: 'translateY(10px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' }
          }
        }}>
          {/* 性能信息 - 与单聊完全一致的样式 */}
          {message.performance && (
            <>
              {message.performance.first_token_time !== undefined && (
                <>
                  <span style={{ marginRight: '4px', color: '#aaa' }}>首字延迟:</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    marginRight: '8px',
                    color: '#4caf50',
                    textShadow: '0 0 5px #4caf50'
                  }}>
                    {message.performance.first_token_time.toFixed(3)}s
                  </span>
                </>
              )}
              {message.performance.response_time !== undefined && (
                <>
                  <span style={{ marginRight: '4px', color: '#aaa' }}>响应时间:</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    marginRight: '8px',
                    color: '#2196f3',
                    textShadow: '0 0 5px #2196f3'
                  }}>
                    {message.performance.response_time.toFixed(3)}s
                  </span>
                </>
              )}
              {message.performance.tokens_per_second !== undefined && (
                <>
                  <span style={{ marginRight: '4px', color: '#aaa' }}>速度:</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    marginRight: '8px',
                    color: '#ff9800',
                    textShadow: '0 0 5px #ff9800'
                  }}>
                    {message.performance.tokens_per_second.toFixed(1)} tokens/s
                  </span>
                </>
              )}
            </>
          )}

          {/* Token信息 - 与单聊完全一致的样式 */}
          {message.tokens && (
            <>
              <span style={{ marginRight: '4px', color: '#aaa' }}>输入:</span>
              <span style={{ 
                fontWeight: 'bold', 
                marginRight: '8px',
                color: '#4caf50',
                textShadow: '0 0 5px #4caf50'
              }}>
                {message.tokens.input || 0}
              </span>
              
              <span style={{ marginRight: '4px', color: '#aaa' }}>输出:</span>
              <span style={{ 
                fontWeight: 'bold', 
                marginRight: '8px',
                color: '#ff9800',
                textShadow: '0 0 5px #ff9800'
              }}>
                {message.tokens.output || 0}
              </span>
              
              {(message.tokens as any)?.cache && (message.tokens as any).cache > 0 && (
                <>
                  <span style={{ marginRight: '4px', color: '#aaa' }}>缓存:</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    marginRight: '8px',
                    color: '#2196f3',
                    textShadow: '0 0 5px #2196f3'
                  }}>
                    {(message.tokens as any).cache}
                  </span>
                </>
              )}
              
              <span style={{ marginRight: '4px', color: '#aaa' }}>总计:</span>
              <span style={{ 
                fontWeight: 'bold', 
                marginRight: '8px',
                color: '#e91e63',
                textShadow: '0 0 5px #e91e63'
              }}>
                {message.tokens.total || 0}
              </span>
              
              {/* 费用详细显示 - 与单聊完全一致 */}
              {(message.tokens as any)?.total_cost_cny !== undefined && (
                <>
                  <span style={{ marginRight: '4px', color: '#aaa' }}>费用:</span>
                  {(message.tokens as any)?.input_cost && (
                    <>
                      <span style={{ marginRight: '2px', color: '#666', fontSize: '0.7rem' }}>输入¥</span>
                      <span style={{ 
                        fontWeight: 'bold',
                        marginRight: '4px',
                        color: '#4caf50',
                        textShadow: '0 0 3px #4caf50',
                        fontSize: '0.7rem'
                      }}>
                        {(((message.tokens as any).input_cost) * usdToCnyRate).toFixed(4)}
                      </span>
                    </>
                  )}
                  {(message.tokens as any)?.output_cost && (
                    <>
                      <span style={{ marginRight: '2px', color: '#666', fontSize: '0.7rem' }}>输出¥</span>
                      <span style={{ 
                        fontWeight: 'bold',
                        marginRight: '4px',
                        color: '#ff9800',
                        textShadow: '0 0 3px #ff9800',
                        fontSize: '0.7rem'
                      }}>
                        {(((message.tokens as any).output_cost) * usdToCnyRate).toFixed(4)}
                      </span>
                    </>
                  )}
                  {(message.tokens as any)?.cache_cost && (message.tokens as any).cache_cost > 0 && (
                    <>
                      <span style={{ marginRight: '2px', color: '#666', fontSize: '0.7rem' }}>缓存¥</span>
                      <span style={{ 
                        fontWeight: 'bold',
                        marginRight: '4px',
                        color: '#2196f3',
                        textShadow: '0 0 3px #2196f3',
                        fontSize: '0.7rem'
                      }}>
                        {(((message.tokens as any).cache_cost) * usdToCnyRate).toFixed(4)}
                      </span>
                    </>
                  )}
                  <span style={{ marginRight: '2px', color: '#666', fontSize: '0.7rem' }}>总计¥</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    color: '#e91e63',
                    textShadow: '0 0 5px #e91e63',
                    fontSize: '0.8rem'
                  }}>
                    {((message.tokens as any).total_cost_cny * usdToCnyRate).toFixed(4)}
                  </span>
                </>
              )}
            </>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default TypewriterMessage;