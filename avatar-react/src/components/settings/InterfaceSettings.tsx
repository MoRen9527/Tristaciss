import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Card,
  CardContent,
  Divider,
  Alert,
  Button
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Brightness6 as BrightnessIcon,
  TextFields as TextIcon,
  Save as SaveIcon
} from '@mui/icons-material';

interface InterfaceSettingsProps {
  onSettingsChange?: () => void;
}

interface SettingsState {
  theme: 'dark' | 'light';
  language: 'zh-CN' | 'en-US';
  fontSize: number;
  animationsEnabled: boolean;
  autoSave: boolean;
  notificationsEnabled: boolean;
}

const InterfaceSettings: React.FC<InterfaceSettingsProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<SettingsState>({
    theme: 'dark',
    language: 'zh-CN',
    fontSize: 14,
    animationsEnabled: true,
    autoSave: true,
    notificationsEnabled: true
  });

  const [hasChanges, setHasChanges] = useState<boolean>(false);

  useEffect(() => {
    // 从localStorage加载设置
    const savedSettings = localStorage.getItem('interfaceSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('加载界面设置失败:', error);
      }
    }
  }, []);

  const handleSettingChange = (key: keyof SettingsState, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    if (onSettingsChange) {
      onSettingsChange();
    }
  };

  const handleSave = () => {
    localStorage.setItem('interfaceSettings', JSON.stringify(settings));
    setHasChanges(false);
    alert('界面设置已保存');
  };

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h6" sx={{ mb: 3, color: '#00ffff' }}>
        🎨 界面设置
      </Typography>

      <Card sx={{ mb: 3, backgroundColor: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PaletteIcon sx={{ mr: 1, color: '#00ffff' }} />
            <Typography variant="h6">主题设置</Typography>
          </Box>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>主题模式</InputLabel>
            <Select
              value={settings.theme}
              onChange={(e) => handleSettingChange('theme', e.target.value)}
              label="主题模式"
            >
              <MenuItem value="dark">深色主题</MenuItem>
              <MenuItem value="light">浅色主题</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={settings.animationsEnabled}
                onChange={(e) => handleSettingChange('animationsEnabled', e.target.checked)}
              />
            }
            label="启用动画效果"
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, backgroundColor: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextIcon sx={{ mr: 1, color: '#00ffff' }} />
            <Typography variant="h6">文字设置</Typography>
          </Box>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>语言</InputLabel>
            <Select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              label="语言"
            >
              <MenuItem value="zh-CN">中文</MenuItem>
              <MenuItem value="en-US">English</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ px: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              字体大小: {settings.fontSize}px
            </Typography>
            <Slider
              value={settings.fontSize}
              onChange={(e, value) => handleSettingChange('fontSize', value)}
              min={12}
              max={20}
              marks={[
                { value: 12, label: '小' },
                { value: 16, label: '中' },
                { value: 20, label: '大' }
              ]}
            />
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, backgroundColor: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BrightnessIcon sx={{ mr: 1, color: '#00ffff' }} />
            <Typography variant="h6">功能设置</Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoSave}
                onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
              />
            }
            label="自动保存"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.notificationsEnabled}
                onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
              />
            }
            label="启用通知"
          />
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
    </Box>
  );
};

export default InterfaceSettings;