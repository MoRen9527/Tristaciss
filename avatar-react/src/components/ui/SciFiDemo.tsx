import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  IconButton
} from '@mui/material';
import {
  PlayArrow,
  Settings,
  DataUsage,
  Security,
  Speed,
  Memory
} from '@mui/icons-material';

interface SciFiDemoProps {
  className?: string;
}

const SciFiDemo: React.FC<SciFiDemoProps> = ({ className }) => {
  const [progress, setProgress] = useState(76);
  const [systemStatus, setSystemStatus] = useState('ONLINE');
  const [dataStream, setDataStream] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDataStream(prev => (prev + 1) % 100);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box className={`sci-fi-container ${className}`} sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* 标题区域 */}
        <Grid item xs={12}>
          <Typography variant="h4" className="sci-fi-title" align="center">
            AI 智能管理系统 v2.0
          </Typography>
        </Grid>

        {/* 系统状态面板 */}
        <Grid item xs={12} md={6}>
          <Card className="sci-fi-card">
            <CardContent>
              <Box className="sci-fi-scan-line" />
              <Typography variant="h6" className="glow-text" gutterBottom>
                系统状态监控
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip 
                  label={systemStatus}
                  color="primary"
                  className="sci-fi-button"
                  icon={<Security />}
                />
                <Box sx={{ ml: 2, flex: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    系统运行正常
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  CPU 使用率
                </Typography>
                <Box className="sci-fi-energy-bar">
                  <Box 
                    className="sci-fi-energy-fill"
                    sx={{ width: `${progress}%` }}
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  内存使用率
                </Typography>
                <Box className="sci-fi-energy-bar">
                  <Box 
                    className="sci-fi-energy-fill"
                    sx={{ width: '64%' }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 圆形进度指示器 */}
        <Grid item xs={12} md={6}>
          <Card className="sci-fi-card">
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" className="glow-text" gutterBottom>
                系统分析
              </Typography>
              
              <Box 
                className="sci-fi-progress-circle"
                sx={{ 
                  '--progress': `${progress * 3.6}deg`,
                  mb: 2
                }}
              >
                <Typography className="sci-fi-progress-text">
                  {progress}%
                </Typography>
              </Box>

              <Typography variant="body2" color="textSecondary" align="center">
                AI 模型性能评估完成
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 控制面板 */}
        <Grid item xs={12} md={8}>
          <Card className="sci-fi-panel-enhanced">
            <CardContent>
              <Box className="sci-fi-data-stream" />
              <Typography variant="h6" className="glow-text" gutterBottom>
                控制面板
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="输入指令"
                    placeholder="请输入AI指令..."
                    variant="outlined"
                    className="sci-fi-input"
                    InputProps={{
                      className: "sci-fi-input"
                    }}
                    InputLabelProps={{
                      style: { color: 'rgba(0, 255, 255, 0.7)' }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    className="sci-fi-button"
                    startIcon={<PlayArrow />}
                    sx={{ height: '56px' }}
                  >
                    执行指令
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" gutterBottom className="glow-text">
                  快速操作
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <IconButton className="sci-fi-button" size="small">
                    <Settings />
                  </IconButton>
                  <IconButton className="sci-fi-button" size="small">
                    <DataUsage />
                  </IconButton>
                  <IconButton className="sci-fi-button" size="small">
                    <Speed />
                  </IconButton>
                  <IconButton className="sci-fi-button" size="small">
                    <Memory />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 全息数据显示 */}
        <Grid item xs={12} md={4}>
          <Box className="sci-fi-hologram" sx={{ height: '100%', minHeight: 200 }}>
            <Typography variant="h6" className="glow-text" gutterBottom>
              数据流监控
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="primary">
                实时数据传输: {dataStream}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={dataStream} 
                sx={{ 
                  mt: 1,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#00ffff',
                    boxShadow: '0 0 10px rgba(0, 255, 255, 0.6)'
                  }
                }}
              />
            </Box>

            <Box className="sci-fi-grid" sx={{ height: 80, borderRadius: 1, p: 1 }}>
              <Typography variant="caption" color="textSecondary">
                网络拓扑图
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SciFiDemo;