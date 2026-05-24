import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ChatHistoryPage from './pages/ChatHistoryPage-TABLET-0BGCRCP5';
import HomePage from './pages/HomePage';
import ChatOnlyPage from './pages/ChatOnlyPage';
import DashboardOnlyPage from './pages/DashboardOnlyPage';
import InfoCardPage from './pages/InfoCardPage';
import GameFiPage from './pages/GameFiPage';



import SciFiDemo from './components/ui/SciFiDemo';
import { checkAuth } from './store/authSlice';
import { useAppDispatch, useAppSelector } from './hooks/redux';


const App = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [authResolved, setAuthResolved] = useState<boolean>(() => !localStorage.getItem('token'));

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setAuthResolved(true);
      return;
    }

    dispatch(checkAuth())
      .finally(() => {
        setAuthResolved(true);
      });
  }, [dispatch]);

  if (!authResolved) {
    return null;
  }

  const requireAuth = (element: React.ReactElement) => (
    isAuthenticated ? element : <Navigate to="/login" replace />
  );

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        <Route 
          path="/chathistory" 
          element={requireAuth(<ChatHistoryPage />)} 
        />
        <Route 
          path="/chat-only" 
          element={requireAuth(<ChatOnlyPage />)} 
        />
        <Route 
          path="/dashboard-only" 
          element={requireAuth(<DashboardOnlyPage />)} 
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
          element={requireAuth(<HomePage />)} 
        />
      </Routes>
    </Router>
  );
};

export default App;