import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Chip } from '@mui/material';

interface GroupChatStatusProps {}

const GroupChatStatus: React.FC<GroupChatStatusProps> = () => {
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [currentAiName, setCurrentAiName] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalProviders, setTotalProviders] = useState<number>(0);
  const [status, setStatus] = useState<'waiting' | 'thinking' | 'responding'>('waiting');

  useEffect(() => {
    const handleThinking = (event: CustomEvent) => {
      const { provider, aiName, index, total } = event.detail;
      setCurrentProvider(provider);
      setCurrentAiName(aiName);
      setCurrentIndex(index);
      setTotalProviders(total);
      setStatus('thinking');
    };

    const handleProviderStart = (event: CustomEvent) => {
      const { provider, aiName, index, total } = event.detail;
      setCurrentProvider(provider);
      setCurrentAiName(aiName);
      setCurrentIndex(index);
      setTotalProviders(total);
      setStatus('responding');
    };

    const handleProviderEnd = (event: CustomEvent) => {
      // 保持当前状态，等待下一个provider或结束
    };

    const handleGroupChatComplete = (event: CustomEvent) => {
      // 🔥 群聊完成时重置状态
      setStatus('waiting');
      setCurrentProvider('');
      setCurrentAiName('');
      setCurrentIndex(0);
      setTotalProviders(0);
    };

    window.addEventListener('groupChatThinking', handleThinking as EventListener);
    window.addEventListener('groupChatProviderStart', handleProviderStart as EventListener);
    window.addEventListener('groupChatProviderEnd', handleProviderEnd as EventListener);
    window.addEventListener('groupChatComplete', handleGroupChatComplete as EventListener);

    return () => {
      window.removeEventListener('groupChatThinking', handleThinking as EventListener);
      window.removeEventListener('groupChatProviderStart', handleProviderStart as EventListener);
      window.removeEventListener('groupChatProviderEnd', handleProviderEnd as EventListener);
      window.removeEventListener('groupChatComplete', handleGroupChatComplete as EventListener);
    };
  }, []);

  const getStatusText = () => {
    if (status === 'waiting') {
      return 'AI们正在落座...';
    } else if (status === 'thinking') {
      return `${currentAiName} 正在阅读聊天内容...`;
    } else if (status === 'responding') {
      return `${currentAiName} 正在阅读聊天内容...`;
    }
    return 'AI们正在进入群聊...';
  };

  const getProgress = () => {
    if (totalProviders === 0) return 0;
    return ((currentIndex + (status === 'responding' ? 0.5 : 0)) / totalProviders) * 100;
  };

  return (
    <Box sx={{ width: '100%', minWidth: 200 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="body2" sx={{ color: 'var(--primary-color)' }}>
          {getStatusText()}
        </Typography>
        {totalProviders > 0 && (
          <Chip 
            label={`${currentIndex + 1}/${totalProviders}`}
            size="small"
            sx={{ 
              backgroundColor: 'rgba(0, 229, 255, 0.2)',
              color: 'var(--primary-color)',
              fontSize: '0.7rem'
            }}
          />
        )}
      </Box>
      
      {totalProviders > 0 && (
        <LinearProgress
          variant="determinate"
          value={getProgress()}
          sx={{
            height: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'var(--primary-color)',
              borderRadius: 2,
            },
          }}
        />
      )}
      
      {currentProvider && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.6)',
            display: 'block',
            mt: 0.5,
            fontSize: '0.65rem'
          }}
        >
          当前: {currentAiName}
        </Typography>
      )}
    </Box>
  );
};

export default GroupChatStatus;