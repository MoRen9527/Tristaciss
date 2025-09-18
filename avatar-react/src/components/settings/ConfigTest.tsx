import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Divider,
  Grid,
  Paper
} from '@mui/material';
import api from '../../services/api';

interface ConfigTestProps {}

const ConfigTest: React.FC<ConfigTestProps> = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [providerConfig, setProviderConfig] = useState({
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo'
  });

  // 测试获取配置
  const testGetConfig = async () => {
    try {
      const response = await api.get('/config/providers');
      setTestResults(prev => [...prev, {
        test: '获取配置',
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: '获取配置',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  // 测试保存配置
  const testSaveConfig = async () => {
    try {
      const response = await api.post('/config/providers', {
        provider: providerConfig.provider,
        config: {
          api_key: providerConfig.apiKey,
          base_url: providerConfig.baseUrl,
          model: providerConfig.model
        }
      });
      setTestResults(prev => [...prev, {
        test: '保存配置',
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: '保存配置',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  // 测试验证配置
  const testValidateConfig = async () => {
    try {
      const response = await api.post('/config/validate', {
        provider: providerConfig.provider,
        config: {
          api_key: providerConfig.apiKey,
          base_url: providerConfig.baseUrl,
          model: providerConfig.model
        }
      });
      setTestResults(prev => [...prev, {
        test: '验证配置',
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: '验证配置',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  // 测试配置命令处理
  const testConfigCommand = async () => {
    try {
      const command = {
        action: 'get_provider_config',
        provider: providerConfig.provider,
        requestId: `test_${Date.now()}`
      };
      
      const response = await api.post('/config/command', command);
      setTestResults(prev => [...prev, {
        test: '配置命令处理',
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: '配置命令处理',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    await testGetConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testSaveConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testValidateConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testConfigCommand();
    
    setLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        配置系统测试
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            测试配置
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Provider"
                value={providerConfig.provider}
                onChange={(e) => setProviderConfig(prev => ({
                  ...prev,
                  provider: e.target.value
                }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="API Key"
                type="password"
                value={providerConfig.apiKey}
                onChange={(e) => setProviderConfig(prev => ({
                  ...prev,
                  apiKey: e.target.value
                }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Base URL"
                value={providerConfig.baseUrl}
                onChange={(e) => setProviderConfig(prev => ({
                  ...prev,
                  baseUrl: e.target.value
                }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Model"
                value={providerConfig.model}
                onChange={(e) => setProviderConfig(prev => ({
                  ...prev,
                  model: e.target.value
                }))}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={runAllTests}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          {loading ? '测试中...' : '运行所有测试'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={testGetConfig}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          测试获取配置
        </Button>
        
        <Button
          variant="outlined"
          onClick={testSaveConfig}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          测试保存配置
        </Button>
        
        <Button
          variant="outlined"
          onClick={testValidateConfig}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          测试验证配置
        </Button>
        
        <Button
          variant="outlined"
          onClick={testConfigCommand}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          测试命令处理
        </Button>
        
        <Button
          variant="text"
          onClick={clearResults}
          disabled={loading}
        >
          清除结果
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" gutterBottom>
        测试结果
      </Typography>

      {testResults.length === 0 && (
        <Alert severity="info">
          暂无测试结果，点击上方按钮开始测试
        </Alert>
      )}

      {testResults.map((result, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ mr: 2 }}>
              {result.test}
            </Typography>
            <Alert 
              severity={result.success ? 'success' : 'error'}
              sx={{ minWidth: 'auto' }}
            >
              {result.success ? '成功' : '失败'}
            </Alert>
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            时间: {new Date(result.timestamp).toLocaleString()}
          </Typography>
          
          {result.success ? (
            <Box>
              <Typography variant="body2" gutterBottom>
                响应数据:
              </Typography>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '8px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </Box>
          ) : (
            <Alert severity="error">
              错误: {result.error}
            </Alert>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default ConfigTest;