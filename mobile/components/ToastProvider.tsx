import React, { createContext, ReactNode, useContext } from 'react';
import { ToastContainer, useToast } from './FeedbackToast';

interface ToastContextType {
  showSuccess: (title: string, message?: string, options?: any) => string;
  showError: (title: string, message?: string, options?: any) => string;
  showWarning: (title: string, message?: string, options?: any) => string;
  showInfo: (title: string, message?: string, options?: any) => string;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const toast = useToast();

  const value: ToastContextType = {
    showSuccess: toast.showSuccess,
    showError: toast.showError,
    showWarning: toast.showWarning,
    showInfo: toast.showInfo,
    dismissToast: toast.dismissToast,
    dismissAllToasts: toast.dismissAllToasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toast.toasts}
        onDismiss={toast.dismissToast}
        position="top"
      />
    </ToastContext.Provider>
  );
};

export default ToastProvider;