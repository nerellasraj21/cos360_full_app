import { 
  PermissionError, 
  PermissionErrorType, 
  PermissionTuple 
} from '../types/permissions';

/**
 * Creates a standardized permission error
 */
export const createPermissionError = (
  type: PermissionErrorType,
  message: string,
  resource?: string,
  action?: string,
  requiredPermissions?: PermissionTuple[]
): PermissionError => {
  const error = new Error(message) as PermissionError;
  error.name = 'PermissionError';
  error.type = type;
  error.resource = resource;
  error.action = action;
  error.requiredPermissions = requiredPermissions;
  return error;
};

/**
 * Checks if an error is a permission error
 */
export const isPermissionError = (error: any): error is PermissionError => {
  return error && error.type && Object.values(PermissionErrorType).includes(error.type);
};

/**
 * Gets user-friendly error message for permission errors
 */
export const getPermissionErrorMessage = (error: PermissionError): string => {
  switch (error.type) {
    case PermissionErrorType.INSUFFICIENT_PERMISSIONS:
      if (error.resource && error.action) {
        return `You don't have permission to ${error.action} ${error.resource.replace('_', ' ')}.`;
      }
      if (error.requiredPermissions && error.requiredPermissions.length > 0) {
        const permissionList = error.requiredPermissions
          .map(([resource, action]) => `${action} ${resource.replace('_', ' ')}`)
          .join(', ');
        return `You don't have permission to: ${permissionList}.`;
      }
      return 'You don\'t have sufficient permissions to perform this action.';

    case PermissionErrorType.AUTHENTICATION_REQUIRED:
      return 'Please log in to access this feature.';

    case PermissionErrorType.PERMISSION_CHECK_FAILED:
      return 'Unable to verify permissions. Please try again.';

    case PermissionErrorType.PERMISSION_DATA_CORRUPTED:
      return 'Permission data is corrupted. Please log in again.';

    default:
      return 'Access denied. Please contact your administrator.';
  }
};

/**
 * Logs permission errors for debugging
 */
export const logPermissionError = (error: PermissionError, context?: string): void => {
  const logData = {
    type: error.type,
    message: error.message,
    resource: error.resource,
    action: error.action,
    requiredPermissions: error.requiredPermissions,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('Permission Error:', logData);

  // In production, you might want to send this to a logging service
  // Example: analytics.track('permission_error', logData);
};

/**
 * Handles permission errors with appropriate user feedback
 */
export const handlePermissionError = (
  error: PermissionError,
  showToast?: (message: string, type: 'error' | 'warning') => void,
  context?: string
): void => {
  logPermissionError(error, context);

  const userMessage = getPermissionErrorMessage(error);
  
  if (showToast) {
    const toastType = error.type === PermissionErrorType.AUTHENTICATION_REQUIRED ? 'warning' : 'error';
    showToast(userMessage, toastType);
  }
};

/**
 * Permission error recovery strategies
 */
export interface ErrorRecoveryConfig {
  retryAttempts: number;
  fallbackToOffline: boolean;
  showUserFriendlyMessage: boolean;
  logErrorDetails: boolean;
}

export const defaultErrorRecoveryConfig: ErrorRecoveryConfig = {
  retryAttempts: 2,
  fallbackToOffline: false,
  showUserFriendlyMessage: true,
  logErrorDetails: true,
};

/**
 * Attempts to recover from permission errors
 */
export const recoverFromPermissionError = async (
  error: PermissionError,
  config: ErrorRecoveryConfig = defaultErrorRecoveryConfig,
  retryFn?: () => Promise<any>
): Promise<{ success: boolean; result?: any; error?: Error }> => {
  if (config.logErrorDetails) {
    logPermissionError(error, 'recovery_attempt');
  }

  // Handle different error types
  switch (error.type) {
    case PermissionErrorType.AUTHENTICATION_REQUIRED:
      // Cannot recover from authentication errors automatically
      return { success: false, error };

    case PermissionErrorType.PERMISSION_DATA_CORRUPTED:
      // Cannot recover from corrupted data automatically
      return { success: false, error };

    case PermissionErrorType.PERMISSION_CHECK_FAILED:
      // Retry permission check
      if (retryFn && config.retryAttempts > 0) {
        try {
          const result = await retryFn();
          return { success: true, result };
        } catch (retryError) {
          return { success: false, error: retryError as Error };
        }
      }
      return { success: false, error };

    case PermissionErrorType.INSUFFICIENT_PERMISSIONS:
      // Cannot recover from insufficient permissions
      return { success: false, error };

    default:
      return { success: false, error };
  }
};