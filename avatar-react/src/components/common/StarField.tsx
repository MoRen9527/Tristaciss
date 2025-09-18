import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface StarFieldProps {
  starCount?: number;
}

const StarField: React.FC<StarFieldProps> = ({ starCount = 100 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 清除现有的星星
    container.innerHTML = '';

    // 创建星星
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      
      // 随机位置
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      
      // 随机大小
      const size = Math.random() * 3 + 1;
      
      // 随机动画延迟
      const delay = Math.random() * 3;
      
      star.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        background: #fff;
        border-radius: 50%;
        animation: twinkle ${2 + Math.random() * 2}s infinite ${delay}s;
        box-shadow: 0 0 ${size * 2}px rgba(255, 255, 255, 0.8);
      `;
      
      container.appendChild(star);
    }

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes twinkle {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [starCount]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default StarField;