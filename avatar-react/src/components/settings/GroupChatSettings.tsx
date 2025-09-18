import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  TextField,
  Button,
  FormControlLabel,
  Alert,
  Snackbar,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  PlayArrow as TestIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import configManager from '../../services/ConfigManager';
import { ProviderConfig, ProviderConfigs } from '../../types/config';

interface GroupChatSettingsProps {
  open: boolean;
  onClose: () => void;
}

interface GroupChatConfig {
  enabled: boolean;
  maxParticipants: number;
  responseTimeout: number;
  replyStrategy: 'exclusive' | 'discussion' | 'supplement';
  systemPrompt: string;
  enableModeration: boolean;
  moderationLevel: 'low' | 'medium' | 'high';
  autoSaveHistory: boolean;
  maxHistoryLength: number;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

const GroupChatSettings: React.FC<GroupChatSettingsProps> = ({ open, onClose }) => {
  const [config, setConfig] = useState<GroupChatConfig>({
    enabled: true,
    maxParticipants: 4,
    responseTimeout: 30,
    replyStrategy: 'discussion',
    systemPrompt: '你是一个有用的AI助手，请与其他AI协作为用户提供最佳答案。',
    enableModeration: false,
    moderationLevel: 'medium',
    autoSaveHistory: true,
    maxHistoryLength: 100
  });
  
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfigs>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // 回复策略选项
  const replyStrategies = [
    {
      value: 'exclusive' as const,
      label: '独占模式',
      description: '只有第一个响应的AI会回复，其他AI将被忽略'
    },
    {
      value: 'discussion' as const,
      label: '讨论模式',
      description: '所有AI都会看到其他AI的回复，形成多轮讨论'
    },
    {
      value: 'supplement' as const,
      label: '补充模式',
      description: '各AI依次回复，后回复的AI会看到前面的回复内容'
    }
  ];

  // 审核级别选项
  const moderationLevels = [
    { value: 'low' as const, label: '宽松', description: '仅过滤明显有害内容' },
    { value: 'medium' as const, label: '中等', description: '平衡安全性和自由度' },
    { value: 'high' as const, label: '严格', description: '严格过滤可能有害的内容' }
  ];

  useEffect(() => {
    if (open) {
      loadConfigs();
    }
  }, [open]);

  const loadConfigs = async (): Promise<void> => {
    setLoading(true);
    try {
      // 加载提供商配置
      const providers = await configManager.loadConfigs();
      setProviderConfigs(providers);
      
      // 加载群聊配置（从localStorage或使用默认值）
      const savedConfig = localStorage.getItem('groupChatConfig');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          setConfig({ ...config, ...parsed });
        } catch (error) {
          console.warn('解析群聊配置失败，使用默认配置');
        }
      }
      
      setHasChanges(false);
    } catch (error: any) {
      console.error('加载配置失败:', error);
      showSnackbar(`加载配置失败: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: SnackbarState['severity'] = 'info'): void => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = (): void => {
    setSnackbar({ ...snackbar, open: false });
  };

  const updateConfig = (field: keyof GroupChatConfig, value: any): void => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const saveConfig = async (): Promise<void> => {
    setSaving(true);
    try {
      // 保存到localStorage
      localStorage.setItem('groupChatConfig', JSON.stringify(config));
      
      // 触发配置更新事件
      configManager.notifyListeners('groupChatConfigUpdated', config);
      
      setHasChanges(false);
      showSnackbar('群聊配置保存成功', 'success');
    } catch (error: any) {
      showSnackbar(`保存配置失败: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = (): void => {
    setConfig({
      enabled: true,
      maxParticipants: 4,
      responseTimeout: 30,
      replyStrategy: 'discussion',
      systemPrompt: '你是一个有用的AI助手，请与其他AI协作为用户提供最佳答案。',
      enableModeration: false,
      moderationLevel: 'medium',
      autoSaveHistory: true,
      maxHistoryLength: 100
    });
    setHasChanges(true);
  };

  // 获取可用的AI提供商数量
  const getAvailableProviders = (): number => {
    return Object.values(providerConfigs).filter(provider => 
      provider.enabled && provider.apiKey
    ).length;
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              正在加载配置...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <GroupIcon />
            <Typography variant="h6">群聊设置</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {hasChanges && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            您有未保存的更改，请记得保存配置
          </Alert>
        )}

        {getAvailableProviders() < 2 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            当前只有 {getAvailableProviders()} 个可用的AI提供商。群聊功能需要至少2个提供商才能正常工作。
          </Alert>
        )}

        {/* 基础设置 */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">基础设置</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enabled}
                      onChange={(e) => updateConfig('enabled', e.target.checked)}
                    />
                  }
                  label="启用群聊功能"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>最大参与者数量: {config.maxParticipants}</Typography>
                <Slider
                  value={config.maxParticipants}
                  onChange={(_, value) => updateConfig('maxParticipants', value)}
                  min={2}
                  max={8}
                  marks
                  valueLabelDisplay="auto"
                  disabled={!config.enabled}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>响应超时时间: {config.responseTimeout}秒</Typography>
                <Slider
                  value={config.responseTimeout}
                  onChange={(_, value) => updateConfig('responseTimeout', value)}
                  min={10}
                  max={120}
                  step={5}
                  marks={[
                    { value: 10, label: '10s' },
                    { value: 30, label: '30s' },
                    { value: 60, label: '60s' },
                    { value: 120, label: '120s' }
                  ]}
                  valueLabelDisplay="auto"
                  disabled={!config.enabled}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth disabled={!config.enabled}>
                  <InputLabel>回复策略</InputLabel>
                  <Select
                    value={config.replyStrategy}
                    onChange={(e) => updateConfig('replyStrategy', e.target.value)}
                    label="回复策略"
                  >
                    {replyStrategies.map(strategy => (
                      <MenuItem key={strategy.value} value={strategy.value}>
                        <Box>
                          <Typography variant="body2">{strategy.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {strategy.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="系统提示词"
                  value={config.systemPrompt}
                  onChange={(e) => updateConfig('systemPrompt', e.target.value)}
                  disabled={!config.enabled}
                  helperText="这个提示词会发送给所有参与群聊的AI"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 内容审核 */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">内容审核</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableModeration}
                      onChange={(e) => updateConfig('enableModeration', e.target.checked)}
                    />
                  }
                  label="启用内容审核"
                  disabled={!config.enabled}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth disabled={!config.enabled || !config.enableModeration}>
                  <InputLabel>审核级别</InputLabel>
                  <Select
                    value={config.moderationLevel}
                    onChange={(e) => updateConfig('moderationLevel', e.target.value)}
                    label="审核级别"
                  >
                    {moderationLevels.map(level => (
                      <MenuItem key={level.value} value={level.value}>
                        <Box>
                          <Typography variant="body2">{level.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {level.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 历史记录 */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">历史记录</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.autoSaveHistory}
                      onChange={(e) => updateConfig('autoSaveHistory', e.target.checked)}
                    />
                  }
                  label="自动保存聊天历史"
                  disabled={!config.enabled}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  最大历史记录长度: {config.maxHistoryLength} 条消息
                </Typography>
                <Slider
                  value={config.maxHistoryLength}
                  onChange={(_, value) => updateConfig('maxHistoryLength', value)}
                  min={50}
                  max={500}
                  step={25}
                  marks={[
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                    { value: 200, label: '200' },
                    { value: 500, label: '500' }
                  ]}
                  valueLabelDisplay="auto"
                  disabled={!config.enabled || !config.autoSaveHistory}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 当前状态 */}
        <Paper sx={{ p: 2, mt: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
          <Typography variant="subtitle2" gutterBottom>
            当前状态
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip
              label={config.enabled ? '已启用' : '已禁用'}
              color={config.enabled ? 'success' : 'default'}
              size="small"
            />
            <Chip
              label={`${getAvailableProviders()} 个可用提供商`}
              color={getAvailableProviders() >= 2 ? 'success' : 'warning'}
              size="small"
            />
            <Chip
              label={`最多 ${config.maxParticipants} 个参与者`}
              size="small"
            />
            <Chip
              label={replyStrategies.find(s => s.value === config.replyStrategy)?.label || '未知策略'}
              size="small"
            />
            {config.enableModeration && (
              <Chip
                label={`审核: ${moderationLevels.find(l => l.value === config.moderationLevel)?.label}`}
                size="small"
              />
            )}
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={resetConfig} disabled={saving}>
          重置
        </Button>
        <Button onClick={onClose}>
          关闭
        </Button>
        <Button 
          onClick={saveConfig} 
          disabled={!hasChanges || saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          保存配置
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default GroupChatSettings;