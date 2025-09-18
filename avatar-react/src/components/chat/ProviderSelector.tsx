import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import {
  CheckCircle as OnlineIcon,
  Cancel as OfflineIcon,
  HelpOutline as UnknownIcon,
  Speed as TestingIcon
} from '@mui/icons-material';
import { setSelectedProvider, setSelectedModel, fetchAvailableProviders } from '../../store/chatSlice';
import { testProviderConnection } from '../../store/providerSlice';
import { RootState, AppDispatch } from '../../store';

interface Provider {
  name: string;
  displayName: string;
  description: string;
  status: 'online' | 'offline' | 'testing' | 'unknown';
  models?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  features?: string[];
}

interface ProviderSelectorProps {
  disabled?: boolean;
  className?: string;
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({ 
  disabled = false, 
  className = '', 
  onProviderChange, 
  onModelChange 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedProvider = useSelector((state: RootState) => state.chat.selectedProvider);
  const selectedModel = useSelector((state: RootState) => state.chat.selectedModel);
  const providers = useSelector((state: RootState) => state.chat.availableProviders || []);
  const providersLoading = useSelector((state: RootState) => state.chat.providersLoading);
  
  // 本地状态
  const [availableModels, setAvailableModels] = useState<Array<{
    id: string;
    name: string;
    description: string;
  }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  
  // 一次性获取所有testing状态
  const testingStates = useSelector((state: RootState) => state.providers.testingConnections);
  
  // 初始化时获取providers
  useEffect(() => {
    if (providers.length === 0 && !providersLoading) {
      dispatch(fetchAvailableProviders());
    }
  }, [dispatch, providers.length, providersLoading]);

  // 获取模型列表
  const fetchModels = useCallback(async () => {
    if (!selectedProvider) return;
    
    setLoadingModels(true);
    try {
      let models: Array<{ id: string; name: string; description: string }> = [];
      
      // 其他provider的默认模型
      const providerInfo = providers.find(p => p.name === selectedProvider);
      if (providerInfo && providerInfo.models && providerInfo.models.length > 0) {
        models = providerInfo.models;
      } else {
        // 如果没有预定义模型，提供默认模型
        switch (selectedProvider) {
          case 'openai':
            models = [
              { id: 'gpt-4', name: 'GPT-4', description: 'OpenAI GPT-4' },
              { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'OpenAI GPT-3.5 Turbo' }
            ];
            break;
          case 'deepseek':
            models = [
              { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'DeepSeek Chat Model' },
              { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'DeepSeek Coder Model' }
            ];
            break;
          case 'glm':
            models = [
              { id: 'glm-4', name: 'GLM-4', description: '智谱GLM-4' },
              { id: 'glm-3-turbo', name: 'GLM-3 Turbo', description: '智谱GLM-3 Turbo' }
            ];
            break;
          default:
            models = [
              { id: 'default', name: 'Default Model', description: 'Default model for ' + selectedProvider }
            ];
            break;
        }
      }
      
      setAvailableModels(models);
      
      // 如果当前选中的模型不在新的模型列表中，选择第一个模型
      if (!selectedModel || !models.find(m => m.id === selectedModel)) {
        const firstModel = models.length > 0 ? models[0].id : '';
        dispatch(setSelectedModel(firstModel));
        if (onModelChange) {
          onModelChange(firstModel);
        }
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [selectedProvider, providers, selectedModel, onModelChange, dispatch]);

  // 当选择的provider变化时，获取模型列表
  useEffect(() => {
    if (selectedProvider) {
      fetchModels();
    }
  }, [selectedProvider, fetchModels]);

  // 处理Provider选择变化
  const handleProviderChange = (event: SelectChangeEvent<string>) => {
    const newProvider = event.target.value;
    dispatch(setSelectedProvider(newProvider));
    
    // 清空当前选择的模型
    dispatch(setSelectedModel(''));
    
    // 自动测试新选择的Provider连接
    dispatch(testProviderConnection(newProvider));
    
    if (onProviderChange) {
      onProviderChange(newProvider);
    }
  };

  // 获取Provider状态图标
  const getStatusIcon = (provider: Provider, isTesting: boolean) => {
    if (isTesting) {
      return <TestingIcon sx={{ fontSize: 16, color: 'warning.main' }} />;
    }
    
    switch (provider.status) {
      case 'online':
        return <OnlineIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'offline':
        return <OfflineIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'testing':
        return <CircularProgress size={16} sx={{ color: 'warning.main' }} />;
      default:
        return <UnknownIcon sx={{ fontSize: 16, color: 'text.disabled' }} />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'testing': return 'warning';
      default: return 'default';
    }
  };

  // 渲染选择值
  const renderSelectedValue = (selected: string) => {
    if (!Array.isArray(providers) || providers.length === 0) {
      // 如果providers还没加载，显示友好的名称
      const defaultProviderNames: Record<string, string> = {
        'openai': 'OpenAI',
        'deepseek': 'DeepSeek',
        'glm': '智谱GLM'
      };
      
      if (defaultProviderNames[selected]) {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UnknownIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography variant="body2">{defaultProviderNames[selected]}</Typography>
            <Chip
              label="加载中"
              size="small"
              color="default"
              sx={{ height: 16, fontSize: '0.6rem' }}
            />
          </Box>
        );
      }
      return selected || '加载中...';
    }
    
    const provider = providers.find(p => p.name === selected);
    if (!provider) {
      // 如果找不到provider，但有selected值，显示友好名称
      const defaultProviderNames: Record<string, string> = {
        'openai': 'OpenAI',
        'deepseek': 'DeepSeek',
        'glm': '智谱GLM'
      };
      
      if (defaultProviderNames[selected]) {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UnknownIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography variant="body2">{defaultProviderNames[selected]}</Typography>
            <Chip
              label="未知"
              size="small"
              color="default"
              sx={{ height: 16, fontSize: '0.6rem' }}
            />
          </Box>
        );
      }
      return selected || '请选择模型';
    }
    
    const isTesting = testingStates[provider.name] || false;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getStatusIcon(provider, isTesting)}
        <Typography variant="body2">{provider.displayName}</Typography>
        <Chip
          label={provider.status === 'online' ? '在线' : 
                provider.status === 'offline' ? '离线' : 
                provider.status === 'testing' ? '测试中' : '未知'}
          size="small"
          color={getStatusColor(provider.status)}
          sx={{ height: 16, fontSize: '0.6rem' }}
        />
      </Box>
    );
  };

  return (
    <FormControl 
      size="small" 
      className={`provider-selector ${className}`}
      sx={{ 
        minWidth: 180,
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'rgba(0, 229, 255, 0.05)',
          '& fieldset': {
            borderColor: 'rgba(0, 229, 255, 0.3)',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(0, 229, 255, 0.5)',
          },
          '&.Mui-focused fieldset': {
            borderColor: 'var(--primary-color)',
            boxShadow: '0 0 8px rgba(0, 229, 255, 0.5)',
          },
        },
        '& .MuiInputLabel-root': {
          color: 'var(--primary-color)',
          '&.Mui-focused': {
            color: 'var(--primary-color)',
          },
        },
        '& .MuiSelect-select': {
          color: 'var(--text-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }
      }}
      disabled={disabled || providersLoading}
    >
      <InputLabel id="provider-select-label">AI模型</InputLabel>
      <Select
        labelId="provider-select-label"
        id="provider-select"
        value={selectedProvider || ''}
        label="AI模型"
        onChange={handleProviderChange}
        renderValue={renderSelectedValue}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: '#1a1a2e',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              boxShadow: '0 4px 20px rgba(0, 229, 255, 0.2)',
              maxHeight: '300px',
              '& .MuiMenuItem-root': {
                backgroundColor: 'transparent',
                color: '#ffffff',
                padding: '12px 16px',
                minHeight: '60px',
                '&:hover': {
                  backgroundColor: 'rgba(0, 229, 255, 0.1)',
                  color: '#00e5ff',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 229, 255, 0.2)',
                  color: '#00e5ff',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 229, 255, 0.3)',
                  },
                },
                '& .MuiTypography-root': {
                  color: 'inherit',
                },
                '& .MuiChip-root': {
                  backgroundColor: 'rgba(0, 229, 255, 0.2)',
                  color: '#00e5ff',
                  borderColor: '#00e5ff',
                },
              },
            },
          },
        }}
      >
        {Array.isArray(providers) ? providers.map((provider: Provider) => {
          const isTesting = testingStates[provider.name] || false;
          
          return (
            <MenuItem key={provider.name} value={provider.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                {/* 状态图标 */}
                {getStatusIcon(provider, isTesting)}
                
                {/* Provider信息 */}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {provider.displayName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                    {provider.description}
                  </Typography>
                </Box>
                
                {/* 特性标签 */}
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {provider.features?.slice(0, 2).map((feature, index) => (
                    <Chip
                      key={index}
                      label={feature}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontSize: '0.6rem', 
                        height: 18,
                        color: 'primary.main',
                        borderColor: 'primary.main'
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </MenuItem>
          );
        }) : (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              暂无可用的AI模型
            </Typography>
          </MenuItem>
        )}
      </Select>
      
      {/* 加载状态 */}
      {providersLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} />
          <Typography variant="caption" color="text.secondary">
            正在加载Provider列表...
          </Typography>
        </Box>
      )}
      
      {/* 模型加载状态 */}
      {loadingModels && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} />
          <Typography variant="caption" color="text.secondary">
            正在加载模型列表...
          </Typography>
        </Box>
      )}
    </FormControl>
  );
};

export default ProviderSelector;