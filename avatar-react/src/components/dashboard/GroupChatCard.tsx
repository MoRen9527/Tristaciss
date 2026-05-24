import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Divider,
  Alert,
  Collapse,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { RootState } from '../../store';
import { updateCardData } from '../../store/dynamicCardSlice';
import { setGroupChatSettings } from '../../store/chatSlice';

interface GroupChatCardProps {
  card: any;
  onUpdate?: (data: any) => void;
}

const GroupChatCard: React.FC<GroupChatCardProps> = ({ card, onUpdate }) => {
  const dispatch = useDispatch();
  const { chatMode } = useSelector((state: RootState) => state.chat);
  const [localSelectedModels, setLocalSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [modelProviders, setModelProviders] = useState<any[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  // 安全检查：如果card未定义，提供默认值
  const safeCard = card || {
    id: 'default-groupchat',
    data: {
      selectedModels: [],
      availableModels: [],
      chatMode: 'group',
      lastUpdate: new Date().toISOString(),
      modelCount: 0
    }
  };

  // 从后端API获取可用模型数据
  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        // 使用与ChatPanel完全相同的方法获取可用模型
        const configManager = (await import('../../services/ConfigManager')).default;
        const allConfigs = await configManager.loadConfigs();
        
        // 默认提供商定义（与ChatPanel的defaultProviders一致）
        const defaultProviders = [
          {
            id: 'deepseek',
            name: 'DeepSeek',
            description: 'DeepSeek AI模型',
            base_url: 'https://api.deepseek.com/v1',
            default_model: 'deepseek-chat',
            models: [
              { id: 'deepseek-chat', name: 'DeepSeek Chat' },
              { id: 'deepseek-coder', name: 'DeepSeek Coder' }
            ]
          },
          {
            id: 'glm',
            name: 'GLM (智谱AI)',
            description: '智谱AI的GLM系列模型',
            base_url: 'https://open.bigmodel.cn/api/paas/v4/',
            default_model: 'glm-4.5',
            models: [
              { id: 'glm-4.5', name: 'GLM-4.5' },
              { id: 'glm-4.5-flash', name: 'GLM-4.5 Flash' },
              { id: 'glm-4', name: 'GLM-4' }
            ]
          },
          {
            id: 'openrouter',
            name: 'OpenRouter',
            description: '聚合多种模型的平台',
            base_url: 'https://openrouter.ai/api/v1',
            default_model: 'deepseek/deepseek-r1:free',
            models: [
              // 免费模型 🆓
              { id: 'deepseek/deepseek-r1:free', name: '🆓 DeepSeek R1 (Free)' },
              { id: 'deepseek/deepseek-chat-v3.1:free', name: '🆓 DeepSeek Chat V3.1 (Free)' },
              { id: 'deepseek/deepseek-chat-v3-0324:free', name: '🆓 DeepSeek Chat V3 0324 (Free)' },
              { id: 'deepseek/deepseek-r1-0528:free', name: '🆓 DeepSeek R1 0528 (Free)' },
              { id: 'openai/gpt-oss-120b:free', name: '🆓 OpenAI GPT-OSS 120B (Free)' },
              { id: 'openai/gpt-oss-20b:free', name: '🆓 OpenAI GPT-OSS 20B (Free)' },
              { id: 'z-ai/glm-4.5-air:free', name: '🆓 GLM-4.5 Air (Free)' },
              { id: 'moonshotai/kimi-k2:free', name: '🆓 Kimi K2 (Free)' },
              { id: 'moonshotai/kimi-dev-72b:free', name: '🆓 Kimi Dev 72B (Free)' },
              { id: 'qwen/qwen2.5-vl-32b-instruct:free', name: '🆓 Qwen2.5 VL 32B Instruct (Free)' },
              { id: 'qwen/qwen3-30b-a3b:free', name: '🆓 Qwen3 30B (Free)' },
              { id: 'qwen/qwq-32b:free', name: '🆓 QwQ 32B (Free)' },
              { id: 'qwen/qwen3-235b-a22b:free', name: '🆓 Qwen3 235B (Free)' },
              // 付费模型 💰
              { id: 'openai/gpt-4o', name: '💰 GPT-4o (via OpenRouter)' },
              { id: 'anthropic/claude-3.5-sonnet', name: '💰 Claude 3.5 Sonnet (via OpenRouter)' },
              { id: 'deepseek/deepseek-chat', name: '💰 DeepSeek Chat (via OpenRouter)' }
            ]
          },
          {
            id: 'openai',
            name: 'OpenAI',
            description: 'OpenAI GPT系列模型',
            base_url: 'https://api.openai.com/v1',
            default_model: 'gpt-4o',
            models: [
              { id: 'gpt-4o', name: 'GPT-4o' },
              { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
              { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
            ]
          },
          {
            id: 'anthropic',
            name: 'Anthropic',
            description: 'Claude系列模型',
            base_url: 'https://api.anthropic.com',
            default_model: 'claude-3-5-sonnet-20241022',
            models: [
              { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
              { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
            ]
          },
          {
            id: 'google',
            name: 'Google',
            description: 'Gemini系列模型',
            base_url: 'https://generativelanguage.googleapis.com/v1beta',
            default_model: 'gemini-1.5-pro',
            models: [
              { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
              { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
            ]
          }
        ];
        
        // 构建模型提供商列表（与ChatPanel的loadProviderConfigs逻辑完全一致）
        const allProviders = defaultProviders.map(defaultProvider => {
          const savedConfig = allConfigs[defaultProvider.id];
          const isConfigured = savedConfig && savedConfig.enabled && (savedConfig.apiKey || savedConfig.hasApiKey);
          
          return {
            ...defaultProvider,
            enabled: Boolean(isConfigured),
            has_api_key: Boolean(savedConfig?.apiKey || savedConfig?.hasApiKey),
            base_url: savedConfig?.baseUrl || defaultProvider.base_url,
            default_model: savedConfig?.defaultModel || defaultProvider.default_model,
            enabled_models: savedConfig?.enabledModels || []
          };
        });
        
        // 只显示已启用且有API密钥的提供商（与ChatPanel的getAvailableProviders完全一致）
        const availableProviders = allProviders.filter(p => p.enabled && p.has_api_key);
        
        // 构建模型列表
        const providerMap = {};
        const flatModels = [];
        
        availableProviders.forEach(provider => {
          // 获取该提供商的可用模型（与ChatPanel的getAvailableModels逻辑完全一致）
          const allModels = provider.models || [];
          const availableModels = provider.enabled_models && provider.enabled_models.length > 0
            ? allModels.filter(model => provider.enabled_models.includes(model.id))
            : allModels;
          
          if (availableModels.length > 0) {
            // 创建提供商分组
            providerMap[provider.id] = {
              id: provider.id,
              name: provider.name,
              models: availableModels
            };
            
            // 添加到扁平列表
            availableModels.forEach(model => {
              flatModels.push({
                key: `${provider.id}:${model.id}`,
                provider: provider.id,
                name: model.name,
                displayName: `${provider.name} - ${model.name}`
              });
            });
          }
        });
        
        setModelProviders(Object.values(providerMap));
        setAvailableModels(flatModels);
        
      } catch (error) {
        console.error('获取模型列表失败:', error);
        // 如果API调用失败，使用默认模型
        const defaultProviders = [
          {
            id: 'deepseek',
            name: 'DeepSeek',
            models: [
              { id: 'deepseek-chat', name: 'DeepSeek Chat' }
            ]
          }
        ];
        
        setModelProviders(defaultProviders);
        const defaultModels = defaultProviders.flatMap(provider =>
          provider.models.map(model => ({
            key: `${provider.id}:${model.id}`,
            provider: provider.name,
            name: model.name,
            displayName: `${provider.name} - ${model.name}`
          }))
        );
        setAvailableModels(defaultModels);
      }
    };

    fetchAvailableModels();
  }, []);

  // 初始化本地状态 - 只在组件挂载时执行一次
  useEffect(() => {
    // 从card数据中获取已选择的模型
    if (safeCard.data && safeCard.data.selectedModels && safeCard.data.selectedModels.length > 0) {
      setLocalSelectedModels(safeCard.data.selectedModels);
    } else {
      setLocalSelectedModels([]);
    }
  }, []); // 只在组件挂载时执行一次

  // 处理模型选择
  const handleModelChange = (event: any) => {
    const value = event.target.value as string[];
    
    // 立即更新本地状态
    setLocalSelectedModels(value);
    
    // 更新Redux状态
    const updatedData = {
      ...safeCard.data,
      selectedModels: value,
      modelCount: value.length,
      lastUpdate: new Date().toISOString()
    };
    
    dispatch(updateCardData({
      cardId: safeCard.id,
      data: updatedData
    }));

    if (onUpdate) {
      onUpdate(updatedData);
    }
  };

  // 删除模型
  const handleDeleteModel = (modelKey: string) => {
    const newModels = localSelectedModels.filter(m => m !== modelKey);
    setLocalSelectedModels(newModels);
    
    const updatedData = {
      ...safeCard.data,
      selectedModels: newModels,
      modelCount: newModels.length,
      lastUpdate: new Date().toISOString()
    };
    
    dispatch(updateCardData({
      cardId: safeCard.id,
      data: updatedData
    }));

    if (onUpdate) {
      onUpdate(updatedData);
    }
  };

  // 应用到聊天
  const handleApplyToChat = () => {
    try {
      if (localSelectedModels.length === 0) {
        setSnackbarMessage('请至少选择一个模型');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      // 更新 Redux store 中的群聊设置
      dispatch(setGroupChatSettings({
        selectedProviders: localSelectedModels,
        replyStrategy: 'discussion'
      }));

      // 触发群聊模型更新事件（与ChatPanel保持一致）
      window.dispatchEvent(new CustomEvent('groupchat-models-update', {
        detail: { 
          selectedModels: localSelectedModels,
          mode: 'relay', // 接力式对话模式
          strategy: 'sequential' // 顺序回复策略
        }
      }));

      // 显示成功提示
      setSnackbarMessage(`已成功应用 ${localSelectedModels.length} 个模型到群聊`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      // 可选：延迟后自动切换到聊天界面
      setTimeout(() => {
        // 这里可以添加切换到聊天界面的逻辑
        console.log('群聊模型已应用，可以开始对话');
      }, 1000);

    } catch (error) {
      console.error('应用群聊模型失败:', error);
      setSnackbarMessage('应用模型失败，请重试');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // 清空选择
  const handleClearAll = () => {
    setLocalSelectedModels([]);
    
    const updatedData = {
      ...safeCard.data,
      selectedModels: [],
      modelCount: 0,
      lastUpdate: new Date().toISOString()
    };
    
    dispatch(updateCardData({
      cardId: safeCard.id,
      data: updatedData
    }));

    if (onUpdate) {
      onUpdate(updatedData);
    }
  };

  // 刷新模型列表
  const handleRefresh = () => {
    // 重新获取模型列表
    window.location.reload();
  };

  // 关闭提示信息
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* 标题和状态 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#00e5ff', mb: 1 }}>
          🤖 群聊模型选择器
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          选择多个AI模型进行群聊对话
        </Typography>
      </Box>

      {/* 当前选择状态 */}
      {localSelectedModels.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: '#00e5ff', mb: 1, display: 'block' }}>
            已选择的模型 ({localSelectedModels.length}):
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 0.5,
            p: 1,
            backgroundColor: 'rgba(0, 229, 255, 0.05)',
            borderRadius: 1,
            border: '1px solid rgba(0, 229, 255, 0.2)'
          }}>
            {localSelectedModels.map((modelKey) => {
              const model = availableModels.find(m => m.key === modelKey);
              return (
                <Chip
                  key={modelKey}
                  label={model ? model.displayName : modelKey}
                  onDelete={() => handleDeleteModel(modelKey)}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(0, 229, 255, 0.2)',
                    color: '#00e5ff',
                    '& .MuiChip-deleteIcon': {
                      color: '#00e5ff',
                      '&:hover': {
                        color: '#ff4444',
                      },
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* 模型选择器 */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          选择AI模型
        </InputLabel>
        <Select
          multiple
          value={Array.isArray(localSelectedModels) ? localSelectedModels : []}
          label="选择AI模型"
          onChange={handleModelChange}
          renderValue={(selected) => {
            const selectedArray = Array.isArray(selected) ? selected : [];
            return `${selectedArray.length} 个模型已选择`;
          }}
          sx={{
            color: '#00e5ff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 229, 255, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 229, 255, 0.5)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#00e5ff',
            },
          }}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 300,
                backgroundColor: 'rgba(18, 18, 18, 0.95)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
              },
            },
            // 优化用户体验：选择后自动关闭下拉框
            autoFocus: false,
            disableAutoFocusItem: true,
          }}
          // 添加关闭事件处理
          onClose={() => {
            // 选择完成后的处理逻辑
          }}
        >
          {modelProviders.map((provider) => [
            <MenuItem 
              key={`${provider.id}-header`} 
              disabled 
              sx={{ 
                fontWeight: 'bold', 
                color: '#00e5ff',
                backgroundColor: 'rgba(0, 229, 255, 0.1)',
              }}
            >
              {provider.name}
            </MenuItem>,
            ...provider.models.map((model: any) => {
              const modelKey = `${provider.id}:${model.id}`;
              return (
                <MenuItem 
                  key={modelKey} 
                  value={modelKey}
                  sx={{ 
                    pl: 4,
                    color: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 229, 255, 0.1)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(0, 229, 255, 0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 229, 255, 0.3)',
                      },
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {model.name}
                    </Typography>
                    <Chip
                      label="可用"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.6rem', height: 18 }}
                    />
                  </Box>
                </MenuItem>
              );
            })
          ]).flat()}
        </Select>
      </FormControl>

      <Divider sx={{ my: 2, borderColor: 'rgba(0, 229, 255, 0.2)' }} />

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleApplyToChat}
          disabled={localSelectedModels.length === 0}
          sx={{
            backgroundColor: '#00e5ff',
            color: '#000',
            '&:hover': {
              backgroundColor: '#00b8cc',
            },
            '&:disabled': {
              backgroundColor: 'rgba(0, 229, 255, 0.3)',
              color: 'rgba(0, 0, 0, 0.5)',
            },
          }}
        >
          应用到聊天
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<DeleteIcon />}
          onClick={handleClearAll}
          disabled={localSelectedModels.length === 0}
          sx={{
            borderColor: '#ff4444',
            color: '#ff4444',
            '&:hover': {
              borderColor: '#ff0000',
              backgroundColor: 'rgba(255, 68, 68, 0.1)',
            },
            '&:disabled': {
              borderColor: 'rgba(255, 68, 68, 0.3)',
              color: 'rgba(255, 68, 68, 0.3)',
            },
          }}
        >
          清空选择
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{
            borderColor: '#00e5ff',
            color: '#00e5ff',
            '&:hover': {
              borderColor: '#00b8cc',
              backgroundColor: 'rgba(0, 229, 255, 0.1)',
            },
          }}
        >
          刷新
        </Button>
      </Box>

      {/* 提示信息 */}
      <Collapse in={localSelectedModels.length === 0}>
        <Alert
          severity="info"
          sx={{
            mt: 2,
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.9)',
            '& .MuiAlert-icon': {
              color: '#00e5ff',
            },
          }}
        >
          请选择至少一个AI模型来开始群聊对话
        </Alert>
      </Collapse>

      {/* 统计信息 */}
      <Box sx={{
        mt: 2,
        p: 1,
        backgroundColor: 'rgba(0, 229, 255, 0.05)',
        borderRadius: 1,
        border: '1px solid rgba(0, 229, 255, 0.2)'
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          📊 可用模型: {availableModels.length} | 已选择: {localSelectedModels.length} | 
          更新时间: {new Date(safeCard.data.lastUpdate).toLocaleTimeString()}
        </Typography>
      </Box>

      {/* 提示信息 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          sx={{
            backgroundColor: snackbarSeverity === 'success' 
              ? 'rgba(76, 175, 80, 0.9)' 
              : snackbarSeverity === 'error' 
              ? 'rgba(244, 67, 54, 0.9)' 
              : 'rgba(33, 150, 243, 0.9)',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white',
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GroupChatCard;