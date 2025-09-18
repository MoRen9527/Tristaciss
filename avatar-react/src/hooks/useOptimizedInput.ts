import { useState, useCallback, useRef, useEffect } from 'react';

interface UseOptimizedInputOptions {
  debounceMs?: number;
  maxLength?: number;
  onValueChange?: (value: string) => void;
}

export const useOptimizedInput = (
  initialValue: string = '',
  options: UseOptimizedInputOptions = {}
) => {
  const { debounceMs = 0, maxLength, onValueChange } = options;
  
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const isComposingRef = useRef(false);

  // 处理输入变化
  const handleChange = useCallback((newValue: string) => {
    // 如果设置了最大长度限制
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    // 立即更新显示值（保证输入响应性）
    setValue(newValue);

    // 如果正在输入中文等复合字符，延迟处理
    if (isComposingRef.current) {
      return;
    }

    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 如果设置了防抖，使用防抖处理
    if (debounceMs > 0) {
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedValue(newValue);
        onValueChange?.(newValue);
      }, debounceMs);
    } else {
      // 没有防抖，立即处理
      setDebouncedValue(newValue);
      onValueChange?.(newValue);
    }
  }, [maxLength, debounceMs, onValueChange]);

  // 处理复合输入开始（如中文输入法）
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  // 处理复合输入结束
  const handleCompositionEnd = useCallback((newValue: string) => {
    isComposingRef.current = false;
    handleChange(newValue);
  }, [handleChange]);

  // 重置值
  const reset = useCallback(() => {
    setValue('');
    setDebouncedValue('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // 设置值（外部调用）
  const updateValue = useCallback((newValue: string) => {
    setValue(newValue);
    setDebouncedValue(newValue);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    value,
    debouncedValue,
    handleChange,
    handleCompositionStart,
    handleCompositionEnd,
    reset,
    updateValue,
    isEmpty: value.trim().length === 0,
    length: value.length
  };
};