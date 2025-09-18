import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Tabs, 
  Tab, 
  Box, 
  Typography,
  IconButton,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Close as CloseIcon,
  Save as SaveIcon 
} from '@mui/icons-material';
import ProviderSettings from './ProviderSettings';
import InterfaceSettings from './InterfaceSettings';
import PrivacySettings from './PrivacySettings';
import configManager from '../../services/ConfigManager';


interface UserSettingsProps {
  open: boolean;
  onClose: () => void;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

const UserSettings: React.FC<UserSettingsProps> = ({ open, onClose }) => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number): void => {
    setCurrentTab(newValue);
  };

  const handleSettingsChange = (): void => {
    console.log('🎯 UserSettings 收到设置变化通知');
    setHasChanges(true);
  };

  // 监听配置变化事件
  useEffect(() => {
    const handleConfigUpdated = () => {
      console.log('🎯 UserSettings 监听到配置更新事件');
      setHasChanges(true);
    };

    const handleProviderConfigUpdated = () => {
      console.log('🎯 UserSettings 监听到提供商配置更新事件');
      setHasChanges(true);
    };

    // 监听多个可能的配置变化事件
    window.addEventListener('configUpdated', handleConfigUpdated);
    window.addEventListener('providerConfigUpdated', handleProviderConfigUpdated);
    window.addEventListener('configChanged', handleConfigUpdated);

    return () => {
      window.removeEventListener('configUpdated', handleConfigUpdated);
      window.removeEventListener('providerConfigUpdated', handleProviderConfigUpdated);
      window.removeEventListener('configChanged', handleConfigUpdated);
    };
  }, []);

  const handleSaveSettings = async (): Promise<void> => {
    try {
      // 触发ProviderSettings组件的保存逻辑
      window.dispatchEvent(new CustomEvent('saveProviderSettings'));
      
      // 不要立即同步配置，因为ProviderSettings已经保存了
      // await configManager.syncConfigs();
      
      // 保存用户界面设置到localStorage作为备份
      localStorage.setItem('userInterfaceSettings', JSON.stringify({
        lastSaved: new Date().toISOString(),
        currentTab: currentTab
      }));
      
      setHasChanges(false);
      setSnackbar({ open: true, message: '设置保存成功', severity: 'success' });
      
      // 延迟关闭对话框
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('保存设置失败:', error);
      setSnackbar({ open: true, message: '保存设置失败', severity: 'error' });
    }
  };

  const handleSnackbarClose = (): void => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#fff',
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ color: '#00ffff' }}>
              ⚙️ 用户设置
            </Typography>
            {hasChanges && (
              <Chip 
                label="有未保存的更改" 
                color="warning" 
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(255, 152, 0, 0.2)',
                  color: '#ff9800',
                  border: '1px solid rgba(255, 152, 0, 0.3)'
                }}
              />
            )}
          </Box>
          <IconButton 
            onClick={onClose}
            sx={{ 
              color: '#00ffff',
              '&:hover': {
                backgroundColor: 'rgba(0, 255, 255, 0.1)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            sx={{
              borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: '#00ffff'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#00ffff'
              }
            }}
          >
            <Tab label="🤖 AI模型" />
            <Tab label="🎨 界面设置" />
            <Tab label="🔒 隐私设置" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {currentTab === 0 && (
              <ProviderSettings 
                embedded={true}
                open={false}
                onClose={() => {}}
                onSettingsChange={handleSettingsChange}
              />
            )}
            {currentTab === 1 && (
              <InterfaceSettings 
                onSettingsChange={handleSettingsChange}
              />
            )}
            {currentTab === 2 && (
              <PrivacySettings 
                onSettingsChange={handleSettingsChange}
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          borderTop: '1px solid rgba(0, 255, 255, 0.2)',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            设置会自动保存到本地和云端
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={onClose}
              variant="outlined"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveSettings}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!hasChanges}
              sx={{
                backgroundColor: hasChanges ? '#00ffff' : 'rgba(255, 255, 255, 0.1)',
                color: hasChanges ? '#000' : 'rgba(255, 255, 255, 0.6)',
                fontWeight: hasChanges ? 'bold' : 'normal',
                '&:hover': {
                  backgroundColor: hasChanges ? '#00cccc' : 'rgba(255, 255, 255, 0.15)'
                },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              {hasChanges ? '💾 保存更改' : '保存'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ 
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            color: '#fff',
            border: '1px solid rgba(0, 255, 255, 0.3)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UserSettings;