
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class NotificationManager {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private notifications: Notification[] = [];

  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(notification: Omit<Notification, 'id'>): void {
    const id = Date.now().toString();
    const fullNotification: Notification = {
      id,
      duration: 5000,
      ...notification
    };

    this.notifications.push(fullNotification);
    this.emit();

    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, fullNotification.duration);
    }
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

export const notificationManager = new NotificationManager();

// React Hook
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  return {
    notifications,
    notify: notificationManager.notify.bind(notificationManager),
    remove: notificationManager.remove.bind(notificationManager)
  };
};

// Global notification functions
export const showNotification = (
  message: string,
  type: NotificationType = 'info',
  title?: string,
  duration?: number
) => {
  notificationManager.notify({
    type,
    title: title || type.charAt(0).toUpperCase() + type.slice(1),
    message,
    duration
  });
};

// Specific notification types for expense operations
export const expenseNotifications = {
  // Transaction notifications
  transactionCreated: () => showNotification('Transaction created successfully', 'success'),
  transactionUpdated: () => showNotification('Transaction updated successfully', 'success'),
  transactionApproved: () => showNotification('Transaction approved successfully', 'success'),
  transactionRejected: () => showNotification('Transaction rejected', 'warning'),
  transactionDeleted: () => showNotification('Transaction deleted successfully', 'success'),

  // Category notifications
  categoryCreated: () => showNotification('Category created successfully', 'success'),
  categoryUpdated: () => showNotification('Category updated successfully', 'success'),
  categoryDeleted: () => showNotification('Category deleted successfully', 'success'),

  // Type notifications
  typeCreated: () => showNotification('Expense type created successfully', 'success'),
  typeUpdated: () => showNotification('Expense type updated successfully', 'success'),
  typeDeleted: () => showNotification('Expense type deleted successfully', 'success'),

  // Attachment notifications
  attachmentUploaded: () => showNotification('Attachment uploaded successfully', 'success'),
  attachmentDownloaded: () => showNotification('Attachment downloaded', 'success'),
  attachmentDeleted: () => showNotification('Attachment deleted successfully', 'success'),

  // Settings notifications
  settingsUpdated: () => showNotification('Settings updated successfully', 'success'),

  // Report notifications
  reportGenerated: () => showNotification('Report generated successfully', 'success'),
  exportStarted: () => showNotification('Export started. You will be notified when ready.', 'info'),
  exportCompleted: (filename: string) => showNotification(`Export completed: ${filename}`, 'success'),

  // Error notifications
  genericError: (message: string = 'An unexpected error occurred') =>
    showNotification(message, 'error'),

  networkError: () => showNotification('Network error. Please check your connection.', 'error'),

  permissionError: () => showNotification('You do not have permission to perform this action.', 'error'),

  validationError: (message: string) => showNotification(message, 'warning'),

  rateLimitError: (retryAfter?: number) => {
    const message = retryAfter
      ? `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      : 'Rate limit exceeded. Please wait before trying again.';
    showNotification(message, 'warning');
  },

  duplicateTransaction: () => showNotification('Transaction with this reference already exists', 'warning'),

  fileTooLarge: () => showNotification('File size exceeds the maximum allowed limit', 'error'),

  invalidFileType: () => showNotification('File type not allowed', 'error'),

  approvalRequired: () => showNotification('This transaction requires approval before proceeding', 'info'),

  approvalPending: () => showNotification('Transaction submitted for approval', 'info'),
};