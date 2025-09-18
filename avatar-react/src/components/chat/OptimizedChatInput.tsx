import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import { IconButton } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import './OptimizedChatInput.css';

interface OptimizedChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress?: (event: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  maxRows?: number;
}

const OptimizedChatInput: React.FC<OptimizedChatInputProps> = memo(({
  value,
  onChange,
  onSend,
  onKeyPress,
  placeholder = '输入您的消息...',
  disabled = false,
  maxRows = 4
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 直接使用props中的value，避免状态同步问题
  const [localValue, setLocalValue] = useState(value);

  // 同步外部value变化
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // 优化的输入处理函数 - 修复首次输入丢失问题
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // 立即更新本地状态，确保输入回显
    setLocalValue(newValue);
    
    // 立即调用onChange，确保父组件状态同步
    onChange(newValue);
    
    // 自动调整高度
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [onChange, maxRows]);

  // 处理复合输入（中文输入法等）
  const [isComposing, setIsComposing] = useState(false);
  
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    const newValue = e.currentTarget.value;
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  // 优化的键盘事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      if (!disabled && localValue.trim()) {
        onSend();
      }
    }
    onKeyPress?.(e);
  }, [disabled, localValue, onSend, onKeyPress, isComposing]);

  // 焦点处理
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // 发送按钮点击处理
  const handleSendClick = useCallback(() => {
    if (!disabled && localValue.trim()) {
      onSend();
      textareaRef.current?.focus();
    }
  }, [disabled, localValue, onSend]);

  return (
    <div className="optimized-input-container">
      <div className="optimized-input-wrapper">
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleInputChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="optimized-chat-input"
          style={{
            maxHeight: `${20 * maxRows}px`,
            borderColor: isFocused ? '#00e5ff' : 'rgba(0, 229, 255, 0.3)',
            boxShadow: isFocused ? '0 0 15px rgba(0, 229, 255, 0.3)' : 'none'
          }}
        />
      </div>
      
      <IconButton
        onClick={handleSendClick}
        disabled={disabled || !localValue.trim()}
        className="optimized-send-button"
      >
        <SendIcon />
      </IconButton>
    </div>
  );
});

OptimizedChatInput.displayName = 'OptimizedChatInput';

export default OptimizedChatInput;