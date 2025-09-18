import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import store from './store';
import theme from './theme';
import { NotificationProvider } from './hooks/useSciFiNotification';
import './index.css';

console.log('Index.tsx 正在加载...');

const container = document.getElementById('root');
if (!container) {
  console.error('找不到 root 元素!');
} else {
  console.log('找到 root 元素，开始渲染...');
  const root = ReactDOM.createRoot(container);
  root.render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </ThemeProvider>
    </Provider>
  );
  console.log('App 组件已渲染');
}