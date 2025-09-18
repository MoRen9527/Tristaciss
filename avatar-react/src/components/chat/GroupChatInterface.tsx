import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Chip,
  LinearProgress,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon
} from '@mui/icons-material';
import { ChatMessage } from '../../types';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  color?: string;
  maxTokens?: number;
}

interface ModelStatus {
  status: 'idle' | 'processing' | 'active' | 'error';
  usedContext: number;
  maxContext: number;
}

interface GroupChatInterfaceProps {
  messages: ChatMessage[];
  selectedModels: ModelInfo[];
  contextSize: number;
  modelStatuses: Record<string, ModelStatus>;
  onSendMessage: (content: string) => Promise<void>;
  connected: boolean;
}

const GroupChatInterface: React.FC<GroupChatInterfaceProps> = ({
  messages,
  selectedModels,
  contextSize,
  modelStatuses,
  onSendMessage,
  connected
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !connected) return;

    const message = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      await onSendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
      // 重新聚焦输入框
      inputRef.current?.focus();
    }
  };

  // 处理回车发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 获取模型信息
  const getModelInfo = (modelId?: string) => {
    if (!modelId) return { name: 'Unknown', color: '#666' };
    return selectedModels.find(m => m.id === modelId) || { name: 'Unknown', color: '#666' };
  };

  // 计算上下文使用率
  const getContextUsagePercent = (modelId: string) => {
    const status = modelStatuses[modelId];
    if (!status || !status.maxContext) return 0;
    return Math.min((status.usedContext / status.maxContext) * 100, 100);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'warning';
      case 'active': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing': return '处理中';
      case 'active': return '活跃';
      case 'error': return '错误';
      default: return '空闲';
    }
  };

  return (
    <Box 
      data-testid="group-chat-interface"
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* 头部信息栏 */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            群聊模式 ({selectedModels.length} 个模型)
          </Typography>
        </Box>

        {/* 参与模型列表 */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {selectedModels.map((model) => {
            const status = modelStatuses[model.id];
            return (
              <Tooltip 
                key={model.id}
                title={`${model.name} - ${getStatusText(status?.status || 'idle')}`}
              >
                <Chip
                  data-testid="model-chip"
                  avatar={<Avatar sx={{ bgcolor: model.color }}>{model.name[0]}</Avatar>}
                  label={model.name}
                  variant="outlined"
                  size="small"
                  color={getStatusColor(status?.status || 'idle') as any}
                />
              </Tooltip>
            );
          })}
        </Box>

        {/* 上下文信息 */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            共享上下文大小: {contextSize} tokens
          </Typography>
          
          {/* 各模型上下文状态 */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {selectedModels.map((model) => {
              const status = modelStatuses[model.id];
              const usagePercent = getContextUsagePercent(model.id);
              
              return (
                <Box key={model.id} sx={{ minWidth: 120 }}>
                  <Typography variant="caption" display="block">
                    {model.name}
                  </Typography>
                  <LinearProgress
                    data-testid="context-progress"
                    variant="determinate"
                    value={usagePercent}
                    sx={{ height: 4, borderRadius: 2 }}
                    color={usagePercent > 80 ? 'error' : usagePercent > 60 ? 'warning' : 'primary'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {status?.usedContext || 0}/{status?.maxContext || 0}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* 消息列表 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <List>
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const modelInfo = isUser ? null : getModelInfo(message.model);

            return (
              <ListItem
                key={message.id}
                sx={{
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  mb: 1,
                  px: 1
                }}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar sx={{ 
                    bgcolor: isUser ? 'primary.main' : (modelInfo?.color || 'secondary.main'),
                    width: 32,
                    height: 32
                  }}>
                    {isUser ? <PersonIcon /> : <BotIcon />}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  data-testid={isUser ? "user-message" : "ai-message"}
                  primary={
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      mb: 0.5
                    }}>
                      <Typography 
                        data-testid="model-name"
                        variant="subtitle2"
                        sx={{ fontWeight: 600 }}
                      >
                        {isUser ? '我' : modelInfo?.name || 'AI'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        mt: 0.5,
                        bgcolor: isUser ? 'primary.light' : 'background.paper',
                        color: isUser ? 'primary.contrastText' : 'text.primary',
                        borderRadius: 2,
                        maxWidth: '80%',
                        ml: isUser ? 'auto' : 0,
                        mr: isUser ? 0 : 'auto',
                        wordBreak: 'break-word'
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5
                        }}
                      >
                        {message.content}
                      </Typography>
                    </Paper>
                  }
                  sx={{ 
                    textAlign: isUser ? 'right' : 'left',
                    ml: isUser ? 2 : 0,
                    mr: isUser ? 0 : 2
                  }}
                />
              </ListItem>
            );
          })}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* 输入区域 */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        {isLoading && (
          <LinearProgress sx={{ mb: 1 }} />
        )}
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            inputRef={inputRef}
            data-testid="message-input"
            fullWidth
            multiline
            maxRows={4}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={connected ? "输入消息参与群聊讨论..." : "连接断开，无法发送消息"}
            disabled={isLoading || !connected}
            variant="outlined"
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    data-testid="send-button"
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading || !connected}
                    color="primary"
                    size="small"
                  >
                    <SendIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>
        
        {/* 提示文本 */}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          按 Enter 发送消息，Shift + Enter 换行
        </Typography>
      </Box>
    </Box>
  );
};

export default GroupChatInterface;