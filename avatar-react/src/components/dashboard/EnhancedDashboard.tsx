import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import Dashboard from './Dashboard';
import InfoCardSystem from '../cards/InfoCardSystem';

const EnhancedDashboard: React.FC = () => {
  const [keywordTriggered, setKeywordTriggered] = useState<string | null>(null);

  const handleKeywordTrigger = (keyword: string) => {
    setKeywordTriggered(keyword);
    // 清除提示
    setTimeout(() => {
      setKeywordTriggered(null);
    }, 3000);
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 标题区域 */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid rgba(57, 255, 20, 0.2)',
        backgroundColor: 'rgba(0, 20, 40, 0.8)'
      }}>
        <Typography variant="h5" sx={{ 
          color: '#39ff14',
          textShadow: '0 0 10px rgba(57, 255, 20, 0.7)',
          textAlign: 'center'
        }}>
          🧠 赛博大脑 - 增强版
        </Typography>
        {keywordTriggered && (
          <Typography variant="caption" sx={{ 
            color: '#00ffff',
            display: 'block',
            textAlign: 'center',
            mt: 1
          }}>
            ✨ 已触发关键字: {keywordTriggered}
          </Typography>
        )}
      </Box>

      {/* 主要内容区域 */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* 左侧：原有仪表盘 */}
        <Box sx={{ 
          width: '60%',
          borderRight: '1px solid rgba(57, 255, 20, 0.2)',
          overflow: 'hidden'
        }}>
          <Dashboard />
        </Box>

        {/* 右侧：信息卡系统 */}
        <Box sx={{ 
          width: '40%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            p: 2, 
            borderBottom: '1px solid rgba(57, 255, 20, 0.2)',
            backgroundColor: 'rgba(0, 20, 40, 0.6)'
          }}>
            <Typography variant="h6" sx={{ 
              color: '#00ffff',
              textAlign: 'center'
            }}>
              📊 信息卡中心
            </Typography>
          </Box>
          
          <Box sx={{ 
            flex: 1,
            p: 2,
            overflow: 'hidden'
          }}>
            <InfoCardSystem onKeywordTrigger={handleKeywordTrigger} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EnhancedDashboard;