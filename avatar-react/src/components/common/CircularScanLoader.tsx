import React, { useState } from 'react';
import './CircularScanLoader.css';

interface DataPoint {
  top: string;
  left: string;
  animationDelay: string;
}

interface CircularScanLoaderProps {
  message?: string;
  title?: string;
  subtitle?: string;
}

/**
 * 雷达扫描加载组件
 * 显示科幻风格的雷达扫描加载动画
 */
const CircularScanLoader: React.FC<CircularScanLoaderProps> = ({ 
  message = "欢迎来到星球城市", 
  title = "三元宇宙星球城市空间站", 
  subtitle = "TriMetaverse Star City Station" 
}) => {
  // 生成随机数据点
  const generateDataPoints = (): DataPoint[] => {
    const points: DataPoint[] = [];
    for (let i = 0; i < 15; i++) {
      points.push({
        top: `${Math.random() * 80 + 10}%`,
        left: `${Math.random() * 80 + 10}%`,
        animationDelay: `${Math.random() * 2}s`
      });
    }
    return points;
  };
  
  const [dataPoints] = useState<DataPoint[]>(generateDataPoints());
  
  return (
    <div className="radar-scan-container">
      <div className="scan-starfield"></div>
      
      {/* 装饰性角落元素 */}
      <div className="scan-decoration top-left"></div>
      <div className="scan-decoration top-right"></div>
      <div className="scan-decoration bottom-left"></div>
      <div className="scan-decoration bottom-right"></div>
      
      <h1 className="scan-title">{title}</h1>
      <h3 className="scan-subtitle">{subtitle}</h3>
      
      <div className="radar-scan-wrapper">
        <div className="radar-grid"></div>
        <div className="radar-circles">
          <div className="radar-circle circle-1"></div>
          <div className="radar-circle circle-2"></div>
          <div className="radar-circle circle-3"></div>
        </div>
        
        {/* 雷达扫描光束 */}
        <div className="radar-beam"></div>
        
        {/* 中心点 */}
        <div className="radar-center"></div>
        
        {/* 随机数据点 */}
        {dataPoints.map((point, index) => (
          <div 
            key={index} 
            className="radar-data-point" 
            style={{ 
              top: point.top, 
              left: point.left,
              animationDelay: point.animationDelay
            }}
          ></div>
        ))}
      </div>
      
      <div className="scan-message">
        <div>{message}</div>
      </div>
    </div>
  );
};

export default CircularScanLoader;