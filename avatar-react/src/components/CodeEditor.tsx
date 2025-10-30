import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';

// 自定义滚动条样式
const ScrollableBox = styled(Box)(({ theme }) => ({
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f1f1f1',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.mode === 'dark' ? '#555' : '#888',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.palette.mode === 'dark' ? '#777' : '#555',
  },
}));

interface ApiResponse {
  success: boolean;
  code?: string;
  explanation?: string;
  error?: string;
  detail?: string;
}

const CodeEditor: React.FC = () => {
  const [code, setCode] = useState<string>('# 在这里输入你的代码\n\ndef hello_world():\n    print("Hello, World!")');
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');

  const handleCodeGeneration = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError('请先输入代码生成提示');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/cline/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          language: 'python'
        }),
      });

      const data: ApiResponse = await response.json();
      console.log('代码生成响应:', data); // 添加调试日志
      
      if (data.success && data.code) {
        setCode(data.code);
        setPrompt(''); // 清空提示输入框
      } else {
        console.error('响应数据:', data);
        setError(data.error || data.detail || '代码生成失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError('网络错误: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeExplanation = async (): Promise<void> => {
    if (!code.trim()) {
      setError('请先输入代码');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/cline/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setOutput(data.explanation || '');
      } else {
        setError(data.explanation || '解释代码失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError('网络错误: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 240px)', // 增加底部空余空间
        display: 'flex',
        flexDirection: 'row',
        gap: 2,
        padding: 2,
        marginBottom: 2 // 添加底部边距
      }}
    >
      {/* 左侧：代码编辑器 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          代码编辑器
        </Typography>
        
        <ScrollableBox
          component={Paper}
          sx={{
            flex: 1,
            p: 2,
            backgroundColor: '#1e1e1e',
            overflow: 'auto'
          }}
        >
          <TextField
            multiline
            fullWidth
            value={code}
            onChange={(e) => setCode(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: '14px',
                color: '#d4d4d4',
                backgroundColor: 'transparent',
                '& fieldset': {
                  border: 'none',
                },
              },
              '& .MuiInputBase-input': {
                padding: 0,
              },
            }}
          />
        </ScrollableBox>

        {/* 按钮区域 */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <TextField
            placeholder="输入提示"
            variant="outlined"
            size="small"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleCodeGeneration}
            disabled={isLoading}
          >
            代码补全
          </Button>
          <Button
            variant="outlined"
            onClick={handleCodeExplanation}
            disabled={isLoading}
          >
            解释代码
          </Button>
        </Box>
      </Box>

      {/* 右侧：输出结果 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          输出结果
        </Typography>
        
        <ScrollableBox
          component={Paper}
          sx={{
            flex: 1,
            p: 2,
            backgroundColor: '#2d2d2d', // 深色背景
            overflow: 'auto',
            border: '1px solid #444'
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {isLoading ? (
            <Typography sx={{ color: '#888' }}>
              正在处理中...
            </Typography>
          ) : output ? (
            <Typography
              component="pre"
              sx={{
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: '14px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                color: '#e0e0e0' // 浅色文字适配深色背景
              }}
            >
              {output}
            </Typography>
          ) : (
            <Typography sx={{ color: '#888' }}>
              点击"解释代码"或"代码补全"查看结果
            </Typography>
          )}
        </ScrollableBox>
      </Box>
    </Box>
  );
};

export default CodeEditor;