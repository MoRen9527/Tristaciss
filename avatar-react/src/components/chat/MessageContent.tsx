import React from 'react';
import { Box, Typography } from '@mui/material';
import { Psychology as ThinkIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MessageContentProps {
  content: string;
  sender: 'user' | 'ai';
}

const MessageContent: React.FC<MessageContentProps> = ({ content, sender }) => {
  // 处理思考标签的函数 - 支持部分内容（打字机效果）
  const processThinkingContent = (text: string) => {
    // 更智能的处理方式，支持不完整的标签
    const result: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // 查找所有可能的思考标签开始位置
    const thinkStartRegex = /(<think>|◁think▷)/gi;
    let match;
    
    while ((match = thinkStartRegex.exec(text)) !== null) {
      const startTag = match[0];
      const startIndex = match.index;
      const contentStart = startIndex + startTag.length;
      
      // 添加开始标签之前的普通内容
      if (startIndex > currentIndex) {
        const beforeContent = text.substring(currentIndex, startIndex);
        if (beforeContent.trim()) {
          result.push(
            <Typography 
              key={`before-${startIndex}`}
              variant="body1" 
              component="span"
              sx={{ 
                whiteSpace: 'pre-wrap',
                color: '#fff',
                lineHeight: 1.5
              }}
            >
              {beforeContent}
            </Typography>
          );
        }
      }
      
      // 查找对应的结束标签
      const endTag = startTag === '<think>' ? '</think>' : '◁think▷';
      const endIndex = text.indexOf(endTag, contentStart);
      
      if (endIndex !== -1) {
        // 找到完整的思考块
        const thinkContent = text.substring(contentStart, endIndex);
        result.push(
          <Box 
            key={`think-${startIndex}`}
            sx={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 1, 
              my: 1,
              p: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '3px',
                backgroundColor: 'rgba(156, 39, 176, 0.6)',
                borderRadius: '0 2px 2px 0'
              }
            }}
          >
            <ThinkIcon 
              sx={{ 
                color: 'rgba(156, 39, 176, 0.8)',
                fontSize: '1.1rem',
                mt: 0.1,
                filter: 'drop-shadow(0 0 3px rgba(156, 39, 176, 0.4))'
              }} 
            />
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.65)',
                fontSize: '0.85rem',
                lineHeight: 1.4,
                fontStyle: 'italic',
                whiteSpace: 'pre-wrap'
              }}
            >
              {thinkContent}
            </Typography>
            <ThinkIcon 
              sx={{ 
                color: 'rgba(156, 39, 176, 0.8)',
                fontSize: '1.1rem',
                mt: 0.1,
                filter: 'drop-shadow(0 0 3px rgba(156, 39, 176, 0.4))'
              }} 
            />
          </Box>
        );
        currentIndex = endIndex + endTag.length;
      } else {
        // 没有找到结束标签，可能是打字机效果中的不完整内容
        const partialContent = text.substring(startIndex);
        
        // 检查是否只是开始标签，没有内容
        if (partialContent.length <= startTag.length + 10) {
          // 可能还在输入开始标签或刚开始输入内容，暂时显示为普通文本
          result.push(
            <Typography 
              key={`partial-${startIndex}`}
              variant="body1" 
              component="span"
              sx={{ 
                whiteSpace: 'pre-wrap',
                color: '#fff',
                lineHeight: 1.5
              }}
            >
              {partialContent}
            </Typography>
          );
        } else {
          // 有一定内容了，显示为思考块（但可能不完整）
          const thinkContent = text.substring(contentStart);
          result.push(
            <Box 
              key={`partial-think-${startIndex}`}
              sx={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 1, 
                my: 1,
                p: 1.5,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 1,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                opacity: 0.8, // 稍微透明表示不完整
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  backgroundColor: 'rgba(156, 39, 176, 0.6)',
                  borderRadius: '0 2px 2px 0'
                }
              }}
            >
              <ThinkIcon 
                sx={{ 
                  color: 'rgba(156, 39, 176, 0.8)',
                  fontSize: '1.1rem',
                  mt: 0.1,
                  filter: 'drop-shadow(0 0 3px rgba(156, 39, 176, 0.4))'
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.65)',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  fontStyle: 'italic',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {thinkContent}
              </Typography>
            </Box>
          );
        }
        currentIndex = text.length;
        break;
      }
    }
    
    // 添加剩余的普通内容
    if (currentIndex < text.length) {
      const remainingContent = text.substring(currentIndex);
      if (remainingContent.trim()) {
        result.push(
          <Typography 
            key={`remaining-${currentIndex}`}
            variant="body1" 
            component="span"
            sx={{ 
              whiteSpace: 'pre-wrap',
              color: '#fff',
              lineHeight: 1.5
            }}
          >
            {remainingContent}
          </Typography>
        );
      }
    }
    
    return result.length > 0 ? result : [
      <Typography 
        key="fallback"
        variant="body1" 
        sx={{ 
          whiteSpace: 'pre-wrap',
          color: '#fff',
          lineHeight: 1.5
        }}
      >
        {text}
      </Typography>
    ];
  };

  // 如果是AI消息且包含思考标签，进行特殊处理
  if (sender === 'ai' && (content.includes('<think>') || content.includes('◁think▷'))) {
    return (
      <Box>
        {processThinkingContent(content)}
      </Box>
    );
  }

  // 普通消息 - 对AI消息使用Markdown渲染，用户消息保持原样
  if (sender === 'ai') {
    return (
      <Box sx={{ 
        color: '#fff',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        maxWidth: '100%',
        '& p': { 
          margin: '0.5em 0', 
          lineHeight: 1.5,
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        },
        '& h1, & h2, & h3, & h4, & h5, & h6': { 
          color: '#00ffff', 
          margin: '1em 0 0.5em 0',
          textShadow: '0 0 5px rgba(0, 255, 255, 0.5)'
        },
        '& code': { 
          backgroundColor: 'rgba(0, 255, 255, 0.1)',
          color: '#00ffff',
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '0.9em'
        },
        '& pre': { 
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '5px',
          padding: '1em',
          overflow: 'auto',
          margin: '1em 0'
        },
        '& pre code': {
          backgroundColor: 'transparent',
          padding: 0
        },
        '& blockquote': {
          borderLeft: '3px solid rgba(0, 255, 255, 0.5)',
          paddingLeft: '1em',
          margin: '1em 0',
          fontStyle: 'italic',
          opacity: 0.8
        },
        '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
        '& li': { margin: '0.25em 0' },
        '& strong': { color: '#39ff14', fontWeight: 'bold' },
        '& em': { color: '#ff9800', fontStyle: 'italic' },
        '& a': { 
          color: '#00ffff', 
          textDecoration: 'underline',
          '&:hover': { textShadow: '0 0 5px rgba(0, 255, 255, 0.8)' }
        },
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
          margin: '1em 0',
          border: '1px solid rgba(0, 255, 255, 0.3)'
        },
        '& th, & td': {
          border: '1px solid rgba(0, 255, 255, 0.2)',
          padding: '0.5em',
          textAlign: 'left'
        },
        '& th': {
          backgroundColor: 'rgba(0, 255, 255, 0.1)',
          fontWeight: 'bold'
        }
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </Box>
    );
  }

  // 用户消息保持原样，但添加更好的文本换行处理
  return (
    <Typography 
      variant="body1" 
      sx={{ 
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        color: '#fff',
        lineHeight: 1.5,
        maxWidth: '100%'
      }}
    >
      {content}
    </Typography>
  );
};

export default MessageContent;