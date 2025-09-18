import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/LoginPage';
import ChatHistoryPage from './pages/ChatHistoryPage-TABLET-0BGCRCP5';
import HomePage from './pages/HomePage';
import ChatOnlyPage from './pages/ChatOnlyPage';
import DashboardOnlyPage from './pages/DashboardOnlyPage';
import InfoCardPage from './pages/InfoCardPage';
import GameFiPage from './pages/GameFiPage';



import SciFiDemo from './components/ui/SciFiDemo';
import { RootState } from './store';


const App = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        <Route 
          path="/chathistory" 
          element={isAuthenticated ? <ChatHistoryPage /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/chat-only" 
          element={<ChatOnlyPage /> } 
        />
        {/* 暂时用独立页面，后期需要判断是否登录 */}
        <Route 
          path="/dashboard-only" 
          element={<DashboardOnlyPage />} 
        />


        <Route 
          path="/info-card/:cardType" 
          element={<InfoCardPage />} 
        />
        <Route 
          path="/gamefi" 
          element={<GameFiPage />} 
        />
        <Route 
          path="/sci-fi-demo" 
          element={<SciFiDemo />} 
        />
        <Route 
          path="/" 
          element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </Router>
  );
};

export default App;