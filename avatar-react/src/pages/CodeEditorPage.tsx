import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import CodeEditor from '../components/CodeEditor';

const CodeEditorPage = () => {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Container maxWidth="xl" sx={{ mt: 2, mb: 2, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ mb: 2, flexShrink: 0 }}>
          <Typography variant="h4" gutterBottom>
            AI 辅助编程
          </Typography>
          <Typography variant="body1" paragraph>
            使用 Cline 强大的 AI 能力辅助你的编程工作。输入代码，添加提示，获取智能补全和解释。
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <CodeEditor />
        </Box>
      </Container>
    </Box>
  );
};

export default CodeEditorPage;