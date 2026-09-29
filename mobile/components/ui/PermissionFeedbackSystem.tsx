import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import { useToast } from '../FeedbackToast';
import { 
  PermissionError, 
  PermissionErrorType,
  PermissionTuple 
} from '../../src/types/permissions';
import {
  createPermissionError,
  getPermissionErrorMessage,
  handlePermissionError 
} from '../../src/utils/permission-errors';

// Permission feedback configuration
interface PermissionFeedbackConfig {
  showToasts: boolean;
  showInlineErrors: boolean;
  showLoadingStates: boolean;
  autoRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  logErrors: boolean;
}

const defaultConfig: PermissionFeedbackConfig = {
  showToasts: true,
  showInlineErrors: true,
  showLoadingStates: true,
  autoRetry: true,
  maxRetries: 2,
  retryDelay: 2000,
  logErrors: true,
};

// Permission feedback context
interface PermissionFeedbackContextType {
  config: PermissionFeedbackConfig;
  updateConfig: (updates: Partial<PermissionFeedbackConfig>) => void;
  
  // Error handling methods
  showPermissionError: (error: PermissionError, context?: string) => void;
  showAccessDenied: (resource?: string, action?: string, context?: string) => void;
  showAuthenticationRequired: (context?: string) => void;
  showPermissionCheckFailed: (context?: string) => void;
  
  // Success feedback methods
  showPermissionGranted: (message?: string) => void;
  showAccessGranted: (resource?: string, action?: string) => void;
  
  // Loading state methods
  showPermissionLoading: (message?: string) => string;
  hidePermissionLoading: (id: string) => void;
  
  // Utility methods
  createStandardError: (type: PermissionErrorType, resource?: string, action?: string) => PermissionError;
  handleAPIPermissionError: (error: any, operation: string) => void;
}

const PermissionFeedbackContext = createContext<PermissionFeedbackContextType | null>(null);

// Permission feedback provider
interface PermissionFeedbackProviderProps {
  children: ReactNode;
  config?: Partial<PermissionFeedbackConfig>;
}

export const PermissionFeedbackProvider: React.FC<PermissionFeedbackProviderProps> = ({
  children,
  config: initialConfig,
}) => {
  const [config, setConfig] = useState<PermissionFeedbackConfig>({
    ...defaultConfig,
    ...initialConfig,
  });
  
  const { showError, showWarning, showSuccess, showInfo } = useToast();
  const [loadingStates, setLoadingStates] = useState<Map<string, string>>(new Map());

  const updateConfig = useCallback((updates: Partial<PermissionFeedbackConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const showPermissionError = useCallback((error: PermissionError, context?: string) => {
    if (config.logErrors) {
      console.error('Permission error:', error, context);
    }

    if (config.showToasts) {
      const message = getPermissionErrorMessage(error);
      const title = error.type === PermissionErrorType.AUTHENTICATION_REQUIRED 
        ? 'Login Required' 
        : 'Access Denied';
      
      if (error.type === PermissionErrorType.AUTHENTICATION_REQUIRED) {
        showWarning(title, message);
      } else {
        showError(title, message);
      }
    }
  }, [config, showError, showWarning]);

  const showAccessDenied = useCallback((resource?: string, action?: string, context?: string) => {
    const error = createPermissionError(
      PermissionErrorType.INSUFFICIENT_PERMISSIONS,
      resource && action 
        ? `Insufficient permissions to ${action} ${resource}`
        : 'Insufficient permissions',
      resource,
      action
    );
    showPermissionError(error, context);
  }, [showPermissionError]);

  const showAuthenticationRequired = useCallback((context?: string) => {
    const error = createPermissionError(
      PermissionErrorType.AUTHENTICATION_REQUIRED,
      'Authentication required to access this feature'
    );
    showPermissionError(error, context);
  }, [showPermissionError]);

  const showPermissionCheckFailed = useCallback((context?: string) => {
    const error = createPermissionError(
      PermissionErrorType.PERMISSION_CHECK_FAILED,
      'Failed to verify permissions'
    );
    showPermissionError(error, context);
  }, [showPermissionError]);

  const showPermissionGranted = useCallback((message = 'Access granted') => {
    if (config.showToasts) {
      showSuccess('Permission Granted', message);
    }
  }, [config, showSuccess]);

  const showAccessGranted = useCallback((resource?: string, action?: string) => {
    const message = resource && action 
      ? `You can now ${action} ${resource.replace(/_/g, ' ')}`
      : 'Access has been granted';
    showPermissionGranted(message);
  }, [showPermissionGranted]);

  const showPermissionLoading = useCallback((message = 'Checking permissions...') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    if (config.showLoadingStates) {
      setLoadingStates(prev => new Map(prev).set(id, message));
    }
    
    return id;
  }, [config]);

  const hidePermissionLoading = useCallback((id: string) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const createStandardError = useCallback((
    type: PermissionErrorType, 
    resource?: string, 
    action?: string
  ): PermissionError => {
    let message: string;
    
    switch (type) {
      case PermissionErrorType.INSUFFICIENT_PERMISSIONS:
        message = resource && action 
          ? `Insufficient permissions to ${action} ${resource}`
          : 'Insufficient permissions';
        break;
      case PermissionErrorType.AUTHENTICATION_REQUIRED:
        message = 'Authentication required';
        break;
      case PermissionErrorType.PERMISSION_CHECK_FAILED:
        message = 'Permission check failed';
        break;
      case PermissionErrorType.PERMISSION_DATA_CORRUPTED:
        message = 'Permission data corrupted';
        break;
      default:
        message = 'Permission error';
    }

    return createPermissionError(type, message, resource, action);
  }, []);

  const handleAPIPermissionError = useCallback((error: any, operation: string) => {
    let permissionError: PermissionError;

    if (error.response?.status === 401) {
      permissionError = createStandardError(PermissionErrorType.AUTHENTICATION_REQUIRED);
    } else if (error.response?.status === 403) {
      permissionError = createStandardError(PermissionErrorType.INSUFFICIENT_PERMISSIONS);
    } else {
      permissionError = createStandardError(PermissionErrorType.PERMISSION_CHECK_FAILED);
    }

    showPermissionError(permissionError, `api_${operation}`);
  }, [createStandardError, showPermissionError]);

  const contextValue: PermissionFeedbackContextType = {
    config,
    updateConfig,
    showPermissionError,
    showAccessDenied,
    showAuthenticationRequired,
    showPermissionCheckFailed,
    showPermissionGranted,
    showAccessGranted,
    showPermissionLoading,
    hidePermissionLoading,
    createStandardError,
    handleAPIPermissionError,
  };

  return (
    <PermissionFeedbackContext.Provider value={contextValue}>
      {children}
    </PermissionFeedbackContext.Provider>
  );
};

// Hook to use permission feedback
export const usePermissionFeedback = () => {
  const context = useContext(PermissionFeedbackContext);
  if (!context) {
    throw new Error('usePermissionFeedback must be used within a PermissionFeedbackProvider');
  }
  return context;
};

// Higher-order component for automatic permission feedback
interface WithPermissionFeedbackOptions {
  context?: string;
  showLoadingStates?: boolean;
  showErrors?: boolean;
}

export const withPermissionFeedback = <P extends object>(
  Component: React.ComponentType<P>,
  options?: WithPermissionFeedbackOptions
) => {
  return (props: P) => {
    const feedback = usePermissionFeedback();
    
    const enhancedProps = {
      ...props,
      permissionFeedback: feedback,
      permissionContext: options?.context,
    };

    return <Component {...enhancedProps} />;
  };
};

// Permission feedback hook with common patterns
export const usePermissionFeedbackPatterns = () => {
  const feedback = usePermissionFeedback();

  const handleScreenAccess = useCallback((
    hasPermission: boolean,
    screenName: string,
    requiredPermissions?: PermissionTuple[]
  ) => {
    if (!hasPermission) {
      const error = createPermissionError(
        PermissionErrorType.INSUFFICIENT_PERMISSIONS,
        `Access denied to ${screenName} screen`,
        undefined,
        undefined,
        requiredPermissions
      );
      feedback.showPermissionError(error, `screen_${screenName.toLowerCase()}`);
    }
  }, [feedback]);

  const handleAPIOperation = useCallback((
    hasPermission: boolean,
    operation: string,
    resource?: string,
    action?: string
  ) => {
    if (!hasPermission) {
      feedback.showAccessDenied(resource, action, `api_${operation}`);
      return false;
    }
    return true;
  }, [feedback]);

  const handleComponentAccess = useCallback((
    hasPermission: boolean,
    componentName: string,
    resource?: string,
    action?: string
  ) => {
    if (!hasPermission) {
      feedback.showAccessDenied(resource, action, `component_${componentName.toLowerCase()}`);
    }
  }, [feedback]);

  const handleButtonAction = useCallback((
    hasPermission: boolean,
    actionName: string,
    resource?: string,
    action?: string
  ) => {
    if (!hasPermission) {
      feedback.showAccessDenied(resource, action, `action_${actionName.toLowerCase()}`);
      return false;
    }
    return true;
  }, [feedback]);

  return {
    handleScreenAccess,
    handleAPIOperation,
    handleComponentAccess,
    handleButtonAction,
  };
};

// Permission feedback utilities
export const PermissionFeedbackUtils = {
  // Create error for common scenarios
  createInsufficientPermissionsError: (resource: string, action: string) =>
    createPermissionError(
      PermissionErrorType.INSUFFICIENT_PERMISSIONS,
      `You don't have permission to ${action} ${resource.replace(/_/g, ' ')}`,
      resource,
      action
    ),

  createAuthenticationRequiredError: () =>
    createPermissionError(
      PermissionErrorType.AUTHENTICATION_REQUIRED,
      'Please log in to access this feature'
    ),

  createPermissionCheckFailedError: () =>
    createPermissionError(
      PermissionErrorType.PERMISSION_CHECK_FAILED,
      'Unable to verify permissions. Please try again.'
    ),

  // Format permission names for display
  formatPermissionName: (resource: string, action: string) =>
    `${action.replace(/_/g, ' ')} ${resource.replace(/_/g, ' ')}`,

  // Get user-friendly action names
  getActionDisplayName: (action: string) => {
    const actionMap: Record<string, string> = {
      create: 'create',
      read: 'view',
      update: 'edit',
      delete: 'delete',
      list: 'view list of',
      approve: 'approve',
      export: 'export',
      read_own: 'view your own',
      update_own: 'edit your own',
      delete_own: 'delete your own',
    };
    return actionMap[action] || action;
  },

  // Get user-friendly resource names
  getResourceDisplayName: (resource: string) => {
    const resourceMap: Record<string, string> = {
      students: 'students',
      student_admissions: 'student admissions',
      student_attendance: 'student attendance',
      student_documents: 'student documents',
      fee_categories: 'fee categories',
      fee_transactions: 'fee transactions',
      staff: 'staff members',
      transport_routes: 'transport routes',
      // Add more mappings as needed
    };
    return resourceMap[resource] || resource.replace(/_/g, ' ');
  },
};

export default {
  PermissionFeedbackProvider,
  usePermissionFeedback,
  usePermissionFeedbackPatterns,
  withPermissionFeedback,
  PermissionFeedbackUtils,
};