import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { detectKeywords } from '../../store/dynamicCardSlice';

interface ChatKeywordDetectorProps {
  messages: any[];
}

const ChatKeywordDetector: React.FC<ChatKeywordDetectorProps> = ({ messages }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // 检测最新消息中的关键词
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      // 只检测用户消息
      if (latestMessage.sender === 'user' || latestMessage.role === 'user') {
        // 检测关键词模式
        const keywordPatterns = [
          '/system', '/conversation', '/knowledge', '/model', 
          '/security', '/logs', '/workflow', '/profile',
          '/help', '/帮助'
        ];
        
        const content = latestMessage.content.toLowerCase();
        
        for (const pattern of keywordPatterns) {
          if (content.includes(pattern)) {
            // 触发信息卡
            if ((window as any).triggerInfoCard) {
              (window as any).triggerInfoCard(pattern);
            }
            
            // 也通过Redux触发
            dispatch(detectKeywords({
              text: latestMessage.content,
              messageId: latestMessage.id
            }));
            
            break; // 只触发第一个匹配的关键词
          }
        }
      }
    }
  }, [messages, dispatch]);

  // 这是一个逻辑组件，不渲染任何UI
  return null;
};

export default ChatKeywordDetector;