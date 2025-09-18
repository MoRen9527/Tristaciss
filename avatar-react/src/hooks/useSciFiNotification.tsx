import React, { createContext, useContext, useState, ReactNode } from 'react';
import SciFiNotification from '../components/common/SciFiNotification';

interface NotificationData {
  id: string;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationData, 'id'>) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useSciFiNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useSciFiNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = (notification: Omit<NotificationData, 'id'>) => {
    const id = Date.now().toString();
    const newNotification: NotificationData = {
      id,
      ...notification,
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const showError = (message: string, title?: string) => {
    showNotification({
      type: 'error',
      title: title || '错误',
      message,
    });
  };

  const showWarning = (message: string, title?: string) => {
    showNotification({
      type: 'warning',
      title: title || '警告',
      message,
    });
  };

  const showInfo = (message: string, title?: string) => {
    showNotification({
      type: 'info',
      title: title || '信息',
      message,
    });
  };

  const showSuccess = (message: string, title?: string) => {
    showNotification({
      type: 'success',
      title: title || '成功',
      message,
      autoClose: true,
      autoCloseDelay: 3000,
    });
  };

  const contextValue: NotificationContextType = {
    showNotification,
    showError,
    showWarning,
    showInfo,
    showSuccess,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {notifications.map((notification) => (
        <SciFiNotification
          key={notification.id}
          open={true}
          onClose={() => removeNotification(notification.id)}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          autoClose={notification.autoClose}
          autoCloseDelay={notification.autoCloseDelay}
        />
      ))}
    </NotificationContext.Provider>
  );
};