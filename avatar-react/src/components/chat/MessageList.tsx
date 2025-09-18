import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAppSelector } from '../../hooks/redux';

interface MessageListProps {}

const MessageList: React.FC<MessageListProps> = () => {
  const messages = useAppSelector(state => state.chat.messages);

  return (
    <Box>
      <Typography variant="h6">Messages</Typography>
      {messages.map((message) => (
        <Box key={message.id}>
          <Typography>{message.content}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export default MessageList;