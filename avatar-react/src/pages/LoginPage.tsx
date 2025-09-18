import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import { AccountCircle, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/authSlice';
import type { RootState, AppDispatch } from '../store';

// 定义登录凭据类型
interface LoginCredentials {
  username: string;
  password: string;
}
import '../styles/LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated, loginSuccess } = useSelector((state: RootState) => state.auth);

  // 监听登录成功状态，自动跳转
  useEffect(() => {
    if (loginSuccess && isAuthenticated) {
      console.log('登录成功，跳转到主页');
      navigate('/');
    }
  }, [loginSuccess, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const credentials: LoginCredentials = { username, password };
      const result = await dispatch(login(credentials));
      if (login.fulfilled.match(result)) {
        navigate('/');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleTestLogin = () => {
    // 使用后端已配置的测试账户
    const testCredentials: LoginCredentials = {
      username: 'demo',
      password: 'demo123'
    };
    
    setUsername(testCredentials.username);
    setPassword(testCredentials.password);
    
    // 自动登录
    dispatch(login(testCredentials));
  };

  return (
    <div className="login-container">
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
        >
          <Paper 
            elevation={24} 
            sx={{
              padding: 4,
              width: '100%',
              maxWidth: 400,
              backgroundColor: 'rgba(1, 11, 20, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid #39ff14',
              borderRadius: '16px',
              boxShadow: '0 0 30px rgba(57, 255, 20, 0.3), 0 0 60px rgba(0, 255, 255, 0.2)',
            }}
          >
            <Box textAlign="center" mb={4}>
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{
                  color: '#39ff14',
                  textShadow: '0 0 20px rgba(57, 255, 20, 0.8)',
                  fontWeight: 'bold',
                  mb: 1,
                }}
              >
                三元宇宙
              </Typography>
              <Typography 
                variant="subtitle1" 
                sx={{
                  color: '#00ffff',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.6)',
                }}
              >
                星球城市空间站
              </Typography>
            </Box>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  color: '#ff6b6b',
                  border: '1px solid #ff6b6b',
                  '& .MuiAlert-icon': {
                    color: '#ff6b6b',
                  },
                }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="用户名"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircle sx={{ color: '#39ff14', filter: 'drop-shadow(0 0 5px rgba(57, 255, 20, 0.7))' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '& fieldset': {
                      borderColor: 'rgba(57, 255, 20, 0.5)',
                      boxShadow: '0 0 10px rgba(57, 255, 20, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(57, 255, 20, 0.7)',
                      boxShadow: '0 0 15px rgba(57, 255, 20, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#39ff14',
                      borderWidth: '2px',
                      boxShadow: '0 0 20px rgba(57, 255, 20, 0.7)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#39ff14',
                  },
                  '& .MuiInputBase-input': {
                    color: '#fff',
                  },
                }}
              />

              <TextField
                fullWidth
                label="密码"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#39ff14', filter: 'drop-shadow(0 0 5px rgba(57, 255, 20, 0.7))' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#39ff14', filter: 'drop-shadow(0 0 5px rgba(57, 255, 20, 0.7))' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '& fieldset': {
                      borderColor: 'rgba(57, 255, 20, 0.5)',
                      boxShadow: '0 0 10px rgba(57, 255, 20, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(57, 255, 20, 0.7)',
                      boxShadow: '0 0 15px rgba(57, 255, 20, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#39ff14',
                      borderWidth: '2px',
                      boxShadow: '0 0 20px rgba(57, 255, 20, 0.7)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#39ff14',
                  },
                  '& .MuiInputBase-input': {
                    color: '#fff',
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  background: 'linear-gradient(45deg, #00ffff, #39ff14)',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(57, 255, 20, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 0 30px rgba(57, 255, 20, 0.6), 0 6px 20px rgba(0, 0, 0, 0.4)',
                  },
                }}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
              
              {/* 测试账户按钮 */}
              <Button
                fullWidth
                variant="outlined"
                onClick={handleTestLogin}
                disabled={loading}
                sx={{
                  mt: 2,
                  py: 1.5,
                  borderColor: 'secondary.main',
                  color: 'secondary.main',
                  '&:hover': {
                    borderColor: 'secondary.light',
                    backgroundColor: 'rgba(57, 255, 20, 0.1)',
                  },
                }}
              >
                使用测试账户登录
              </Button>
            </form>

            {/* 测试账户信息提示 */}
            <Box sx={{ mt: 3, p: 2, border: '1px solid rgba(57, 255, 20, 0.3)', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: 'secondary.main', mb: 1 }}>
                测试账户信息：
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                用户名: demo
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                密码: demo123
              </Typography>
            </Box>

            <Box textAlign="center" mt={3}>
              <Typography 
                variant="body2" 
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textShadow: '0 0 3px rgba(255, 255, 255, 0.3)',
                }}
              >
                © 2025 三元宇宙 版权所有
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    </div>
  );
};

export default LoginPage;