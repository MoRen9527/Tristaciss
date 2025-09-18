import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  IconButton,
  Chip,
  CircularProgress,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Psychology as BrainIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { sendMessage as sendMessageThunk, clearMessages, deduplicateMessages, setChatMode, fetchAvailableProviders, setSelectedProvider, setSelectedModel, sendMessageAction, setAvailableProviders, setProvidersLoading, updateMessage, addMessage, appendGroupResponse, createGroupContainerMessage } from '../../store/chatSlice';
import { chatAPI } from '../../services/api';
import ChatModeToggle from './ChatModeToggle';
import GroupChatSettings from './GroupChatSettings';
import GroupChatStatus from './GroupChatStatus';
import GroupChatMessages from './GroupChatMessages';
import MessageContent from './MessageContent';
import NewTabButton from '../common/NewTabButton';
import configManager from '../../services/ConfigManager';
import { getUsdToCnyRate } from '../../services/exchangeRate';
import OptimizedChatInput from './OptimizedChatInput';

const ChatPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { 
    messages, 
    loading: isLoading, 
    chatMode,
    selectedProvider,
    selectedModel,
    availableProviders,
    providersLoading,
    groupChatSettings,
    error 
  } = useAppSelector(state => state.chat);

  const [inputMessage, setInputMessage] = useState('');
  const [showGroupChatSettings, setShowGroupChatSettings] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [usdToCnyRate, setUsdToCnyRate] = useState<number>(7.2); // 动态汇率
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // 加载可用的提供商
  useEffect(() => {
    const loadProviders = async () => {
      if (availableProviders.length === 0 && !providersLoading) {
        console.log('🔄 ChatPanel: 开始使用指令模型加载提供商配置...');
        dispatch(setProvidersLoading(true));
        
        try {
          // 完全清理所有可能的缓存
          localStorage.removeItem('provider_settings');
          localStorage.removeItem('group_chat_settings');
          localStorage.removeItem('chat_history');
          console.log('🔄 ChatPanel: 已清理所有localStorage缓存');
          
          // 强制清理ConfigManager缓存
          configManager.cache.clear();
          console.log('🔄 ChatPanel: 已清理ConfigManager缓存');
          
          // 先清空Redux状态
          dispatch(setAvailableProviders([]));
          dispatch(setSelectedProvider(''));
          dispatch(setSelectedModel(''));
          console.log('🔄 ChatPanel: 已清空Redux状态');
          
          // 使用ConfigManager的指令模型加载配置
          const configs = await configManager.loadConfigs();
          console.log('🔄 ChatPanel: 从后端获取到的原始配置:', configs);
          console.log('🔄 ChatPanel: 配置键列表:', Object.keys(configs));
          
          // 检查是否包含test_provider
          if (configs.test_provider) {
            console.error('❌ ChatPanel: 后端配置中仍然包含test_provider!', configs.test_provider);
          } else {
            console.log('✅ ChatPanel: 后端配置中没有test_provider');
          }
          
          // 转换为availableProviders格式
          const providers = Object.entries(configs)
            .filter(([key, config]: [string, any]) => {
              console.log(`🔍 ChatPanel: 检查提供商 ${key}, enabled: ${config.enabled}`);
              return config.enabled;
            })
            .map(([key, config]: [string, any]) => ({
              name: key,
              displayName: getProviderDisplayName(key),
              config: config,
              status: config.enabled ? 'online' : 'offline',
              models: config.enabledModels || [config.defaultModel].filter(Boolean)
            }));
          
          console.log('🔄 ChatPanel: 转换后的提供商列表:', providers);
          console.log('🔄 ChatPanel: 提供商名称列表:', providers.map(p => p.name));
          dispatch(setAvailableProviders(providers));
          
          // 如果没有选择提供商，自动选择第一个启用的
          if (!selectedProvider && providers.length > 0) {
            const firstEnabled = providers.find(p => p.config.enabled);
            if (firstEnabled) {
              dispatch(setSelectedProvider(firstEnabled.name));
            }
          }
        } catch (error) {
          console.error('🔄 ChatPanel: 指令模型加载失败:', error);
          // 回退到Redux的fetchAvailableProviders
          dispatch(fetchAvailableProviders());
        } finally {
          dispatch(setProvidersLoading(false));
        }
      }
    };
    
    loadProviders();
  }, [dispatch, availableProviders.length, providersLoading, selectedProvider]);

  // 获取提供商显示名称的辅助函数
  const getProviderDisplayName = (providerKey: string): string => {
    const displayNames: { [key: string]: string } = {
      deepseek: 'DeepSeek',
      glm: 'GLM',
      qwen: 'Qwen',
      openrouter: 'OpenRouter',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google',
      moonshot: 'Moonshot'
    };
    return displayNames[providerKey] || providerKey;
  };

  // 当选择的提供商改变时，加载该提供商的可用模型
  useEffect(() => {
    if (selectedProvider) {
      loadModelsForProvider(selectedProvider);
    }
  }, [selectedProvider]);

  const loadModelsForProvider = async (provider: string) => {
    setLoadingModels(true);
    try {
      console.log(`🔄 ChatPanel: 开始加载提供商 ${provider} 的模型`);
      
      // 使用ConfigManager获取所有可用模型
      const allModels = await configManager.getAvailableModels();
      console.log('🔄 ChatPanel: 获取到所有模型:', allModels);
      
      // 筛选出当前提供商的可用模型
      const providerModels = allModels
        .filter(model => model.provider === provider && model.enabled)
        .map(model => model.name);
      
      console.log(`🔄 ChatPanel: 提供商 ${provider} 的可用模型:`, providerModels);
      setAvailableModels(providerModels);
      
      // 如果当前选择的模型不在新的模型列表中，自动选择第一个可用模型
      if (providerModels.length > 0) {
        if (!selectedModel || !providerModels.includes(selectedModel)) {
          dispatch(setSelectedModel(providerModels[0]));
          console.log(`🔄 ChatPanel: 自动选择模型: ${providerModels[0]}`);
        }
      } else {
        dispatch(setSelectedModel(''));
        console.log(`🔄 ChatPanel: 提供商 ${provider} 没有可用模型`);
      }
    } catch (error) {
      console.error('🔄 ChatPanel: 加载模型失败:', error);
      setAvailableModels([]);
      dispatch(setSelectedModel(''));
    } finally {
      setLoadingModels(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 检查用户是否在底部附近（允许一些误差）
  const isNearBottom = () => {
    const container = document.querySelector('[data-messages-container]');
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // 100px的误差范围
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // 打字机效果函数
  const typewriterEffect = (messageId: string, fullContent: string, speed: number = 30) => {
    setTypingMessageId(messageId);
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullContent.length) {
        // 使用Redux的updateMessage来更新消息内容
        dispatch(updateMessage({
          id: messageId,
          content: fullContent.substring(0, index + 1)
        }));
        index++;
        
        // 只有当用户在底部附近时才自动滚动
        if (isNearBottom()) {
          scrollToBottom();
        }
      } else {
        clearInterval(timer);
        setTypingMessageId(null);
        // 确保最终内容完整
        dispatch(updateMessage({
          id: messageId,
          content: fullContent
        }));
        
        // 打字机效果完成时，如果用户在底部附近，滚动到底部
        if (isNearBottom()) {
          scrollToBottom();
        }
      }
    }, speed);
    
    return timer;
  };

  // 🔥 添加请求去重机制
  const lastRequestRef = useRef<{ content: string; timestamp: number } | null>(null);
  
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageContent = inputMessage.trim();
    const now = Date.now();
    
    // 🔥 防重复请求：检查是否是相同内容的重复请求（5秒内）
    if (lastRequestRef.current && 
        lastRequestRef.current.content === messageContent && 
        now - lastRequestRef.current.timestamp < 5000) {
      console.warn('🚫 ChatPanel: 检测到重复请求，已忽略');
      return;
    }
    
    // 记录当前请求
    lastRequestRef.current = { content: messageContent, timestamp: now };
    
    setInputMessage('');

    try {
      // 添加用户消息到本地状态
      const userMessageId = `user_${Date.now()}`;
      dispatch(sendMessageAction({
        id: userMessageId,
        content: messageContent,
        role: 'user'
      }));

      // 构建消息对象发送到后端
      const messageData = {
        content: messageContent,
        role: 'user',
        provider: selectedProvider,
        model: selectedModel,
        chatMode: chatMode,
        ...(chatMode === 'group' && {
          groupSettings: groupChatSettings
        })
      };

      console.log('🚀 ChatPanel: 发送消息到后端:', messageData);

      // 发送消息到后端
      const result = await dispatch(sendMessageThunk(messageData));
      
      if (result.type && result.type.endsWith('/fulfilled')) {
        console.log('✅ ChatPanel: 消息发送成功:', result.payload);
        
        // 检查响应中是否包含错误信息
        const response = result.payload as any;
        if (response && response.error) {
          console.error('❌ ChatPanel: 后端返回错误:', response.error);
          // 添加错误消息到聊天界面
          const errorMessage = response.error || '消息发送失败，请重试';
          console.log('🔍 添加后端错误消息到Redux:', {
            id: `error_${Date.now()}`,
            content: `❌ 发送失败：${errorMessage}`,
            role: 'assistant',
            type: 'error'
          });
          // 处理长URL的换行
          const processedErrorMessage = errorMessage.replace(
            /(https?:\/\/[^\s,}]+)/g, 
            (url) => `${url}`
          );
          
          dispatch(sendMessageAction({
            id: `error_${Date.now()}`,
            content: `❌ 发送失败：${processedErrorMessage}`,
            role: 'assistant',
            type: 'error'
          }));
          return;
        }
        
        // 处理不同类型的响应
        console.log('🔍 ChatPanel: 分析响应结构:', response);
        
        // 如果有AI回复，启动打字机效果
        if (response && typeof response === 'object') {
          // 群聊模式 - 群聊响应通过事件系统和Redux状态管理，这里不需要额外处理
          if ((response.group_chat || response.responses) && Array.isArray(response.responses)) {
            console.log('🔍 ChatPanel: 群聊响应已通过事件系统处理，无需额外操作');
            // 群聊响应已经通过sendMessage中的事件系统和Redux状态管理处理
            // 不需要在这里重复添加消息
          }
          // 单聊模式 - 检查是否有 response 或 content 字段
          else if (response.response || response.content) {
            console.log('🔍 ChatPanel: 处理单聊响应:', response);
            const aiMessageId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const aiContent = String(response.response || response.content || '');
            
            // 检查是否已经存在相同内容的AI消息（防止重复）
            const existingAiMessage = messages.find(msg => 
              msg.role === 'assistant' && 
              msg.content === aiContent &&
              Math.abs((typeof msg.timestamp === 'number' ? msg.timestamp : new Date(msg.timestamp).getTime()) - Date.now()) < 5000 // 5秒内的相同消息
            );
            
            if (existingAiMessage) {
              console.log('🔍 ChatPanel: 检测到重复的AI消息，跳过添加');
              return;
            }
            
            // 先添加空的AI消息
            dispatch(sendMessageAction({
              id: aiMessageId,
              content: '',
              role: 'assistant',
              provider: response.provider || selectedProvider,
              model: response.model || selectedModel,
              performance: response.performance || undefined,
              tokens: response.tokens || undefined
            }));
            
            // 启动打字机效果
            setTimeout(() => {
              typewriterEffect(aiMessageId, aiContent);
            }, 100);
          }
          // 如果响应格式不匹配，尝试直接使用响应内容
          else {
            console.log('🔍 ChatPanel: 响应格式不匹配，尝试直接处理:', response);
            // 检查是否整个响应就是消息内容
            const responseStr = typeof response === 'string' ? response : JSON.stringify(response);
            if (responseStr && responseStr.trim()) {
              const aiMessageId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              // 检查重复
              const existingAiMessage = messages.find(msg => 
                msg.role === 'assistant' && 
                msg.content === responseStr &&
                Math.abs((typeof msg.timestamp === 'number' ? msg.timestamp : new Date(msg.timestamp).getTime()) - Date.now()) < 5000
              );
              
              if (existingAiMessage) {
                console.log('🔍 ChatPanel: 检测到重复的AI消息，跳过添加');
                return;
              }
              
              dispatch(sendMessageAction({
                id: aiMessageId,
                content: '',
                role: 'assistant',
                provider: selectedProvider || undefined,
                model: selectedModel || undefined
              }));
              
              setTimeout(() => {
                typewriterEffect(aiMessageId, responseStr);
              }, 100);
            } else {
              console.warn('⚠️ ChatPanel: 无法从响应中提取消息内容');
            }
          }
        }
      } else {
        console.error('❌ ChatPanel: 消息发送失败:', result.payload);
        // 添加错误消息到聊天界面
        const errorMessage = result.payload || '消息发送失败，请重试';
        console.log('🔍 添加错误消息到Redux:', {
          id: `error_${Date.now()}`,
          content: `❌ 发送失败：${errorMessage}`,
          role: 'assistant',
          type: 'error'
        });
        dispatch(sendMessageAction({
          id: `error_${Date.now()}`,
          content: `❌ 发送失败：${errorMessage}`,
          role: 'assistant',
          type: 'error'
        }));
      }
    } catch (error) {
      console.error('❌ ChatPanel: 发送消息时出错:', error);
      // 添加错误消息到聊天界面
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.log('🔍 添加网络错误消息到Redux:', {
        id: `error_${Date.now()}`,
        content: `❌ 网络错误：${errorMessage}`,
        role: 'assistant',
        type: 'error'
      });
      dispatch(sendMessageAction({
        id: `error_${Date.now()}`,
        content: `❌ 网络错误：${errorMessage}`,
        role: 'assistant',
        type: 'error'
      }));
    }
  }, [inputMessage, isLoading, dispatch, selectedProvider, selectedModel, chatMode, groupChatSettings, typewriterEffect]);

  const handleClearChat = () => {
    dispatch(clearMessages());
  };

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // 优化的输入变化处理
  const handleInputChange = useCallback((value: string) => {
    setInputMessage(value);
  }, []);

  // 监听群聊完成事件，处理滚动
  useEffect(() => {
    const handleGroupChatComplete = () => {
      setTimeout(scrollToBottom, 100);
      console.log('🔍 [ChatPanel] 群聊完成，滚动到底部');
    };

    window.addEventListener('groupChatComplete', handleGroupChatComplete as EventListener);
    
    return () => {
      window.removeEventListener('groupChatComplete', handleGroupChatComplete as EventListener);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'rgba(0, 20, 40, 0.8)',
      border: '1px solid rgba(0, 255, 183, 0.3)',
      borderRadius: 0, // 移除圆角
      color: 'var(--text-color)',
      overflow: 'hidden',
      '& @keyframes blink': {
        '0%, 50%': { opacity: 1 },
        '51%, 100%': { opacity: 0 }
      },
      '& @keyframes pulseGlow': {
        '0%, 100%': { 
          boxShadow: '0 0 10px rgba(0, 255, 255, 0.1)',
          borderColor: 'rgba(0, 255, 255, 0.15)'
        },
        '50%': { 
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
          borderColor: 'rgba(0, 255, 255, 0.4)'
        }
      }
    }}>
      {/* 标题栏 */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid rgba(0, 229, 255, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BrainIcon sx={{ 
            color: '#39ff14',
            fontSize: 28,
            filter: 'drop-shadow(0 0 8px rgba(57, 255, 20, 0.5))'
          }} />
          <Typography variant="h5" sx={{ 
            color: '#39ff14',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(57, 255, 20, 0.5)'
          }}>
            时空通信
          </Typography>
          <NewTabButton 
            url="/chat-only" 
            title="在新标签页打开时空通信"
            size="small"
            color="#39ff14"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatModeToggle />
          
        </Box>
      </Box>

      {/* 模型选择区域 */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid rgba(0, 229, 255, 0.3)',
        backgroundColor: 'transparent',
        flexShrink: 0
      }}>
        {chatMode === 'single' ? (
          // 单聊模式：显示提供商和模型选择器
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>提供商</InputLabel>
              <Select
                value={availableProviders.find(p => (p.name || p.id) === selectedProvider) ? selectedProvider : ''}
                onChange={(e) => dispatch(setSelectedProvider(e.target.value))}
                label="提供商"
                disabled={providersLoading}
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 229, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 229, 255, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary-color)',
                  },
                }}
              >
                {Array.isArray(availableProviders) && availableProviders.length > 0 ? (
                  availableProviders
                    .filter((provider) => provider.config && provider.config.enabled) // 只显示已启用的提供商
                    .map((provider) => (
                      <MenuItem key={provider.name || provider.id} value={provider.name || provider.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography sx={{ flex: 1 }}>
                            {provider.displayName || provider.name}
                          </Typography>
                          {provider.status === 'online' && (
                            <Chip
                              label="可用"
                              color="success"
                              size="small"
                              sx={{ 
                                height: 18, 
                                fontSize: '0.65rem',
                                fontWeight: 'bold'
                              }}
                            />
                          )}
                        </Box>
                      </MenuItem>
                    ))
                ) : (
                  <MenuItem disabled>
                    <Typography color="text.secondary">
                      {providersLoading ? '正在加载提供商...' : '请先配置AI提供商'}
                    </Typography>
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>模型</InputLabel>
              <Select
                value={availableModels.includes(selectedModel) ? selectedModel : ''}
                onChange={(e) => dispatch(setSelectedModel(e.target.value))}
                label="模型"
                disabled={!selectedProvider || loadingModels}
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 229, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 229, 255, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary-color)',
                  },
                }}
              >
                {availableModels.map((model) => (
                  <MenuItem key={model} value={model}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Typography sx={{ flex: 1 }}>
                        {model}
                      </Typography>
                      <Chip
                        label="可用"
                        color="success"
                        size="small"
                        sx={{ 
                          height: 18, 
                          fontSize: '0.65rem',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(providersLoading || loadingModels) && (
              <CircularProgress size={20} sx={{ color: 'var(--primary-color)' }} />
            )}
          </Box>
        ) : (
          // 群聊模式：显示已选择的模型
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: 'var(--primary-color)' }}>
              群聊模式:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {groupChatSettings.selectedProviders?.length > 0 ? (
                groupChatSettings.selectedProviders.map((provider, index) => (
                  <Chip
                    key={index}
                    label={provider}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(0, 229, 255, 0.2)',
                      color: 'var(--primary-color)',
                      border: '1px solid rgba(0, 229, 255, 0.3)'
                    }}
                  />
                ))
              ) : (
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  未选择模型
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* 消息列表 */}
      <Box 
        data-messages-container
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 1,
          backgroundColor: 'transparent',
          minHeight: 0
        }}
      >
        <List>
          {messages.map((message) => {
            // 如果是群聊消息且有responses，使用GroupChatMessages组件
            if (message.role === 'assistant' && message.responses && Array.isArray(message.responses)) {
              return (
                <ListItem key={message.id} sx={{ display: 'block', mb: 2 }}>
                  <GroupChatMessages 
                    responses={message.responses}
                    isLoading={isLoading}
                    onComplete={() => {
                      // 群聊完成后的处理
                      console.log('群聊消息渲染完成');
                    }}
                  />
                </ListItem>
              );
            }
            
            // 普通消息渲染
            return (
              <ListItem key={message.id} sx={{ 
                display: 'flex', 
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 1
              }}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  maxWidth: '70%',
                  backgroundColor: message.type === 'error'
                    ? 'rgba(255, 82, 82, 0.1)'
                    : message.role === 'user' 
                      ? 'rgba(0, 229, 255, 0.1)' 
                      : 'rgba(0, 229, 255, 0.05)',
                  border: message.type === 'error'
                    ? '1px solid rgba(255, 82, 82, 0.4)'
                    : message.role === 'user' 
                      ? '1px solid rgba(0, 229, 255, 0.3)' 
                      : '1px solid rgba(0, 229, 255, 0.2)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  boxShadow: message.type === 'error'
                    ? '0 0 15px rgba(255, 82, 82, 0.2)'
                    : undefined
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5, 
                  mb: 1.5,
                  padding: '8px 12px',
                  background: message.type === 'error'
                    ? 'linear-gradient(135deg, rgba(255, 82, 82, 0.12) 0%, rgba(255, 82, 82, 0.08) 100%)'
                    : message.role === 'assistant' 
                      ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(0, 150, 255, 0.05) 100%)'
                      : 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  border: message.type === 'error'
                    ? '1px solid rgba(255, 82, 82, 0.3)'
                    : message.role === 'assistant' 
                      ? '1px solid rgba(0, 229, 255, 0.2)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: message.type === 'error'
                    ? '0 0 15px rgba(255, 82, 82, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : message.role === 'assistant' 
                      ? '0 0 15px rgba(0, 229, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                      : '0 2px 8px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': message.role === 'assistant' ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.5), transparent)',
                    animation: 'shimmer 3s ease-in-out infinite'
                  } : {},
                  '@keyframes shimmer': {
                    '0%, 100%': { opacity: 0 },
                    '50%': { opacity: 1 }
                  }
                }}>
                  {message.role === 'user' ? (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(0, 150, 255, 0.1))',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      boxShadow: '0 0 10px rgba(0, 229, 255, 0.2)'
                    }}>
                      <PersonIcon sx={{ 
                        color: 'var(--primary-color)', 
                        fontSize: '1.2rem',
                        filter: 'drop-shadow(0 0 3px rgba(0, 229, 255, 0.5))'
                      }} />
                    </Box>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: message.type === 'error'
                        ? 'linear-gradient(135deg, rgba(255, 82, 82, 0.3), rgba(255, 82, 82, 0.2))'
                        : 'linear-gradient(135deg, rgba(0, 229, 255, 0.3), rgba(0, 200, 255, 0.2))',
                      border: message.type === 'error'
                        ? '2px solid rgba(255, 82, 82, 0.4)'
                        : '2px solid rgba(0, 229, 255, 0.4)',
                      boxShadow: message.type === 'error'
                        ? '0 0 15px rgba(255, 82, 82, 0.3), inset 0 0 10px rgba(255, 82, 82, 0.1)'
                        : '0 0 15px rgba(0, 229, 255, 0.3), inset 0 0 10px rgba(0, 229, 255, 0.1)',
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        inset: -2,
                        borderRadius: '50%',
                        background: 'conic-gradient(from 0deg, transparent, rgba(0, 229, 255, 0.3), transparent)',
                        animation: 'rotate 4s linear infinite',
                        zIndex: -1
                      },
                      '@keyframes rotate': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }}>
                      <AIIcon sx={{ 
                        color: message.type === 'error' ? '#ff5252' : '#00e5ff', 
                        fontSize: '1.3rem',
                        filter: message.type === 'error' 
                          ? 'drop-shadow(0 0 5px rgba(255, 82, 82, 0.8))'
                          : 'drop-shadow(0 0 5px rgba(0, 229, 255, 0.8))',
                        animation: 'pulse 2s ease-in-out infinite'
                      }} />
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    <Typography variant="caption" sx={{
                      color: message.type === 'error' 
                        ? '#ff5252' 
                        : message.role === 'assistant' ? '#00e5ff' : 'var(--primary-color)',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      textShadow: message.type === 'error'
                        ? '0 0 8px rgba(255, 82, 82, 0.6)'
                        : message.role === 'assistant' 
                          ? '0 0 8px rgba(0, 229, 255, 0.6)' 
                          : '0 0 5px rgba(0, 229, 255, 0.3)',
                      letterSpacing: '0.5px'
                    }}>
                      {message.type === 'error' ? '系统错误' : message.role === 'user' ? '用户' : (message.aiName || '星际阿凡达')}
                    </Typography>
                    
                    {(message.provider || message.model) && (
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 0.8, 
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        maxWidth: '100%',
                        overflow: 'hidden'
                      }}>
                        {message.provider && (
                          <Chip 
                            label={message.provider} 
                            size="small" 
                            sx={{ 
                              height: 18, 
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.25), rgba(0, 150, 255, 0.15))',
                              color: '#00e5ff',
                              border: '1px solid rgba(0, 229, 255, 0.3)',
                              boxShadow: '0 0 8px rgba(0, 229, 255, 0.2)',
                              textShadow: '0 0 3px rgba(0, 229, 255, 0.5)',
                              maxWidth: '120px',
                              '& .MuiChip-label': {
                                padding: '0 6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }
                            }} 
                          />
                        )}
                        {message.model && (
                          <Chip 
                            label={message.model} 
                            size="small" 
                            sx={{ 
                              height: 18, 
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.2), rgba(0, 100, 255, 0.1))',
                              color: '#00c4ff',
                              border: '1px solid rgba(0, 200, 255, 0.25)',
                              boxShadow: '0 0 6px rgba(0, 200, 255, 0.15)',
                              textShadow: '0 0 3px rgba(0, 200, 255, 0.4)',
                              maxWidth: '150px',
                              '& .MuiChip-label': {
                                padding: '0 6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }
                            }} 
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
                {/* 消息内容 - 使用MessageContent组件支持Markdown和思考标签 */}
                <MessageContent 
                  content={message.content}
                  sender={message.role === 'user' ? 'user' : 'ai'}
                />

                {/* AI消息的性能统计 */}
                {message.role === 'assistant' && (message.performance || message.tokens) && (
                  <Box sx={{
                    mt: 1,
                    background: 'rgba(0, 255, 255, 0.05)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(0, 255, 255, 0.15)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 0 10px rgba(0, 255, 255, 0.1)',
                    fontSize: '0.75rem'
                  }}>
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
                    {message.tokens && (
                      <>
                        {/* Token详细显示 */}
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
                        
                        {/* 费用详细显示 */}
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
                              color: '#9c27b0',
                              textShadow: '0 0 5px #9c27b0'
                            }}>
                              {((message.tokens as any).total_cost_cny).toFixed(4)}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </Box>
                )}

                {/* 打字机效果指示器 */}
                {message.role === 'assistant' && typingMessageId === message.id && (
                  <Box sx={{
                    mt: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'rgba(0, 255, 255, 0.7)',
                    fontSize: '0.75rem'
                  }}>
                    <Box sx={{
                      width: 4,
                      height: 4,
                      backgroundColor: '#00ffff',
                      borderRadius: '50%',
                      animation: 'blink 1s infinite'
                    }} />
                    <Typography variant="caption" sx={{ color: 'rgba(0, 255, 255, 0.7)' }}>
                      正在输出...
                    </Typography>
                  </Box>
                )}
                <Typography variant="caption" sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  mt: 1,
                  display: 'block'
                }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Typography>
              </Paper>
            </ListItem>
            );
          })}
          {isLoading && (
            <ListItem sx={{ justifyContent: 'flex-start' }}>
              <Paper sx={{
                p: 2,
                backgroundColor: 'rgba(0, 229, 255, 0.05)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                minWidth: '300px'
              }}>
                {chatMode === 'group' ? (
                  <GroupChatStatus />
                ) : (
                  <Typography sx={{ color: 'var(--primary-color)', mb: 1 }}>
                    AI正在思考中...
                  </Typography>
                )}
                <Box sx={{ 
                  width: '100%', 
                  height: 4, 
                  backgroundColor: 'rgba(0, 229, 255, 0.1)',
                  borderRadius: 1,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <Box sx={{
                    height: '100%',
                    backgroundColor: 'var(--primary-color)',
                    borderRadius: 1,
                    boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)',
                    animation: 'fillProgress 60s ease-out infinite',
                    '@keyframes fillProgress': {
                      '0%': { 
                        width: '0%'
                      },
                      '70%': { 
                        width: '85%'
                      },
                      '90%': { 
                        width: '95%'
                      },
                      '100%': { 
                        width: '100%'
                      }
                    }
                  }} />
                </Box>
              </Paper>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* 输入区域 - 使用优化的输入组件 */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid rgba(0, 229, 255, 0.3)',
        backgroundColor: 'transparent',
        flexShrink: 0
      }}>

        
        <OptimizedChatInput
          value={inputMessage}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          placeholder={chatMode === 'group' ? '输入消息开始群聊讨论...' : '输入您的消息...'}
          disabled={isLoading || (chatMode === 'single' && (!selectedProvider || !selectedModel)) || (chatMode === 'group' && (!groupChatSettings.selectedProviders || groupChatSettings.selectedProviders.length < 2))}
          maxRows={4}
        />
      </Box>

      {/* 群聊设置对话框 */}
      <GroupChatSettings
        open={showGroupChatSettings}
        onClose={() => setShowGroupChatSettings(false)}
        onConfirm={async () => {
          // 群聊设置确认后的处理逻辑
          console.log('群聊设置已确认');
        }}
      />
    </Box>
  );
};

export default ChatPanel;