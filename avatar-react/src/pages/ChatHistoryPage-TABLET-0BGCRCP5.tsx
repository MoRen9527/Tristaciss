import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import {
  Chat as ChatIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import ChatPanel from '../components/chat/ChatPanel';
import TopNavBar from '../components/navigation/TopNavBar';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { sendMessage, clearMessages } from '../store/chatSlice';

const ChatHistoryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { messages } = useAppSelector(state => state.chat);
  const sessions = []; // 临时空数组，后续可以实现会话管理
  const currentSession = null; // 临时为null
  const [showHistory, setShowHistory] = useState(true);

  const handleNewChat = () => {
    dispatch(clearMessages());
  };

  const handleSelectSession = (sessionId: string) => {
    console.log('选择会话:', sessionId);
  };

  const handleDeleteSession = (sessionId: string) => {
    console.log('删除会话:', sessionId);
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#001428',
      backgroundImage: `
        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)
      `,
    }}>
      {/* 顶部导航 */}
      <TopNavBar />
      
      {/* 主要内容区域 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        p: 2,
        gap: 2
      }}>
        {/* 左侧会话历史 */}
        {showHistory && (
          <Paper sx={{ 
            width: 300,
            backgroundColor: 'rgba(0, 20, 40, 0.8)',
            border: '1px solid rgba(57, 255, 20, 0.3)',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* 会话历史头部 */}
            <Box sx={{ 
              p: 2, 
              borderBottom: '1px solid rgba(57, 255, 20, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Typography variant="h6" sx={{ 
                color: '#39ff14',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <HistoryIcon />
                聊天历史
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleNewChat}
                sx={{ color: '#00ffff' }}
              >
                <AddIcon />
              </IconButton>
            </Box>
            
            {/* 会话列表 */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <List sx={{ p: 0 }}>
                {sessions.map((session) => (
                  <ListItem
                    key={session.id}
                    button
                    selected={currentSession?.id === session.id}
                    onClick={() => handleSelectSession(session.id)}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(57, 255, 20, 0.1)',
                        borderLeft: '3px solid #39ff14',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(57, 255, 20, 0.05)',
                      },
                    }}
                  >
                    <ListItemIcon>
                      <ChatIcon sx={{ color: '#00ffff' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography sx={{ 
                          color: '#fff',
                          fontSize: '0.9rem',
                          fontWeight: currentSession?.id === session.id ? 'bold' : 'normal'
                        }}>
                          {session.title}
                        </Typography>
                      }
                      secondary={
                        <Typography sx={{ 
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '0.7rem'
                        }}>
                          {new Date(session.updatedAt).toLocaleString()}
                        </Typography>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      sx={{ color: '#ff6b6b' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
                
                {sessions.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography sx={{ 
                          color: 'rgba(255, 255, 255, 0.5)',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          暂无聊天记录
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          </Paper>
        )}
        
        {/* 右侧聊天区域 */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minWidth: 0 // 防止flex子项溢出
        }}>
          {/* 聊天面板 */}
          <Paper sx={{ 
            flex: 1,
            backgroundColor: 'rgba(0, 20, 40, 0.8)',
            border: '1px solid rgba(57, 255, 20, 0.3)',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <ChatPanel />
          </Paper>
          
          {/* 底部状态栏 */}
          <Box sx={{ 
            mt: 1, 
            p: 1,
            backgroundColor: 'rgba(0, 20, 40, 0.6)',
            border: '1px solid rgba(57, 255, 20, 0.2)',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                label={`会话: ${sessions.length}`}
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(57, 255, 20, 0.2)',
                  color: '#39ff14'
                }}
              />
              <Chip 
                label={`消息: ${currentSession?.messages.length || 0}`}
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(0, 255, 255, 0.2)',
                  color: '#00ffff'
                }}
              />
            </Box>
            
            <IconButton
              size="small"
              onClick={() => setShowHistory(!showHistory)}
              sx={{ color: '#39ff14' }}
            >
              <SettingsIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatHistoryPage;