import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Settings,
  Fullscreen,
  VolumeUp,
  AccountBalanceWallet,
  TrendingUp,
  EmojiEvents,
  Group,
  CheckCircle,
  AccountBalance,
  Security,
} from '@mui/icons-material';

interface GameStats {
  level: number;
  experience: number;
  coins: number;
  energy: number;
  score: number;
}

interface Player {
  x: number;
  y: number;
  z: number;
  rotation: number;
  health: number;
  speed: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  speed: number;
  active: boolean;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  z: number;
  health: number;
  speed: number;
  type: 'fighter' | 'bomber' | 'scout';
  lastShot: number;
  active: boolean;
}

interface EnemyBullet {
  id: number;
  x: number;
  y: number;
  speed: number;
  active: boolean;
}

interface WalletInfo {
  address: string;
  balance: {
    eth: number;
    usdt: number;
    gameToken: number;
  };
  connected: boolean;
  network: string;
}

interface WalletProvider {
  name: string;
  icon: string;
  description: string;
}

const GameFiPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [volume, setVolume] = useState(50);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  
  const [gameStats, setGameStats] = useState<GameStats>({
    level: 1,
    experience: 750,
    coins: 12450,
    energy: 85,
    score: 98750,
  });

  const [player, setPlayer] = useState<Player>({
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    health: 100,
    speed: 1,
  });

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<EnemyBullet[]>([]);
  const [lastShot, setLastShot] = useState(0);
  const [gameLevel, setGameLevel] = useState(1);
  const [killCount, setKillCount] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const lastMouseUpdateRef = useRef(0);
  const lastGameUpdateRef = useRef(0);

  const [wallet, setWallet] = useState<WalletInfo>({
    address: '',
    balance: {
      eth: 0,
      usdt: 0,
      gameToken: 0,
    },
    connected: false,
    network: '',
  });

  const walletProviders: WalletProvider[] = [
    {
      name: 'MetaMask',
      icon: '🦊',
      description: '最受欢迎的以太坊钱包'
    },
    {
      name: 'WalletConnect',
      icon: '🔗',
      description: '连接移动端钱包'
    },
    {
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Coinbase官方钱包'
    },
    {
      name: 'Trust Wallet',
      icon: '🛡️',
      description: '安全的多链钱包'
    }
  ];

  // 射击函数 - 使用与渲染相同的位置计算
  const shootBullet = useCallback(() => {
    const now = Date.now();
    if (now - lastShot < 150) return; // 射击间隔150ms
    
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;
    
    // 使用与渲染飞机相同的位置计算，确保子弹从飞机正确位置发射
    const planeX = canvas.width * 0.5 + player.x;
    const planeY = canvas.height * 0.75 + player.y;
    
    const newBullet: Bullet = {
      id: now,
      x: planeX, // 从飞机中心发射
      y: planeY - 25, // 从飞机前端发射
      speed: 8,
      active: true
    };
    
    setBullets(prev => [...prev, newBullet]);
    setLastShot(now);
  }, [player.x, player.y, lastShot, isPlaying]);

  // 连续射击逻辑 - 优化以避免与鼠标移动冲突
  useEffect(() => {
    let shootInterval: NodeJS.Timeout | null = null;
    
    if (isMouseDown && isPlaying) {
      // 立即射击一次
      shootBullet();
      
      // 然后开始连续射击
      shootInterval = setInterval(() => {
        if (isPlaying) { // 额外检查游戏状态
          shootBullet();
        }
      }, 150);
    }
    
    return () => {
      if (shootInterval) {
        clearInterval(shootInterval);
        shootInterval = null;
      }
    };
  }, [isMouseDown, isPlaying, shootBullet]);

  // 键盘控制 - 使用更平滑的移动
  useEffect(() => {
    const keys = new Set<string>();
    let moveInterval: NodeJS.Timeout;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      
      if (e.key === ' ') {
        e.preventDefault();
        shootBullet();
        return;
      }
      
      keys.add(e.key.toLowerCase());
      
      if (!moveInterval) {
        moveInterval = setInterval(() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          
          const moveSpeed = 8;
          const maxX = canvas.width * 0.4;
          const maxY = canvas.height * 0.25; // 扩大键盘控制的上下移动范围
          
          setPlayer(prev => {
            let newX = prev.x;
            let newY = prev.y;
            
            if (keys.has('arrowleft') || keys.has('a')) {
              newX = Math.max(-maxX, prev.x - moveSpeed);
            }
            if (keys.has('arrowright') || keys.has('d')) {
              newX = Math.min(maxX, prev.x + moveSpeed);
            }
            if (keys.has('arrowup') || keys.has('w')) {
              newY = Math.max(-maxY, prev.y - moveSpeed);
            }
            if (keys.has('arrowdown') || keys.has('s')) {
              newY = Math.min(maxY, prev.y + moveSpeed);
            }
            
            // 键盘控制直接更新state，无需ref同步
            
            return { ...prev, x: newX, y: newY };
          });
        }, 16); // 60fps
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      
      if (keys.size === 0 && moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null as any;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (moveInterval) {
        clearInterval(moveInterval);
      }
    };
  }, [isPlaying, shootBullet]);

  // 移除复杂的状态同步逻辑，直接使用state确保实时响应

  // 游戏渲染逻辑
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布大小
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 射击飞机游戏渲染
    const render = (time: number) => {
      if (!ctx || !canvas || canvas.width <= 0 || canvas.height <= 0) return;

      // 清空画布
      ctx.fillStyle = 'linear-gradient(0deg, #001122 0%, #003366 100%)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制云朵背景
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      for (let i = 0; i < 20; i++) {
        const x = ((time * 0.0005 + i * 0.3) % 1) * canvas.width * 1.2 - canvas.width * 0.1;
        const y = (Math.sin(i * 0.7) * 0.3 + 0.3) * canvas.height;
        const size = 30 + Math.sin(i * 0.5) * 20;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.arc(x + size * 0.7, y, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.arc(x - size * 0.7, y, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // 绘制玩家战斗机 - 直接使用player位置，确保实时同步
      const planeX = canvas.width * 0.5 + player.x;
      const planeY = canvas.height * 0.75 + player.y;
      
      // 战斗机主体 - 更真实的F-16造型
      ctx.fillStyle = '#00dd00';
      ctx.beginPath();
      // 机头
      ctx.moveTo(planeX, planeY - 30);
      ctx.lineTo(planeX - 4, planeY - 20);
      ctx.lineTo(planeX - 6, planeY - 10);
      // 左侧机身
      ctx.lineTo(planeX - 8, planeY + 5);
      ctx.lineTo(planeX - 6, planeY + 20);
      // 机尾
      ctx.lineTo(planeX - 3, planeY + 25);
      ctx.lineTo(planeX + 3, planeY + 25);
      // 右侧机身
      ctx.lineTo(planeX + 6, planeY + 20);
      ctx.lineTo(planeX + 8, planeY + 5);
      ctx.lineTo(planeX + 6, planeY - 10);
      ctx.lineTo(planeX + 4, planeY - 20);
      ctx.closePath();
      ctx.fill();
      
      // 主机翼
      ctx.fillStyle = '#00bb00';
      ctx.beginPath();
      ctx.moveTo(planeX - 25, planeY - 2);
      ctx.lineTo(planeX - 8, planeY - 8);
      ctx.lineTo(planeX - 8, planeY + 2);
      ctx.lineTo(planeX - 20, planeY + 8);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(planeX + 25, planeY - 2);
      ctx.lineTo(planeX + 8, planeY - 8);
      ctx.lineTo(planeX + 8, planeY + 2);
      ctx.lineTo(planeX + 20, planeY + 8);
      ctx.closePath();
      ctx.fill();
      
      // 尾翼
      ctx.fillStyle = '#009900';
      ctx.beginPath();
      ctx.moveTo(planeX - 3, planeY + 15);
      ctx.lineTo(planeX - 8, planeY + 12);
      ctx.lineTo(planeX - 8, planeY + 18);
      ctx.lineTo(planeX - 3, planeY + 20);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(planeX + 3, planeY + 15);
      ctx.lineTo(planeX + 8, planeY + 12);
      ctx.lineTo(planeX + 8, planeY + 18);
      ctx.lineTo(planeX + 3, planeY + 20);
      ctx.closePath();
      ctx.fill();
      
      // 垂直尾翼
      ctx.fillStyle = '#007700';
      ctx.beginPath();
      ctx.moveTo(planeX - 2, planeY + 20);
      ctx.lineTo(planeX, planeY + 10);
      ctx.lineTo(planeX + 2, planeY + 20);
      ctx.lineTo(planeX, planeY + 25);
      ctx.closePath();
      ctx.fill();
      
      // 驾驶舱
      ctx.fillStyle = '#0088ff';
      ctx.beginPath();
      ctx.arc(planeX, planeY - 15, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // 引擎火焰效果
      if (isPlaying) {
        const flameColors = ['#ff4400', '#ff6600', '#ffaa00', '#ffdd00'];
        const flameColor = flameColors[Math.floor(Math.random() * flameColors.length)];
        ctx.fillStyle = flameColor;
        
        // 左引擎火焰
        ctx.beginPath();
        ctx.moveTo(planeX - 3, planeY + 25);
        ctx.lineTo(planeX - 5, planeY + 30 + Math.random() * 8);
        ctx.lineTo(planeX - 1, planeY + 28 + Math.random() * 6);
        ctx.closePath();
        ctx.fill();
        
        // 右引擎火焰
        ctx.beginPath();
        ctx.moveTo(planeX + 3, planeY + 25);
        ctx.lineTo(planeX + 5, planeY + 30 + Math.random() * 8);
        ctx.lineTo(planeX + 1, planeY + 28 + Math.random() * 6);
        ctx.closePath();
        ctx.fill();
      }

      // 绘制玩家子弹
      ctx.fillStyle = '#ffff00';
      bullets.forEach(bullet => {
        if (bullet.active) {
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
          ctx.fill();
          // 子弹轨迹
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bullet.x, bullet.y);
          ctx.lineTo(bullet.x, bullet.y + 10);
          ctx.stroke();
        }
      });

      // 绘制敌机
      enemies.forEach(enemy => {
        if (enemy.active) {
          let enemyColor = '#ff4444';
          let enemySize = 15;
          
          switch (enemy.type) {
            case 'fighter':
              enemyColor = '#ff4444';
              enemySize = 12;
              break;
            case 'bomber':
              enemyColor = '#ff8844';
              enemySize = 20;
              break;
            case 'scout':
              enemyColor = '#ff44ff';
              enemySize = 10;
              break;
          }
          
          // 敌机主体 - 倒置的战斗机造型
          ctx.fillStyle = enemyColor;
          ctx.beginPath();
          // 机头（向下）
          ctx.moveTo(enemy.x, enemy.y + enemySize * 1.5);
          ctx.lineTo(enemy.x - enemySize * 0.3, enemy.y + enemySize * 0.8);
          ctx.lineTo(enemy.x - enemySize * 0.4, enemy.y + enemySize * 0.3);
          // 左侧机身
          ctx.lineTo(enemy.x - enemySize * 0.5, enemy.y - enemySize * 0.3);
          ctx.lineTo(enemy.x - enemySize * 0.3, enemy.y - enemySize);
          // 机尾
          ctx.lineTo(enemy.x - enemySize * 0.2, enemy.y - enemySize * 1.2);
          ctx.lineTo(enemy.x + enemySize * 0.2, enemy.y - enemySize * 1.2);
          // 右侧机身
          ctx.lineTo(enemy.x + enemySize * 0.3, enemy.y - enemySize);
          ctx.lineTo(enemy.x + enemySize * 0.5, enemy.y - enemySize * 0.3);
          ctx.lineTo(enemy.x + enemySize * 0.4, enemy.y + enemySize * 0.3);
          ctx.lineTo(enemy.x + enemySize * 0.3, enemy.y + enemySize * 0.8);
          ctx.closePath();
          ctx.fill();
          
          // 敌机机翼
          const wingColor = enemy.type === 'bomber' ? '#cc6633' : enemy.type === 'scout' ? '#cc33cc' : '#cc3333';
          ctx.fillStyle = wingColor;
          
          // 左机翼
          ctx.beginPath();
          ctx.moveTo(enemy.x - enemySize * 1.5, enemy.y);
          ctx.lineTo(enemy.x - enemySize * 0.5, enemy.y - enemySize * 0.5);
          ctx.lineTo(enemy.x - enemySize * 0.5, enemy.y + enemySize * 0.2);
          ctx.lineTo(enemy.x - enemySize * 1.2, enemy.y + enemySize * 0.5);
          ctx.closePath();
          ctx.fill();
          
          // 右机翼
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemySize * 1.5, enemy.y);
          ctx.lineTo(enemy.x + enemySize * 0.5, enemy.y - enemySize * 0.5);
          ctx.lineTo(enemy.x + enemySize * 0.5, enemy.y + enemySize * 0.2);
          ctx.lineTo(enemy.x + enemySize * 1.2, enemy.y + enemySize * 0.5);
          ctx.closePath();
          ctx.fill();
          
          // 血条
          if (enemy.health < (enemy.type === 'bomber' ? 150 : enemy.type === 'fighter' ? 100 : 50)) {
            const maxHealth = enemy.type === 'bomber' ? 150 : enemy.type === 'fighter' ? 100 : 50;
            const barWidth = 25;
            const barHeight = 3;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemySize * 1.5, barWidth, barHeight);
            
            const healthPercent = enemy.health / maxHealth;
            ctx.fillStyle = healthPercent > 0.6 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
            ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemySize * 1.5, barWidth * healthPercent, barHeight);
          }
        }
      });

      // 绘制敌机子弹
      ctx.fillStyle = '#ff6666';
      enemyBullets.forEach(bullet => {
        if (bullet.active) {
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 绘制射击指示器（可选）
      if (isMouseDown && isPlaying) {
        ctx.strokeStyle = 'rgba(255,255,0,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(planeX - 3, planeY - 30);
        ctx.lineTo(planeX - 3, 0);
        ctx.moveTo(planeX + 3, planeY - 30);
        ctx.lineTo(planeX + 3, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (isPlaying) {
        // 每帧都更新游戏逻辑，确保碰撞检测及时
        updateGameLogic(time);
        animationRef.current = requestAnimationFrame(render);
      }
    };

    // 确保游戏循环持续运行
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(render);
    } else {
      // 即使暂停也渲染一帧，显示当前状态
      render(performance.now());
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, player]);

  const handlePlay = () => {
    if (player.health <= 0) {
      // 重新开始游戏 - 完全重置
      resetGameState();
      setTimeout(() => {
        setIsPlaying(true);
      }, 100);
    } else if (!isPlaying) {
      // 开始游戏，立即启动渲染循环
      setIsPlaying(true);
    } else {
      // 暂停游戏（不重置状态）
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    // 完全重置游戏状态
    resetGameState();
  };

  const resetGameState = () => {
    // 重置玩家状态
    setPlayer({
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      health: 100,
      speed: 1,
    });
    
    // 清空战场
    setBullets([]);
    setEnemies([]);
    setEnemyBullets([]);
    
    // 重置游戏统计
    setKillCount(0);
    setGameLevel(1);
    setLastShot(0);
    
    // 重置控制状态
    setIsMouseDown(false);
    
    // 重置计时器
    lastMouseUpdateRef.current = 0;
    lastGameUpdateRef.current = 0;
    
    // 重置游戏分数（保持钱包余额）
    setGameStats(prev => ({
      ...prev,
      level: 1,
      experience: 0,
      score: 0,
      energy: 100,
    }));
  };

  const handleConnectWallet = async (providerName: string) => {
    setConnectingWallet(providerName);
    
    // 模拟连接过程
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟成功连接的钱包数据
      const mockWalletData: WalletInfo = {
        address: '0x' + Math.random().toString(16).substr(2, 40),
        balance: {
          eth: Math.random() * 5 + 0.5,
          usdt: Math.random() * 2000 + 500,
          gameToken: gameStats.coins + Math.random() * 1000,
        },
        connected: true,
        network: 'Ethereum Mainnet',
      };
      
      setWallet(mockWalletData);
      setGameStats(prev => ({
        ...prev,
        coins: mockWalletData.balance.gameToken
      }));
      
      setSnackbarMessage(`✅ ${providerName} 钱包连接成功！`);
      setSnackbarOpen(true);
      setWalletDialogOpen(false);
      
    } catch (error) {
      setSnackbarMessage(`❌ 连接 ${providerName} 失败，请重试`);
      setSnackbarOpen(true);
    } finally {
      setConnectingWallet(null);
    }
  };

  const handleDisconnectWallet = () => {
    setWallet({
      address: '',
      balance: { eth: 0, usdt: 0, gameToken: 0 },
      connected: false,
      network: '',
    });
    setSnackbarMessage('钱包已断开连接');
    setSnackbarOpen(true);
  };

  // 游戏逻辑更新 - 使用useCallback优化性能
  const updateGameLogic = React.useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 更新子弹位置
    setBullets(prev => prev.map(bullet => ({
      ...bullet,
      y: bullet.y - bullet.speed,
      active: bullet.active && bullet.y > -10
    })).filter(bullet => bullet.active));

    // 更新敌机位置
    setEnemies(prev => prev.map(enemy => ({
      ...enemy,
      y: enemy.y + enemy.speed,
      active: enemy.active && enemy.y < canvas.height + 50 && enemy.health > 0
    })).filter(enemy => enemy.active));

    // 更新敌机子弹位置
    setEnemyBullets(prev => prev.map(bullet => ({
      ...bullet,
      y: bullet.y + bullet.speed,
      active: bullet.active && bullet.y < canvas.height + 10
    })).filter(bullet => bullet.active));

    // 生成新敌机
    if (Math.random() < 0.02 + gameLevel * 0.01) {
      const enemyTypes: Array<'fighter' | 'bomber' | 'scout'> = ['fighter', 'bomber', 'scout'];
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      
      const newEnemy: Enemy = {
        id: Date.now() + Math.random(),
        x: Math.random() * (canvas.width - 100) + 50,
        y: -50,
        z: 0,
        health: type === 'bomber' ? 150 : type === 'fighter' ? 100 : 50,
        speed: type === 'scout' ? 3 : type === 'fighter' ? 2 : 1,
        type,
        lastShot: time,
        active: true
      };
      
      setEnemies(prev => [...prev, newEnemy]);
    }

    // 敌机射击
    setEnemies(prev => prev.map(enemy => {
      if (enemy.active && time - enemy.lastShot > (enemy.type === 'fighter' ? 1000 : 2000)) {
        const newBullet: EnemyBullet = {
          id: Date.now() + Math.random(),
          x: enemy.x,
          y: enemy.y + 20,
          speed: 4,
          active: true
        };
        setEnemyBullets(prevBullets => [...prevBullets, newBullet]);
        return { ...enemy, lastShot: time };
      }
      return enemy;
    }));

    // 碰撞检测：玩家子弹 vs 敌机
    setBullets(prevBullets => {
      const newBullets = [...prevBullets];
      setEnemies(prevEnemies => {
        const newEnemies = [...prevEnemies];
        
        newBullets.forEach((bullet, bulletIndex) => {
          if (!bullet.active) return;
          
          newEnemies.forEach((enemy, enemyIndex) => {
            if (!enemy.active) return;
            
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20) {
              newBullets[bulletIndex] = { ...bullet, active: false };
              newEnemies[enemyIndex] = { ...enemy, health: enemy.health - 25 };
              
              if (newEnemies[enemyIndex].health <= 0) {
                newEnemies[enemyIndex] = { ...enemy, active: false };
                
                // 击杀奖励
                const reward = enemy.type === 'bomber' ? 50 : enemy.type === 'fighter' ? 30 : 20;
                setGameStats(prev => ({
                  ...prev,
                  score: prev.score + reward,
                  coins: prev.coins + Math.floor(reward / 10),
                  experience: prev.experience + 5
                }));
                
                setKillCount(prev => prev + 1);
                
                if (wallet.connected) {
                  setWallet(prev => ({
                    ...prev,
                    balance: {
                      ...prev.balance,
                      gameToken: prev.balance.gameToken + Math.floor(reward / 10)
                    }
                  }));
                }
              }
            }
          });
        });
        
        return newEnemies;
      });
      
      return newBullets;
    });

    // 碰撞检测：敌机子弹 vs 玩家 - 直接使用player位置
    setEnemyBullets(prevBullets => {
      const newBullets = [...prevBullets];
      const planeX = canvas.width * 0.5 + player.x;
      const planeY = canvas.height * 0.75 + player.y;
      
      newBullets.forEach((bullet, index) => {
        if (!bullet.active) return;
        
        const dx = bullet.x - planeX;
        const dy = bullet.y - planeY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 25) {
          newBullets[index] = { ...bullet, active: false };
          setPlayer(prev => ({ ...prev, health: Math.max(0, prev.health - 10) }));
        }
      });
      
      return newBullets;
    });

    // 碰撞检测：敌机 vs 玩家 - 直接使用player位置
    const planeX = canvas.width * 0.5 + player.x;
    const planeY = canvas.height * 0.75 + player.y;
    
    setEnemies(prev => prev.map(enemy => {
      if (!enemy.active) return enemy;
      
      const dx = enemy.x - planeX;
      const dy = enemy.y - planeY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 30) {
        setPlayer(prevPlayer => ({ ...prevPlayer, health: Math.max(0, prevPlayer.health - 20) }));
        return { ...enemy, active: false };
      }
      
      return enemy;
    }));

    // 等级提升
    if (killCount > 0 && killCount % 10 === 0 && killCount / 10 > gameLevel - 1) {
      setGameLevel(prev => prev + 1);
      setSnackbarMessage(`🎉 等级提升！当前等级: ${gameLevel + 1}`);
      setSnackbarOpen(true);
    }

    // 游戏结束检测
    if (player.health <= 0 && isPlaying) {
      setIsPlaying(false);
      setSnackbarMessage(`💀 游戏结束！最终得分: ${gameStats.score} | 击杀数: ${killCount} | 等级: ${gameLevel}`);
      setSnackbarOpen(true);
      
      // 停止所有游戏逻辑，但保持当前状态显示，等待玩家点击重新开始
      setIsMouseDown(false);
    }
  }, [gameLevel, killCount, player.health, isPlaying, gameStats.score, wallet.connected]);



  return (
    <Box sx={{ 
      height: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#fff',
      overflow: 'hidden'
    }}>
      {/* 顶部HUD */}
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 10,
        p: 2,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(10px)'
      }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item>
                <Card sx={{ background: 'rgba(0,255,255,0.1)', border: '1px solid #00ffff' }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="#00ffff">等级</Typography>
                    <Typography variant="h6" color="#fff">{gameLevel}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item>
                <Card sx={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff4444' }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="#ff4444">击杀</Typography>
                    <Typography variant="h6" color="#fff">{killCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item>
                <Card sx={{ background: 'rgba(255,215,0,0.1)', border: '1px solid #ffd700' }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="#ffd700">金币</Typography>
                    <Typography variant="h6" color="#fff">{gameStats.coins.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item>
                <Card sx={{ background: 'rgba(0,255,0,0.1)', border: '1px solid #00ff00' }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="#00ff00">分数</Typography>
                    <Typography variant="h6" color="#fff">{gameStats.score.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <IconButton onClick={handlePlay} sx={{ color: isPlaying ? '#ff4444' : '#00ff00' }}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <IconButton 
                onClick={handleStop} 
                sx={{ color: '#ffaa00' }}
                title="停止游戏"
              >
                <Stop />
              </IconButton>
              <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: '#00ffff' }}>
                <Settings />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* 主游戏画布 */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair'
        }}
        onMouseMove={(e) => {
          if (!isPlaying) return;
          
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          // 直接计算飞机位置，不使用节流
          const planeX = (mouseX / rect.width - 0.5) * (rect.width * 0.8);
          const planeY = (mouseY / rect.height - 0.7) * (rect.height * 0.6);
          
          // 限制移动范围
          const maxX = rect.width * 0.4;
          const maxY = rect.height * 0.25;
          const newX = Math.max(-maxX, Math.min(maxX, planeX));
          const newY = Math.max(-maxY, Math.min(maxY, planeY));
          
          // 直接更新state，确保实时响应
          setPlayer(prev => ({ ...prev, x: newX, y: newY }));
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          if (isPlaying) {
            setIsMouseDown(true);
          }
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          setIsMouseDown(false);
        }}
        onMouseLeave={(e) => {
          e.preventDefault();
          setIsMouseDown(false);
        }}
        onContextMenu={(e) => {
          e.preventDefault(); // 防止右键菜单
        }}
        onClick={(e) => {
          e.preventDefault();
          if (isPlaying && !isMouseDown) {
            shootBullet();
          }
        }}
      />

      {/* 右侧状态面板 */}
      <Box sx={{
        position: 'absolute',
        top: 100,
        right: 20,
        width: 250,
        zIndex: 10
      }}>
        <Card sx={{ 
          background: 'rgba(0,0,0,0.8)', 
          border: `1px solid ${wallet.connected ? '#00ff00' : '#00ffff'}`,
          mb: 2
        }}>
          <CardContent>
            <Typography variant="h6" color={wallet.connected ? '#00ff00' : '#00ffff'} gutterBottom>
              <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
              {wallet.connected ? '钱包已连接' : '钱包状态'}
              {wallet.connected && <CheckCircle sx={{ ml: 1, fontSize: 20 }} />}
            </Typography>
            
            {wallet.connected ? (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="#aaa" gutterBottom>
                  地址: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </Typography>
                <Typography variant="body2" color="#fff">ETH: {wallet.balance.eth.toFixed(4)}</Typography>
                <Typography variant="body2" color="#fff">USDT: {wallet.balance.usdt.toFixed(2)}</Typography>
                <Typography variant="body2" color="#fff">游戏代币: {wallet.balance.gameToken.toFixed(0)}</Typography>
                <Typography variant="body2" color="#aaa" sx={{ mt: 1 }}>
                  网络: {wallet.network}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="#aaa">
                  连接钱包以开始游戏并获得奖励
                </Typography>
              </Box>
            )}
            
            {wallet.connected ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ 
                    borderColor: '#ff4444', 
                    color: '#ff4444',
                    '&:hover': { backgroundColor: 'rgba(255,68,68,0.1)' }
                  }}
                  onClick={handleDisconnectWallet}
                >
                  断开连接
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ 
                    borderColor: '#ffd700', 
                    color: '#ffd700',
                    '&:hover': { backgroundColor: 'rgba(255,215,0,0.1)' }
                  }}
                >
                  充值
                </Button>
              </Box>
            ) : (
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ 
                  borderColor: '#00ffff', 
                  color: '#00ffff',
                  '&:hover': { backgroundColor: 'rgba(0,255,255,0.1)' }
                }}
                onClick={() => setWalletDialogOpen(true)}
              >
                连接钱包
              </Button>
            )}
          </CardContent>
        </Card>

        <Card sx={{ 
          background: 'rgba(0,0,0,0.8)', 
          border: '1px solid #ff00ff',
          mb: 2
        }}>
          <CardContent>
            <Typography variant="h6" color="#ff00ff" gutterBottom>
              <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
              实时数据
            </Typography>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="#fff">能量</Typography>
              <LinearProgress 
                variant="determinate" 
                value={gameStats.energy} 
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#00ff00' }
                }}
              />
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="#fff">经验值</Typography>
              <LinearProgress 
                variant="determinate" 
                value={(gameStats.experience % 1000) / 10} 
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#ffd700' }
                }}
              />
            </Box>
            <Box>
              <Typography variant="body2" color="#fff">
                生命值 ({player.health}/100)
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={player.health} 
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': { 
                    backgroundColor: player.health > 50 ? '#00ff00' : player.health > 25 ? '#ffaa00' : '#ff4444'
                  }
                }}
              />
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="#fff">
                游戏状态: {
                  !wallet.connected ? '未连接钱包' :
                  player.health <= 0 ? '游戏结束' :
                  isPlaying ? '游戏中' : '已暂停'
                }
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ 
          background: 'rgba(0,0,0,0.8)', 
          border: '1px solid #ffd700'
        }}>
          <CardContent>
            <Typography variant="h6" color="#ffd700" gutterBottom>
              <EmojiEvents sx={{ mr: 1, verticalAlign: 'middle' }} />
              排行榜
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { name: '玩家001', score: 125000 },
                { name: '玩家002', score: 98750 },
                { name: '你', score: gameStats.score, kills: killCount, level: gameLevel },
                { name: '玩家004', score: 87500 },
                { name: '玩家005', score: 76250 }
              ].sort((a, b) => b.score - a.score).map((playerData, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color={playerData.name === '你' ? '#00ff00' : '#fff'}>
                    {index + 1}. {playerData.name}
                    {playerData.name === '你' && (
                      <Typography component="span" variant="caption" color="#aaa" sx={{ ml: 1 }}>
                        (K:{killCount} L:{gameLevel})
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="body2" color="#ffd700">
                    {playerData.score.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 底部控制面板 */}
      <Box sx={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 10
      }}>
        <Card sx={{ 
          background: 'rgba(0,0,0,0.8)', 
          border: '1px solid #00ffff'
        }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="#00ffff" gutterBottom>
                  {!wallet.connected 
                    ? "连接钱包后即可开始游戏，击败敌机赚取加密货币奖励！"
                    : player.health <= 0 
                      ? "💀 游戏结束！点击'重新开始'按钮开始新游戏" 
                      : "🎮 操作: 鼠标直接控制战机位置，点击/按住鼠标射击，WASD/方向键精确移动，空格键射击"
                  }
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label="射击游戏" 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(0,255,255,0.2)', 
                      color: '#00ffff',
                      opacity: wallet.connected ? 1 : 0.5
                    }} 
                  />
                  <Chip 
                    label="区块链奖励" 
                    size="small" 
                    sx={{ 
                      backgroundColor: wallet.connected ? 'rgba(255,0,255,0.2)' : 'rgba(128,128,128,0.2)', 
                      color: wallet.connected ? '#ff00ff' : '#666'
                    }} 
                  />
                  <Chip 
                    label="代币收益" 
                    size="small" 
                    sx={{ 
                      backgroundColor: wallet.connected ? 'rgba(255,215,0,0.2)' : 'rgba(128,128,128,0.2)', 
                      color: wallet.connected ? '#ffd700' : '#666'
                    }} 
                  />
                  <Chip 
                    label="实时战斗" 
                    size="small" 
                    sx={{ 
                      backgroundColor: wallet.connected ? 'rgba(0,255,0,0.2)' : 'rgba(128,128,128,0.2)', 
                      color: wallet.connected ? '#00ff00' : '#666'
                    }} 
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="#fff">在线玩家: 1,247</Typography>
                  <Group sx={{ color: '#00ffff' }} />
                  <Button 
                    variant="contained" 
                    disabled={!wallet.connected}
                    onClick={handlePlay}
                    sx={{ 
                      background: wallet.connected 
                        ? 'linear-gradient(45deg, #ff00ff, #00ffff)'
                        : 'rgba(128,128,128,0.3)',
                      color: wallet.connected ? '#fff' : '#666',
                      '&:hover': { 
                        background: wallet.connected 
                          ? 'linear-gradient(45deg, #ff44ff, #44ffff)'
                          : 'rgba(128,128,128,0.3)'
                      },
                      '&:disabled': {
                        color: '#666'
                      }
                    }}
                  >
                    {wallet.connected 
                      ? (player.health <= 0 
                          ? '重新开始' 
                          : (isPlaying ? '暂停游戏' : '开始游戏')
                        ) 
                      : '请先连接钱包'
                    }
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* 钱包连接对话框 */}
      <Dialog 
        open={walletDialogOpen} 
        onClose={() => setWalletDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(0,0,0,0.95)',
            border: '1px solid #00ffff',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ color: '#00ffff', textAlign: 'center' }}>
          <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
          选择钱包
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="#aaa" sx={{ mb: 3, textAlign: 'center' }}>
            选择一个钱包提供商来连接到游戏
          </Typography>
          
          <List>
            {walletProviders.map((provider) => (
              <ListItem 
                key={provider.name}
                sx={{ 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0,255,255,0.05)',
                    borderColor: '#00ffff'
                  }
                }}
                onClick={() => handleConnectWallet(provider.name)}
              >
                <ListItemIcon>
                  <Avatar sx={{ backgroundColor: 'transparent', fontSize: 24 }}>
                    {provider.icon}
                  </Avatar>
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" color="#fff">
                        {provider.name}
                      </Typography>
                      {connectingWallet === provider.name && (
                        <Typography variant="body2" color="#00ffff">
                          连接中...
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="#aaa">
                      {provider.description}
                    </Typography>
                  }
                />
                {connectingWallet === provider.name ? (
                  <LinearProgress 
                    sx={{ 
                      width: 40,
                      '& .MuiLinearProgress-bar': { backgroundColor: '#00ffff' }
                    }}
                  />
                ) : (
                  <Security sx={{ color: '#00ff00' }} />
                )}
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 1 }}>
            <Typography variant="body2" color="#ffd700" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security />
              安全提示: 这是一个演示环境，不会连接到真实的钱包
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWalletDialogOpen(false)} sx={{ color: '#aaa' }}>
            取消
          </Button>
        </DialogActions>
      </Dialog>

      {/* 设置对话框 */}
      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid #00ffff',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ color: '#00ffff' }}>游戏设置</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>音量</Typography>
            <Slider
              value={volume}
              onChange={(_, value) => setVolume(value as number)}
              sx={{
                color: '#00ffff',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#00ffff',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#00ffff',
                },
              }}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>图形质量</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label="低" variant="outlined" sx={{ color: '#fff', borderColor: '#fff' }} />
              <Chip label="中" sx={{ backgroundColor: '#00ffff', color: '#000' }} />
              <Chip label="高" variant="outlined" sx={{ color: '#fff', borderColor: '#fff' }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)} sx={{ color: '#00ffff' }}>
            确定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 通知 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarMessage.includes('✅') ? 'success' : 'error'}
          sx={{
            backgroundColor: snackbarMessage.includes('✅') ? 'rgba(0,255,0,0.1)' : 'rgba(255,68,68,0.1)',
            color: '#fff',
            border: `1px solid ${snackbarMessage.includes('✅') ? '#00ff00' : '#ff4444'}`,
            '& .MuiAlert-icon': {
              color: snackbarMessage.includes('✅') ? '#00ff00' : '#ff4444'
            }
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GameFiPage;