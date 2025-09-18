import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Typography,
  Tooltip
} from '@mui/material';
import {
  Person as SingleChatIcon,
  Group as GroupChatIcon
} from '@mui/icons-material';
import { setChatMode } from '../../store/chatSlice';
import { pushCard } from '../../store/dynamicCardSlice';
import { RootState, AppDispatch } from '../../store';

interface ChatModeToggleProps {
  disabled?: boolean;
  className?: string;
}

const ChatModeToggle: React.FC<ChatModeToggleProps> = ({ disabled = false, className = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  const chatMode = useSelector((state: RootState) => state.chat.chatMode);

  const handleModeChange = (event: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (newMode !== null) {
      dispatch(setChatMode(newMode));
      
      // 当切换到群聊模式时，显示模型选择信息卡
      if (newMode === 'group') {
        dispatch(pushCard({
          cardType: 'groupChat',
          trigger: '用户切换到群聊模式',
          timestamp: Date.now()
        }));
      }
    }
  };

  return (
    <Box className={`chat-mode-toggle ${className}`}>
      <ToggleButtonGroup
        value={chatMode}
        exclusive
        onChange={handleModeChange}
        size="small"
        disabled={disabled}
        sx={{
          '& .MuiToggleButton-root': {
            color: 'var(--primary-color)',
            borderColor: 'rgba(0, 229, 255, 0.3)',
            backgroundColor: 'rgba(0, 229, 255, 0.05)',
            minWidth: 80,
            height: 36,
            '&:hover': {
              backgroundColor: 'rgba(0, 229, 255, 0.1)',
              borderColor: 'rgba(0, 229, 255, 0.5)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(0, 229, 255, 0.2)',
              borderColor: 'var(--primary-color)',
              boxShadow: '0 0 8px rgba(0, 229, 255, 0.3)',
              color: 'var(--primary-color)',
              '&:hover': {
                backgroundColor: 'rgba(0, 229, 255, 0.25)',
              },
            },
            '&.Mui-disabled': {
              color: 'rgba(0, 229, 255, 0.3)',
              borderColor: 'rgba(0, 229, 255, 0.1)',
            },
          },
          '& .MuiToggleButtonGroup-grouped': {
            '&:not(:first-of-type)': {
              borderLeft: '1px solid rgba(0, 229, 255, 0.3)',
              marginLeft: 0,
            },
            '&:first-of-type': {
              borderRadius: '6px 0 0 6px',
            },
            '&:last-of-type': {
              borderRadius: '0 6px 6px 0',
            },
          },
        }}
      >
        <Tooltip title="单AI对话模式" placement="bottom">
          <ToggleButton value="single" aria-label="单聊模式">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <SingleChatIcon sx={{ fontSize: 18 }} />
              <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                单聊
              </Typography>
            </Box>
          </ToggleButton>
        </Tooltip>
        
        <Tooltip title="多AI并发对话模式" placement="bottom">
          <ToggleButton value="group" aria-label="群聊模式">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <GroupChatIcon sx={{ fontSize: 18 }} />
              <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                群聊
              </Typography>
            </Box>
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Box>
  );
};

export default ChatModeToggle;