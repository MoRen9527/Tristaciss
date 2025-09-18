/**
 * 科幻风格工具函数
 * 用于为现有组件添加科幻风格的样式和效果
 */

import { SxProps, Theme } from '@mui/material/styles';

// 科幻风格的颜色配置
export const sciFiColors = {
  primary: '#00ffff',
  secondary: '#39ff14',
  accent: '#ff00ff',
  warning: '#ffff00',
  error: '#ff0000',
  success: '#39ff14',
  background: {
    dark: 'rgba(0, 20, 40, 0.95)',
    medium: 'rgba(0, 30, 60, 0.9)',
    light: 'rgba(0, 40, 80, 0.8)',
    transparent: 'rgba(0, 20, 40, 0.6)',
  },
  glow: {
    cyan: 'rgba(0, 255, 255, 0.6)',
    green: 'rgba(57, 255, 20, 0.6)',
    magenta: 'rgba(255, 0, 255, 0.6)',
    yellow: 'rgba(255, 255, 0, 0.6)',
  }
};

// 科幻风格的渐变背景
export const sciFiGradients = {
  primary: `linear-gradient(135deg, 
    ${sciFiColors.background.dark} 0%,
    ${sciFiColors.background.medium} 50%,
    ${sciFiColors.background.dark} 100%
  )`,
  chat: `linear-gradient(135deg, 
    rgba(0, 20, 40, 0.95) 0%,
    rgba(0, 30, 60, 0.9) 50%,
    rgba(0, 20, 40, 0.95) 100%
  )`,
  dashboard: `linear-gradient(135deg, 
    rgba(20, 0, 40, 0.95) 0%,
    rgba(30, 0, 60, 0.9) 50%,
    rgba(20, 0, 40, 0.95) 100%
  )`,
  button: `linear-gradient(135deg, 
    rgba(0, 255, 255, 0.2) 0%,
    rgba(0, 255, 255, 0.1) 100%
  )`,
  buttonHover: `linear-gradient(135deg, 
    rgba(0, 255, 255, 0.3) 0%,
    rgba(0, 255, 255, 0.2) 100%
  )`,
};

// 科幻风格的边框样式
export const sciFiBorders = {
  primary: `1px solid rgba(0, 255, 255, 0.3)`,
  secondary: `1px solid rgba(57, 255, 20, 0.3)`,
  accent: `1px solid rgba(255, 0, 255, 0.3)`,
  hover: `1px solid rgba(0, 255, 255, 0.6)`,
  focus: `1px solid rgba(0, 255, 255, 0.8)`,
};

// 科幻风格的阴影效果
export const sciFiShadows = {
  glow: '0 0 20px rgba(0, 255, 255, 0.3)',
  glowHover: '0 0 30px rgba(0, 255, 255, 0.5)',
  glowFocus: '0 0 40px rgba(0, 255, 255, 0.7)',
  panel: '0 0 25px rgba(0, 255, 255, 0.2)',
  button: '0 0 15px rgba(0, 255, 255, 0.4)',
  card: '0 0 20px rgba(0, 255, 255, 0.2)',
};

// 科幻风格的文本阴影
export const sciFiTextShadows = {
  primary: '0 0 8px rgba(0, 255, 255, 0.6)',
  secondary: '0 0 8px rgba(57, 255, 20, 0.6)',
  accent: '0 0 8px rgba(255, 0, 255, 0.6)',
  subtle: '0 0 5px rgba(255, 255, 255, 0.3)',
};

/**
 * 获取科幻风格的面板样式
 */
export const getSciFiPanelStyle = (variant: 'chat' | 'dashboard' | 'primary' = 'primary'): SxProps<Theme> => ({
  background: sciFiGradients[variant],
  border: sciFiBorders.primary,
  borderRadius: '12px',
  position: 'relative',
  overflow: 'hidden',
  backdropFilter: 'blur(10px)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: `linear-gradient(90deg, 
      transparent 0%, 
      ${sciFiColors.primary} 20%, 
      ${sciFiColors.secondary} 50%, 
      ${sciFiColors.primary} 80%, 
      transparent 100%
    )`,
    animation: 'sciFiScanLine 3s ease-in-out infinite',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, 
      transparent, 
      rgba(0, 255, 255, 0.05), 
      transparent
    )`,
    animation: 'sciFiShimmer 8s ease-in-out infinite',
    pointerEvents: 'none',
  },
});

/**
 * 获取科幻风格的按钮样式
 */
export const getSciFiButtonStyle = (variant: 'primary' | 'secondary' | 'accent' = 'primary'): SxProps<Theme> => {
  const colorMap = {
    primary: sciFiColors.primary,
    secondary: sciFiColors.secondary,
    accent: sciFiColors.accent,
  };
  
  const color = colorMap[variant];
  
  return {
    background: sciFiGradients.button,
    border: `1px solid ${color}40`,
    color: color,
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      background: sciFiGradients.buttonHover,
      borderColor: `${color}99`,
      boxShadow: `0 0 20px ${color}66`,
      transform: 'translateY(-1px)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: `linear-gradient(90deg, 
        transparent, 
        rgba(255, 255, 255, 0.2), 
        transparent
      )`,
      transition: 'left 0.5s ease',
    },
    '&:hover::before': {
      left: '100%',
    },
  };
};

/**
 * 获取科幻风格的输入框样式
 */
export const getSciFiInputStyle = (): SxProps<Theme> => ({
  '& .MuiOutlinedInput-root': {
    background: sciFiColors.background.dark,
    border: sciFiBorders.primary,
    borderRadius: '8px',
    color: '#ffffff',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: 'rgba(0, 255, 255, 0.5)',
    },
    '&.Mui-focused': {
      borderColor: 'rgba(0, 255, 255, 0.8)',
      boxShadow: sciFiShadows.glowFocus,
    },
    '& fieldset': {
      borderColor: 'rgba(0, 255, 255, 0.3)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(0, 255, 255, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'rgba(0, 255, 255, 0.8)',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(0, 255, 255, 0.7)',
    '&.Mui-focused': {
      color: sciFiColors.primary,
    },
  },
  '& .MuiOutlinedInput-input': {
    color: '#ffffff',
  },
});

/**
 * 获取科幻风格的卡片样式
 */
export const getSciFiCardStyle = (): SxProps<Theme> => ({
  background: sciFiColors.background.light,
  border: sciFiBorders.primary,
  borderRadius: '8px',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    borderColor: 'rgba(0, 255, 255, 0.4)',
    boxShadow: sciFiShadows.card,
    transform: 'translateY(-2px)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: `linear-gradient(90deg, 
      transparent 0%, 
      rgba(0, 255, 255, 0.5) 50%, 
      transparent 100%
    )`,
    animation: 'sciFiCardGlow 3s ease-in-out infinite',
  },
});

/**
 * 获取科幻风格的芯片/标签样式
 */
export const getSciFiChipStyle = (variant: 'primary' | 'success' | 'warning' | 'error' = 'primary'): SxProps<Theme> => {
  const colorMap = {
    primary: sciFiColors.primary,
    success: sciFiColors.success,
    warning: sciFiColors.warning,
    error: sciFiColors.error,
  };
  
  const color = colorMap[variant];
  
  return {
    background: `${color}1A`,
    border: `1px solid ${color}4D`,
    color: color,
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: `${color}33`,
      borderColor: `${color}80`,
      boxShadow: `0 0 15px ${color}4D`,
    },
  };
};

/**
 * 获取科幻风格的图标样式
 */
export const getSciFiIconStyle = (variant: 'primary' | 'secondary' | 'accent' | 'ai' | 'user' = 'primary'): SxProps<Theme> => {
  const colorMap = {
    primary: sciFiColors.primary,
    secondary: sciFiColors.secondary,
    accent: sciFiColors.accent,
    ai: sciFiColors.accent,
    user: sciFiColors.secondary,
  };
  
  const color = colorMap[variant];
  
  return {
    color: color,
    filter: `drop-shadow(0 0 5px ${color}80)`,
    transition: 'all 0.3s ease',
    '&:hover': {
      color: variant === 'primary' ? sciFiColors.secondary : sciFiColors.primary,
      filter: `drop-shadow(0 0 8px ${variant === 'primary' ? sciFiColors.secondary : sciFiColors.primary}B3)`,
      transform: 'scale(1.1)',
    },
  };
};

/**
 * 获取科幻风格的文本样式
 */
export const getSciFiTextStyle = (variant: 'primary' | 'secondary' | 'accent' | 'normal' = 'normal'): SxProps<Theme> => {
  const styleMap = {
    primary: {
      color: sciFiColors.primary,
      textShadow: sciFiTextShadows.primary,
    },
    secondary: {
      color: sciFiColors.secondary,
      textShadow: sciFiTextShadows.secondary,
    },
    accent: {
      color: sciFiColors.accent,
      textShadow: sciFiTextShadows.accent,
    },
    normal: {
      color: '#ffffff',
      textShadow: sciFiTextShadows.subtle,
    },
  };
  
  return styleMap[variant];
};

/**
 * 获取科幻风格的消息气泡样式
 */
export const getSciFiMessageBubbleStyle = (type: 'user' | 'ai' | 'system' = 'system'): SxProps<Theme> => {
  const styleMap = {
    user: {
      background: 'rgba(0, 80, 40, 0.8)',
      borderColor: 'rgba(57, 255, 20, 0.2)',
      marginLeft: '20%',
      '&:hover': {
        borderColor: 'rgba(57, 255, 20, 0.4)',
        boxShadow: '0 0 15px rgba(57, 255, 20, 0.2)',
      },
    },
    ai: {
      background: 'rgba(40, 0, 80, 0.8)',
      borderColor: 'rgba(255, 0, 255, 0.2)',
      marginRight: '20%',
      '&:hover': {
        borderColor: 'rgba(255, 0, 255, 0.4)',
        boxShadow: '0 0 15px rgba(255, 0, 255, 0.2)',
      },
    },
    system: {
      background: 'rgba(0, 40, 80, 0.8)',
      borderColor: 'rgba(0, 255, 255, 0.2)',
      '&:hover': {
        borderColor: 'rgba(0, 255, 255, 0.4)',
        boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)',
      },
    },
  };
  
  return {
    position: 'relative',
    border: '1px solid',
    borderRadius: '8px',
    padding: '12px 16px',
    margin: '8px 0',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-1px)',
    },
    ...styleMap[type],
  };
};

/**
 * 应用科幻风格的CSS类名
 */
export const sciFiClassNames = {
  panel: 'chat-panel-sci-fi',
  dashboard: 'dashboard-sci-fi',
  button: 'button-sci-fi',
  input: 'input-field-sci-fi',
  card: 'card-sci-fi',
  chip: 'chip-sci-fi',
  icon: 'icon-sci-fi',
  text: 'text-sci-fi',
  messageBubble: 'message-bubble-sci-fi',
  listItem: 'list-item-sci-fi',
  progress: 'progress-sci-fi',
  loading: 'loading-sci-fi',
  scrollbar: 'scrollbar-sci-fi',
};

/**
 * 组合多个科幻样式类名
 */
export const combineSciFiClasses = (...classes: string[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * 检查是否应该应用科幻风格（可以基于用户设置或主题）
 */
export const shouldApplySciFiStyle = (): boolean => {
  // 这里可以添加逻辑来检查用户设置或主题偏好
  // 目前默认返回 true，表示总是应用科幻风格
  return true;
};

export default {
  colors: sciFiColors,
  gradients: sciFiGradients,
  borders: sciFiBorders,
  shadows: sciFiShadows,
  textShadows: sciFiTextShadows,
  getSciFiPanelStyle,
  getSciFiButtonStyle,
  getSciFiInputStyle,
  getSciFiCardStyle,
  getSciFiChipStyle,
  getSciFiIconStyle,
  getSciFiTextStyle,
  getSciFiMessageBubbleStyle,
  classNames: sciFiClassNames,
  combineSciFiClasses,
  shouldApplySciFiStyle,
};