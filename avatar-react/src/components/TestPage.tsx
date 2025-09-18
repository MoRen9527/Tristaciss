import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const TestPage: React.FC = () => {
  const testLocalStorage = () => {
    // 测试localStorage中的groupChatSettings
    const settings = localStorage.getItem('groupChatSettings');
    console.log('当前groupChatSettings:', settings);
    
    if (!settings) {
      // 如果没有设置，创建一个默认的
      const defaultSettings = {
        selectedProviders: ['openai', 'openrouter'],
        mode: 'parallel',
        providers: {}
      };
      localStorage.setItem('groupChatSettings', JSON.stringify(defaultSettings));
      console.log('已创建默认设置');
    }
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('groupChatSettings');
    console.log('已清除groupChatSettings');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        修复测试页面
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 2 }}>
        这个页面用于测试修复后的功能
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" onClick={testLocalStorage}>
          测试LocalStorage
        </Button>
        <Button variant="outlined" onClick={clearLocalStorage}>
          清除LocalStorage
        </Button>
      </Box>
      
      <Typography variant="body2" color="text.secondary">
        打开浏览器控制台查看测试结果
      </Typography>
    </Box>
  );
};

export default TestPage;