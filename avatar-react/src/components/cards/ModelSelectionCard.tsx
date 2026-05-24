import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton
} from '@mui/material';
import {
  CheckCircle as OnlineIcon,
  Cancel as OfflineIcon,
  HelpOutline as UnknownIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import configManager from '../../services/ConfigManager';
import { chatAPI } from '../../services/api';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  color?: string;
  maxTokens?: number;
  status?: 'online' | 'offline' | 'unknown';
  description?: string;
  features?: string[];
}

interface SystemPrompts {
  mode: 'unified' | 'individual';
  prompt?: string;
  prompts?: Record<string, string>;
}

interface ModelSelectionCardProps {
  onConfirm: (models: ModelInfo[], systemPrompts: SystemPrompts) => void;
  onClose: () => void;
}

const ModelSelectionCard: React.FC<ModelSelectionCardProps> = ({ onConfirm, onClose }) => {
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [replyStrategy, setReplyStrategy] = useState<string>('discussion');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 回复策略配置
  const replyStrategies = [
    {
      value: 'exclusive',
      label: '独占模式',
      description: '只有第一个响应的AI会回复，其他AI将被忽略',
      icon: '🎯'
    },
    {
      value: 'discussion',
      label: '讨论模式',
      description: '所有AI都会看到其他AI的回复，形成多轮讨论',
      icon: '💬'
    },
    {
      value: 'supplement',
      label: '补充模式',
      description: '各AI依次回复，后回复的AI会看到前面的回复内容',
      icon: '📝'
    }
  ];

  // 模型元数据
  const modelMetadata: Record<string, Partial<ModelInfo>> = {
    'gpt-4': {
      description: '最强大的GPT模型',
      features: ['推理', '创作'],
      maxTokens: 8192,
      color: '#10a37f'
    },
    'gpt-3.5-turbo': {
      description: '快速且经济的GPT模型',
      features: ['快速', '经济'],
      maxTokens: 4096,
      color: '#10a37f'
    },
    'claude-3-opus': {
      description: 'Claude最强模型',
      features: ['推理', '分析'],
      maxTokens: 200000,
      color: '#cc785c'
    },
    'claude-3-sonnet': {
      description: '平衡性能的Claude模型',
      features: ['平衡', '高效'],
      maxTokens: 200000,
      color: '#cc785c'
    },
    'deepseek-chat': {
      description: 'DeepSeek通用对话模型',
      features: ['通用', '快速'],
      maxTokens: 32768,
      color: '#1976d2'
    },
    'deepseek-coder': {
      description: 'DeepSeek专业代码模型',
      features: ['代码', '专业'],
      maxTokens: 16384,
      color: '#1976d2'
    },
    'glm-4': {
      description: 'GLM-4通用大模型',
      features: ['通用', '中文'],
      maxTokens: 131072,
      color: '#9c27b0'
    },
    'glm-4-flash': {
      description: 'GLM-4快速响应模型',
      features: ['快速', '免费'],
      maxTokens: 131072,
      color: '#9c27b0'
    }
  };

  // 加载可用模型
  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. 从配置管理器获取提供商配置
      const providerConfigs = await configManager.loadConfigs();
      console.log('获取到的提供商配置:', providerConfigs);
      
      // 2. 获取模型状态
      let modelsStatus = {};
      try {
        const statusResponse = await chatAPI.getModelsStatus();
        if (statusResponse && (statusResponse as any).success) {
          modelsStatus = (statusResponse as any).models || {};
        }
      } catch (statusError) {
        console.warn('获取模型状态失败，将使用默认状态:', statusError);
        // 为演示目的，创建一些模拟的在线状态
        modelsStatus = {
          'deepseek:deepseek-chat': { available: true },
          'glm:glm-4': { available: true },
          'openai:gpt-3.5-turbo': { available: true },
          'openai:gpt-4': { available: false },
        };
      }
      
      // 3. 构建可用模型列表
      const models: ModelInfo[] = [];
      
      Object.entries(providerConfigs).forEach(([providerKey, provider]: [string, any]) => {
        // 为了演示功能，我们假设一些提供商是启用的
        const isEnabledForDemo = ['deepseek', 'glm', 'openai'].includes(providerKey);
        
        if (isEnabledForDemo || (provider.enabled && (provider.apiKey || provider.hasApiKey))) {
          // 获取该提供商的模型列表
          let modelList: string[] = [];
          if (provider.enabledModels && Array.isArray(provider.enabledModels)) {
            modelList = provider.enabledModels;
          } else if (provider.defaultModel) {
            modelList = [provider.defaultModel];
          }
          
          // 为演示添加一些默认模型
          if (modelList.length === 0) {
            if (providerKey === 'deepseek') {
              modelList = ['deepseek-chat', 'deepseek-coder'];
            } else if (providerKey === 'glm') {
              modelList = ['glm-4', 'glm-4-flash'];
            } else if (providerKey === 'openai') {
              modelList = ['gpt-3.5-turbo', 'gpt-4'];
            }
          }
          
          modelList.forEach(modelId => {
            const modelKey = `${providerKey}:${modelId}`;
            const statusInfo = modelsStatus[modelKey];
            const metadata = modelMetadata[modelId] || {};
            
            models.push({
              id: modelKey,
              name: modelId,
              provider: providerKey,
              status: statusInfo?.available ? 'online' : 'offline',
              description: metadata.description || `${providerKey} ${modelId} 模型`,
              features: metadata.features || [],
              maxTokens: metadata.maxTokens || 4096,
              color: metadata.color || '#666666'
            });
          });
        }
      });
      
      console.log('构建的模型列表:', models);
      setAvailableModels(models);
      
      // 默认选择前两个在线模型
      const onlineModels = models.filter(m => m.status === 'online');
      if (onlineModels.length >= 2) {
        setSelectedModels([onlineModels[0].id, onlineModels[1].id]);
      }
      
    } catch (error) {
      console.error('加载可用模型失败:', error);
      setError(`加载模型失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理模型选择
  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  // 获取状态图标
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'online':
        return <OnlineIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'offline':
        return <OfflineIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return <UnknownIcon sx={{ fontSize: 16, color: 'text.disabled' }} />;
    }
  };

  // 确认选择
  const handleConfirm = () => {
    const selectedModelObjects = availableModels.filter(model => 
      selectedModels.includes(model.id)
    );
    
    const systemPrompts: SystemPrompts = {
      mode: 'unified',
      prompt: '你是一个有用的AI助手，请根据用户的问题提供准确、有帮助的回答。'
    };
    
    onConfirm(selectedModelObjects, systemPrompts);
  };

  const isValidSelection = selectedModels.length >= 1;
  const onlineModels = availableModels.filter(m => m.status === 'online');

  return (
    <Card
      sx={{
        maxWidth: 800,
        width: '90vw',
        maxHeight: '90vh',
        backgroundColor: 'var(--background-dark)',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 229, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ 
        p: 3, 
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 标题栏 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ color: 'var(--primary-color)' }}>
              🤖 群聊模型选择
            </Typography>
            <Chip 
              label="BETA" 
              size="small" 
              color="warning" 
              sx={{ fontSize: '0.6rem', height: 20 }}
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* 加载状态 */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 模型选择 */}
        {!loading && !error && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 2, color: 'var(--primary-color)' }}>
              选择参与群聊的AI模型
            </Typography>
            
            {onlineModels.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                当前没有在线的AI模型。请检查网络连接或配置。
              </Alert>
            )}
            
            {/* 模型列表 */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 2, 
              mb: 3,
              maxHeight: '400px',
              overflow: 'auto',
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(0, 229, 255, 0.1)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 229, 255, 0.3)',
                borderRadius: '4px',
                '&:hover': {
                  background: 'rgba(0, 229, 255, 0.5)',
                },
              },
            }}>
              {availableModels.map((model) => {
                const isSelected = selectedModels.includes(model.id);
                const isOnline = model.status === 'online';
                
                return (
                  <Box
                    key={model.id}
                    sx={{
                      p: 2,
                      backgroundColor: isOnline 
                        ? 'rgba(0, 229, 255, 0.08)' 
                        : 'rgba(128, 128, 128, 0.05)',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: isSelected
                        ? 'var(--primary-color)'
                        : isOnline 
                          ? 'rgba(0, 229, 255, 0.3)' 
                          : 'rgba(128, 128, 128, 0.2)',
                      cursor: isOnline ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      '&:hover': isOnline ? {
                        backgroundColor: 'rgba(0, 229, 255, 0.12)',
                        borderColor: 'var(--primary-color)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0, 229, 255, 0.2)'
                      } : {},
                      boxShadow: isSelected
                        ? '0 0 8px rgba(0, 229, 255, 0.4)'
                        : 'none'
                    }}
                    onClick={() => isOnline && handleModelToggle(model.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getStatusIcon(model.status)}
                      <Checkbox
                        checked={isSelected}
                        disabled={!isOnline}
                        size="small"
                        sx={{
                          ml: 0.5,
                          color: 'var(--primary-color)',
                          '&.Mui-checked': {
                            color: 'var(--primary-color)',
                          },
                        }}
                      />
                      <Typography variant="body2" sx={{ 
                        fontWeight: 'bold',
                        ml: 0.5,
                        flexGrow: 1
                      }}>
                        {model.name}
                      </Typography>
                    </Box>
                    
                    <Typography variant="caption" sx={{ 
                      color: 'text.secondary',
                      display: 'block',
                      mb: 1
                    }}>
                      {model.description}
                    </Typography>
                    
                    {model.features && model.features.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {model.features.map((feature, index) => (
                          <Chip
                            key={index}
                            label={feature}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 18 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
            
            {!isValidSelection && (
              <Typography variant="caption" color="warning.main" sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5, 
                mb: 2 
              }}>
                <InfoIcon sx={{ fontSize: 14 }} />
                请至少选择2个AI模型进行群聊
              </Typography>
            )}

            <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.2)', my: 3 }} />

            {/* 回复策略 */}
            <Typography variant="subtitle1" sx={{ mb: 2, color: 'var(--primary-color)' }}>
              回复策略
            </Typography>
            
            <RadioGroup
              value={replyStrategy}
              onChange={(e) => setReplyStrategy(e.target.value)}
            >
              {replyStrategies.map((strategy) => (
                <Box key={strategy.value} sx={{ mb: 1 }}>
                  <FormControlLabel
                    value={strategy.value}
                    control={
                      <Radio 
                        sx={{
                          color: 'var(--primary-color)',
                          '&.Mui-checked': {
                            color: 'var(--primary-color)',
                          },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">
                          {strategy.icon} {strategy.label}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: 'text.secondary',
                          display: 'block',
                          ml: 0
                        }}>
                          {strategy.description}
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              ))}
            </RadioGroup>

            {/* 操作按钮 */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button 
                onClick={onClose}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { backgroundColor: 'rgba(128, 128, 128, 0.1)' }
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!isValidSelection}
                variant="contained"
                sx={{
                  backgroundColor: 'var(--primary-color)',
                  color: '#000',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 229, 255, 0.8)',
                  },
                  '&:disabled': {
                    backgroundColor: 'rgba(0, 229, 255, 0.3)',
                    color: 'rgba(0, 0, 0, 0.5)',
                  },
                }}
              >
                开始群聊
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelSelectionCard;