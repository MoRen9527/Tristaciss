import { createTheme, Theme } from '@mui/material/styles';

// 创建科幻主题
const theme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ffff', // 青色
      light: '#33ffff',
      dark: '#00b3b3',
      contrastText: '#000000',
    },
    secondary: {
      main: '#39ff14', // 霓虹绿
      light: '#60ff43',
      dark: '#27b20e',
      contrastText: '#000000',
    },
    background: {
      default: '#010b14', // 深蓝黑色
      paper: '#011627', // 稍微亮一点的深蓝黑色
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0bec5',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
    h2: {
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
    h3: {
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
    h4: {
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
    h5: {
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          boxShadow: 'none',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 20px currentColor, inset 0 0 20px rgba(0, 255, 255, 0.1)',
            transform: 'translateY(-1px)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
            transition: 'left 0.5s ease',
          },
          '&:hover::before': {
            left: '100%',
          },
        },
        contained: {
          boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
          border: '1px solid rgba(0, 255, 255, 0.5)',
          '&:hover': {
            boxShadow: '0 0 25px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.3)',
            border: '1px solid rgba(0, 255, 255, 0.8)',
          },
        },
        outlined: {
          borderWidth: '1px',
          borderColor: 'rgba(0, 255, 255, 0.5)',
          '&:hover': {
            borderWidth: '1px',
            borderColor: 'rgba(0, 255, 255, 0.8)',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(1, 22, 39, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
          borderRadius: 12,
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.05), transparent)',
            animation: 'shimmer 8s ease-in-out infinite',
            pointerEvents: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(1, 22, 39, 0.9)',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: 12,
          boxShadow: '0 0 25px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            boxShadow: '0 0 35px rgba(0, 255, 255, 0.3), 0 0 60px rgba(0, 255, 255, 0.15)',
            border: '1px solid rgba(0, 255, 255, 0.5)',
            transform: 'translateY(-2px)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, transparent 30%, rgba(0, 255, 255, 0.03) 50%, transparent 70%)',
            pointerEvents: 'none',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(0, 255, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 255, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00ffff',
            },
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '@keyframes shimmer': {
          '0%': { left: '-100%' },
          '50%': { left: '100%' },
          '100%': { left: '-100%' }
        },
        '@keyframes glow': {
          '0%, 100%': { 
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)' 
          },
          '50%': { 
            boxShadow: '0 0 25px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.3)' 
          }
        },
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.7 },
          '50%': { opacity: 1 }
        },
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#00ffff rgba(0, 0, 0, 0.2)',
          background: 'linear-gradient(135deg, #000814 0%, #001428 20%, #001d3d 40%, #002040 60%, #001d3d 80%, #000814 100%)',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            border: '1px solid rgba(0, 255, 255, 0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 255, 255, 0.6)',
            borderRadius: '4px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            '&:hover': {
              backgroundColor: 'rgba(0, 255, 255, 0.8)',
            },
          },
        },
      },
    },
  },
});

export default theme;