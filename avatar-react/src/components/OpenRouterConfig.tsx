import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Tabs,
  Tab,
  Chip,
  Grid,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Psychology as PsychologyIcon,
  Visibility as VisibilityIcon,
  Functions as FunctionsIcon,
  Science as TestTubeIcon
} from '@mui/icons-material';

interface FreeModelInfo {
  model_id: string;
  name: string;
  provider: string;
  context_length: number;
  supports_reasoning: boolean;
  supports_vision: boolean;
  supports_function_calling: boolean;
  description: string;
}

interface ModelCapabilities {
  reasoning: boolean;
  vision: boolean;
  function_calling: boolean;
  free: boolean;
  context_length: number;
}

interface OpenRouterMode {
  id: string;
  name: string;
  description: string;
  advantages: string[];
  disadvantages: string[];
}

interface OpenRouterConfigProps {
  onConfigChange?: (config: any) => void;
}

const OpenRouterConfig: React.FC<OpenRouterConfigProps> = ({ onConfigChange }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [modes, setModes] = useState<OpenRouterMode[]>([]);
  const [freeModels, setFreeModels] = useState<FreeModelInfo[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>('openai_compatible');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // 配置状态
  const [config, setConfig] = useState({
    api_key: '',
    base_url: 'https://openrouter.ai/api/v1',
    default_model: 'deepseek/deepseek-r1:free',
    enabled: false,
    provider_mode: 'openai_compatible',
    free_models_only: true,
    enabled_models: [] as string[],
    routing_strategy: 'round_robin',
    max_retries: 3,
    timeout_per_model: 30.0
  });
  
  // 多模型配置
  const [multiModelConfig, setMultiModelConfig] = useState({
    enabled_models: [] as string[],
    routing_strategy: 'round_robin',
    max_retries: 3,
    timeout_per_model: 30.0
  });
  
  // 对话框状态
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [selectedModelForInfo, setSelectedModelForInfo] = useState<FreeModelInfo | null>(null);
  
  // 路由策略选项
  const routingStrategies = [
    { value: 'round_robin', label: '轮询 (Round Robin)' },
    { value: 'random', label: '随机 (Random)' },
    { value: 'least_used', label: '最少使用 (Least Used)' },
    { value: 'fastest_first', label: '最快优先 (Fastest First)' },
    { value: 'failover', label: '故障转移 (Failover)' }
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // 加载支持的模式
      const modesResponse = await fetch('/api/openrouter/modes');
      if (modesResponse.ok) {
        const modesData = await modesResponse.json();
        setModes(modesData.modes);
      }
      
      // 加载免费模型
      const modelsResponse = await fetch('/api/openrouter/free-models');
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        setFreeModels(modelsData);
      }
      
      // 加载当前配置
      const configResponse = await fetch('/api/openrouter/config');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        // 根据配置更新状态
        if (configData.openai_compatible?.enabled) {
          setConfig(prev => ({ ...prev, ...configData.openai_compatible.config }));
        } else if (configData.official_sdk?.enabled) {
          setConfig(prev => ({ 
            ...prev, 
            ...configData.official_sdk.config,
            provider_mode: 'official_sdk'
          }));
        }
      }
      
    } catch (error) {
      console.error('加载初始数据失败:', error);
      setError('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev, [field]: value };
      onConfigChange?.(newConfig);
      return newConfig;
    });
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await fetch('/api/openrouter/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
      
    } catch (error) {
      console.error('保存配置失败:', error);
      setError('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await fetch('/api/openrouter/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider_mode: config.provider_mode }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess('连接测试成功');
      } else {
        setError(result.message);
      }
      
    } catch (error) {
      console.error('连接测试失败:', error);
      setError('连接测试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = (modelId: string) => {
    if (!config.enabled_models.includes(modelId)) {
      handleConfigChange('enabled_models', [...config.enabled_models, modelId]);
    }
  };

  const handleRemoveModel = (modelId: string) => {
    handleConfigChange(
      'enabled_models',
      config.enabled_models.filter(id => id !== modelId)
    );
  };

  const getModelCapabilityIcons = (model: FreeModelInfo) => {
    const icons = [];
    
    if (model.supports_reasoning) {
      icons.push(
        <Tooltip key="reasoning" title="支持推理">
          <PsychologyIcon className="text-blue-500" />
        </Tooltip>
      );
    }
    
    if (model.supports_vision) {
      icons.push(
        <Tooltip key="vision" title="支持视觉">
          <VisibilityIcon className="text-green-500" />
        </Tooltip>
      );
    }
    
    if (model.supports_function_calling) {
      icons.push(
        <Tooltip key="functions" title="支持函数调用">
          <FunctionsIcon className="text-purple-500" />
        </Tooltip>
      );
    }
    
    return icons;
  };

  const renderBasicConfig = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        基础配置
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={config.enabled}
                onChange={(e) => handleConfigChange('enabled', e.target.checked)}
              />
            }
            label="启用 OpenRouter"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="API Key"
            type="password"
            value={config.api_key}
            onChange={(e) => handleConfigChange('api_key', e.target.value)}
            placeholder="sk-or-v1-..."
            helperText="从 OpenRouter 获取的 API 密钥"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Base URL"
            value={config.base_url}
            onChange={(e) => handleConfigChange('base_url', e.target.value)}
            helperText="OpenRouter API 基础地址"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>提供商模式</InputLabel>
            <Select
              value={config.provider_mode}
              onChange={(e) => handleConfigChange('provider_mode', e.target.value)}
            >
              <MenuItem value="openai_compatible">OpenAI 兼容模式</MenuItem>
              <MenuItem value="official_sdk">官方 SDK 模式</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={config.free_models_only}
                onChange={(e) => handleConfigChange('free_models_only', e.target.checked)}
              />
            }
            label="仅使用免费模型"
          />
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSaveConfig}
          disabled={loading}
        >
          保存配置
        </Button>
        
        <Button
          variant="outlined"
          onClick={handleTestConnection}
          disabled={loading || !config.api_key}
          startIcon={<TestTubeIcon />}
        >
          测试连接
        </Button>
      </Box>
    </Box>
  );

  const renderModeComparison = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        模式对比
      </Typography>
      
      <Grid container spacing={3}>
        {modes.map((mode) => (
          <Grid item xs={12} md={6} key={mode.id}>
            <Card 
              variant={config.provider_mode === mode.id ? "outlined" : "elevation"}
              sx={{ 
                height: '100%',
                border: config.provider_mode === mode.id ? 2 : 0,
                borderColor: config.provider_mode === mode.id ? 'primary.main' : 'transparent'
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {mode.name}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {mode.description}
                </Typography>
                
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  优势:
                </Typography>
                <List dense>
                  {mode.advantages.map((advantage, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemText 
                        primary={`• ${advantage}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  劣势:
                </Typography>
                <List dense>
                  {mode.disadvantages.map((disadvantage, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemText 
                        primary={`• ${disadvantage}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Button
                  fullWidth
                  variant={config.provider_mode === mode.id ? "contained" : "outlined"}
                  onClick={() => handleConfigChange('provider_mode', mode.id)}
                  sx={{ mt: 2 }}
                >
                  {config.provider_mode === mode.id ? '已选择' : '选择此模式'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderModelSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        模型选择
      </Typography>
      
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>已启用的模型 ({config.enabled_models.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {config.enabled_models.length === 0 ? (
            <Typography color="text.secondary">
              尚未选择任何模型
            </Typography>
          ) : (
            <List>
              {config.enabled_models.map((modelId) => {
                const model = freeModels.find(m => m.model_id === modelId);
                return (
                  <ListItem key={modelId}>
                    <ListItemText
                      primary={model?.name || modelId}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Chip 
                            size="small" 
                            label={`${model?.context_length || 0}K`}
                            icon={<SpeedIcon />}
                          />
                          {model && getModelCapabilityIcons(model)}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveModel(modelId)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
        </AccordionDetails>
      </Accordion>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>可用的免费模型 ({freeModels.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {freeModels.map((model) => (
              <ListItem key={model.model_id}>
                <ListItemText
                  primary={model.name}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {model.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Chip 
                          size="small" 
                          label={`${model.context_length}K`}
                          icon={<SpeedIcon />}
                        />
                        {getModelCapabilityIcons(model)}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      onClick={() => {
                        setSelectedModelForInfo(model);
                        setModelDialogOpen(true);
                      }}
                    >
                      <InfoIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleAddModel(model.model_id)}
                      disabled={config.enabled_models.includes(model.model_id)}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  const renderMultiModelConfig = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        多模型路由配置
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>路由策略</InputLabel>
            <Select
              value={config.routing_strategy}
              onChange={(e) => handleConfigChange('routing_strategy', e.target.value)}
            >
              {routingStrategies.map((strategy) => (
                <MenuItem key={strategy.value} value={strategy.value}>
                  {strategy.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6}>
          <TextField
            fullWidth
            type="number"
            label="最大重试次数"
            value={config.max_retries}
            onChange={(e) => handleConfigChange('max_retries', parseInt(e.target.value))}
            inputProps={{ min: 1, max: 10 }}
          />
        </Grid>
        
        <Grid item xs={6}>
          <TextField
            fullWidth
            type="number"
            label="单模型超时时间 (秒)"
            value={config.timeout_per_model}
            onChange={(e) => handleConfigChange('timeout_per_model', parseFloat(e.target.value))}
            inputProps={{ min: 5, max: 120, step: 5 }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Alert severity="info">
            多模型路由允许在群聊时同时使用多个免费模型，提供更好的可用性和负载分担。
            选择的路由策略将决定如何在多个模型之间分配请求。
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {loading && <LinearProgress />}
      
      <Typography variant="h4" gutterBottom>
        OpenRouter 双模式配置
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        <Tab label="基础配置" />
        <Tab label="模式对比" />
        <Tab label="模型选择" />
        <Tab label="多模型路由" />
      </Tabs>
      
      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderBasicConfig()}
        {activeTab === 1 && renderModeComparison()}
        {activeTab === 2 && renderModelSelection()}
        {activeTab === 3 && renderMultiModelConfig()}
      </Box>
      
      {/* 模型详情对话框 */}
      <Dialog
        open={modelDialogOpen}
        onClose={() => setModelDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedModelForInfo?.name}
        </DialogTitle>
        <DialogContent>
          {selectedModelForInfo && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedModelForInfo.description}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">模型ID:</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedModelForInfo.model_id}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2">上下文长度:</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedModelForInfo.context_length.toLocaleString()} tokens
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2">支持的功能:</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {selectedModelForInfo.supports_reasoning && (
                      <Chip label="推理" icon={<PsychologyIcon />} />
                    )}
                    {selectedModelForInfo.supports_vision && (
                      <Chip label="视觉" icon={<VisibilityIcon />} />
                    )}
                    {selectedModelForInfo.supports_function_calling && (
                      <Chip label="函数调用" icon={<FunctionsIcon />} />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModelDialogOpen(false)}>
            关闭
          </Button>
          {selectedModelForInfo && (
            <Button
              variant="contained"
              onClick={() => {
                handleAddModel(selectedModelForInfo.model_id);
                setModelDialogOpen(false);
              }}
              disabled={config.enabled_models.includes(selectedModelForInfo.model_id)}
            >
              添加到启用列表
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OpenRouterConfig;