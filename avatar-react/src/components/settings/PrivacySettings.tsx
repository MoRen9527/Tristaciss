import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider
} from '@mui/material';
import {
  Security as SecurityIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Storage as StorageIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  CloudOff as CloudOffIcon
} from '@mui/icons-material';

interface PrivacySettingsProps {
  onSettingsChange?: () => void;
}

interface PrivacyState {
  dataCollection: boolean;
  analyticsEnabled: boolean;
  crashReports: boolean;
  personalizedAds: boolean;
  locationTracking: boolean;
  autoDeleteHistory: boolean;
  historyRetentionDays: number;
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<PrivacyState>({
    dataCollection: true,
    analyticsEnabled: false,
    crashReports: true,
    personalizedAds: false,
    locationTracking: false,
    autoDeleteHistory: false,
    historyRetentionDays: 30
  });

  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  useEffect(() => {
    // 从localStorage加载隐私设置
    const savedSettings = localStorage.getItem('privacySettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('加载隐私设置失败:', error);
      }
    }
  }, []);

  const handleSettingChange = (key: keyof PrivacyState, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    if (onSettingsChange) {
      onSettingsChange();
    }
  };

  const handleSave = () => {
    localStorage.setItem('privacySettings', JSON.stringify(settings));
    setHasChanges(false);
    alert('隐私设置已保存');
  };

  const handleClearAllData = () => {
    setShowConfirmDialog(true);
  };

  const confirmClearData = () => {
    // 清除所有本地数据
    localStorage.clear();
    sessionStorage.clear();
    
    // 重置设置
    setSettings({
      dataCollection: true,
      analyticsEnabled: false,
      crashReports: true,
      personalizedAds: false,
      locationTracking: false,
      autoDeleteHistory: false,
      historyRetentionDays: 30
    });
    
    setShowConfirmDialog(false);
    setHasChanges(false);
    alert('所有数据已清除');
  };

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h6" sx={{ mb: 3, color: '#00ffff' }}>
        🔒 隐私设置
      </Typography>

      <Card sx={{ mb: 3, backgroundColor: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 1, color: '#00ffff' }} />
            <Typography variant="h6">数据收集</Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.dataCollection}
                onChange={(e) => handleSettingChange('dataCollection', e.target.checked)}
              />
            }
            label="允许收集使用数据以改善服务"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.analyticsEnabled}
                onChange={(e) => handleSettingChange('analyticsEnabled', e.target.checked)}
              />
            }
            label="启用使用分析"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.crashReports}
                onChange={(e) => handleSettingChange('crashReports', e.target.checked)}
              />
            }
            label="发送崩溃报告"
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, backgroundColor: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <StorageIcon sx={{ mr: 1, color: '#00ffff' }} />
            <Typography variant="h6">个性化设置</Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.personalizedAds}
                onChange={(e) => handleSettingChange('personalizedAds', e.target.checked)}
              />
            }
            label="个性化广告"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.locationTracking}
                onChange={(e) => handleSettingChange('locationTracking', e.target.checked)}
              />
            }
            label="位置跟踪"
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, backgroundColor: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <HistoryIcon sx={{ mr: 1, color: '#00ffff' }} />
            <Typography variant="h6">历史记录</Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoDeleteHistory}
                onChange={(e) => handleSettingChange('autoDeleteHistory', e.target.checked)}
              />
            }
            label="自动删除历史记录"
          />
          
          {settings.autoDeleteHistory && (
            <Box sx={{ mt: 2, ml: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                保留天数: {settings.historyRetentionDays}天
              </Typography>
              <input
                type="range"
                min="7"
                max="365"
                value={settings.historyRetentionDays}
                onChange={(e) => handleSettingChange('historyRetentionDays', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, backgroundColor: 'rgba(255, 0, 0, 0.05)', border: '1px solid rgba(255, 0, 0, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <WarningIcon sx={{ mr: 1, color: '#ff4444' }} />
            <Typography variant="h6" sx={{ color: '#ff4444' }}>
              危险操作
            </Typography>
          </Box>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            以下操作将永久删除数据，无法恢复！
          </Alert>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleClearAllData}
            fullWidth
          >
            清除所有本地数据
          </Button>
        </CardContent>
      </Card>

      {hasChanges && (
        <Alert severity="info" sx={{ mb: 2 }}>
          您有未保存的更改
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!hasChanges}
          sx={{
            backgroundColor: '#00ffff',
            color: '#000',
            '&:hover': {
              backgroundColor: '#00cccc'
            }
          }}
        >
          保存设置
        </Button>
      </Box>

      {/* 确认对话框 */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ color: '#ff4444' }}>
          ⚠️ 确认清除所有数据
        </DialogTitle>
        <DialogContent>
          <Typography>
            此操作将永久删除所有本地数据，包括：
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="• 用户设置和偏好" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• 聊天记录和历史" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• 缓存文件" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• 本地存储的所有数据" />
            </ListItem>
          </List>
          <Alert severity="error" sx={{ mt: 2 }}>
            此操作无法撤销，请谨慎操作！
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            取消
          </Button>
          <Button 
            onClick={confirmClearData}
            color="error"
            variant="contained"
          >
            确认清除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrivacySettings;