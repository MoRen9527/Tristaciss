import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Divider,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import InfoCard from './InfoCard';
import { chatAPI } from '../../services/api';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  color?: string;
  maxTokens?: number;
  description?: string;
}

interface SystemPrompts {
  mode: 'unified' | 'individual';
  prompt?: string;
  prompts?: Record<string, string>;
}

interface ModelSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (models: ModelInfo[], systemPrompts: SystemPrompts) => void;
}

const ModelSelectionDialog: React.FC<ModelSelectionDialogProps> = ({ 
  open, 
  onClose, 
  onConfirm 
}) => {
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([]);
  const [promptMode, setPromptMode] = useState<'unified' | 'individual'>('unified');
  const [unifiedPrompt, setUnifiedPrompt] = useState('你们可以自己给自己一个角色，性格随机自选，参与这场群聊讨论');
  const [individualPrompts, setIndividualPrompts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载可用模型
  useEffect(() => {
    if (open) {
      loadAvailableModels();
    }
  }, [open]);

  const loadAvailableModels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取群聊设置
      const response = await chatAPI.getGroupChatSettings();
      console.log('获取到群聊设置:', response);
      
      if (response && response.data && response.data.success) {
        const availableModels = response.data.data.availableModels || [];
        
        // 转换模型数据格式
        const models: ModelInfo[] = availableModels.map((model: any) => ({
          id: model.id,
          name: model.name,
          provider: model.provider,
          color: getModelColor(model.provider),
          maxTokens: 4096,
          description: `${model.displayName}`
        }));
        
        setAvailableModels(models);
        
        if (models.length === 0) {
          setError('当前没有可用的模型，请检查模型配置');
        }
      } else {
        setError('无法获取模型列表');
      }
    } catch (error) {
      console.error('加载可用模型失败:', error);
      setError('加载模型列表失败，请检查网络连接和后端服务');
      
      // 提供一些默认模型作为备选
      const defaultModels: ModelInfo[] = [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          color: '#10a37f',
          maxTokens: 8192,
          description: 'OpenAI GPT-4 模型'
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          color: '#10a37f',
          maxTokens: 4096,
          description: 'OpenAI GPT-3.5 Turbo 模型'
        },
        {
          id: 'claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          provider: 'anthropic',
          color: '#d97706',
          maxTokens: 100000,
          description: 'Anthropic Claude 3 Sonnet 模型'
        }
      ];
      setAvailableModels(defaultModels);
    } finally {
      setLoading(false);
    }
  };

  // 获取模型颜色
  const getModelColor = (provider: string): string => {
    const colors: Record<string, string> = {
      'openai': '#10a37f',
      'anthropic': '#d97706',
      'google': '#4285f4',
      'openrouter': '#8b5cf6',
      'ollama': '#0ea5e9',
      'unknown': '#6b7280'
    };
    return colors[provider.toLowerCase()] || colors.unknown;
  };

  // 处理模型选择
  const handleModelToggle = (model: ModelInfo) => {
    setSelectedModels(prev => {
      const isSelected = prev.some(m => m.id === model.id);
      if (isSelected) {
        // 移除模型
        const newSelected = prev.filter(m => m.id !== model.id);
        // 同时移除个性化提示词
        const newPrompts = { ...individualPrompts };
        delete newPrompts[model.id];
        setIndividualPrompts(newPrompts);
        return newSelected;
      } else {
        // 添加模型
        return [...prev, model];
      }
    });
  };

  // 处理个性化提示词变更
  const handleIndividualPromptChange = (modelId: string, prompt: string) => {
    setIndividualPrompts(prev => ({
      ...prev,
      [modelId]: prompt
    }));
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedModels.length === 0) {
      setError('请至少选择一个大模型');
      return;
    }

    const systemPrompts: SystemPrompts = promptMode === 'unified' 
      ? { mode: 'unified', prompt: unifiedPrompt }
      : { mode: 'individual', prompts: individualPrompts };

    onConfirm(selectedModels, systemPrompts);
  };

  // 重置状态
  const handleClose = () => {
    setSelectedModels([]);
    setIndividualPrompts({});
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          选择群聊参与的大模型
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          选择您希望参与群聊的AI大模型，并配置它们的系统提示词
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
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

        {/* 模型选择区域 */}
        {!loading && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              可用模型 ({selectedModels.length} 已选择)
            </Typography>
            <Grid container spacing={2}>
              {availableModels.map((model) => (
                <Grid item xs={12} sm={6} md={4} key={model.id}>
                  <InfoCard
                    model={model}
                    selected={selectedModels.some(m => m.id === model.id)}
                    onToggle={() => handleModelToggle(model)}
                    variant="selection"
                  />
                </Grid>
              ))}
            </Grid>
            
            {availableModels.length === 0 && !loading && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                没有找到可用的模型
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* 系统提示词配置 */}
        <Box>
          <Typography variant="h6" gutterBottom>
            系统提示词配置
          </Typography>
          
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">配置模式</FormLabel>
            <RadioGroup
              value={promptMode}
              onChange={(e) => setPromptMode(e.target.value as 'unified' | 'individual')}
              row
            >
              <FormControlLabel 
                value="unified" 
                control={<Radio />} 
                label="统一配置" 
              />
              <FormControlLabel 
                value="individual" 
                control={<Radio />} 
                label="个性化配置" 
              />
            </RadioGroup>
          </FormControl>

          {promptMode === 'unified' ? (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="统一系统提示词"
              value={unifiedPrompt}
              onChange={(e) => setUnifiedPrompt(e.target.value)}
              placeholder="为所有选中的大模型设置统一的系统提示词..."
              helperText="此提示词将应用于所有选中的大模型"
            />
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                为每个选中的大模型单独配置系统提示词：
              </Typography>
              {selectedModels.map((model) => (
                <TextField
                  key={model.id}
                  fullWidth
                  multiline
                  rows={2}
                  label={`${model.name} 的系统提示词`}
                  value={individualPrompts[model.id] || ''}
                  onChange={(e) => handleIndividualPromptChange(model.id, e.target.value)}
                  placeholder={`为 ${model.name} 设置个性化提示词，例如："你是一个医生，性格温和，参与这场群聊讨论"`}
                  sx={{ mb: 2 }}
                />
              ))}
              
              {selectedModels.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  请先选择模型
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          取消
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
          disabled={selectedModels.length === 0 || loading}
        >
          开始群聊 ({selectedModels.length} 个模型)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModelSelectionDialog;