import { Alert } from 'react-native';

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  userId?: string;
  screen?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableAlertDialogs: boolean;
  enableRemoteLogging: boolean;
  remoteLoggingEndpoint?: string;
  maxRetries: number;
  retryDelay: number;
}

class ErrorHandler {
  private config: ErrorHandlerConfig = {
    enableConsoleLogging: true,
    enableAlertDialogs: __DEV__, // Only show alerts in development
    enableRemoteLogging: false,
    maxRetries: 3,
    retryDelay: 1000,
  };

  private retryTimeouts = new Map<string, number>();

  configure(config: Partial<ErrorHandlerConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Handle general errors
  handleError(error: Error | string, context?: {
    screen?: string;
    action?: string;
    metadata?: Record<string, any>;
    showAlert?: boolean;
  }) {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Create error report
    const report: ErrorReport = {
      message: errorObj.message,
      stack: errorObj.stack,
      timestamp: new Date().toISOString(),
      userAgent: 'React Native App',
      screen: context?.screen,
      action: context?.action,
      metadata: context?.metadata,
    };

    // Log error
    this.logError(report);

    // Show alert if enabled and requested
    if (this.config.enableAlertDialogs && (context?.showAlert !== false)) {
      this.showErrorAlert(errorObj.message);
    }

    // Send to remote logging if enabled
    if (this.config.enableRemoteLogging) {
      this.sendToRemoteLogging(report);
    }
  }

  // Handle API errors specifically
  handleApiError(error: any, context?: {
    endpoint?: string;
    method?: string;
    params?: any;
    retryable?: boolean;
  }) {
    let message = 'An unexpected error occurred';
    let shouldRetry = false;

    if (error?.response) {
      // Server responded with error status
      const status = error.response.status;
      message = this.getApiErrorMessage(status, error.response.data);

      // Determine if error is retryable
      shouldRetry = context?.retryable !== false && this.isRetryableStatus(status);
    } else if (error?.request) {
      // Network error
      message = 'Network connection failed. Please check your internet connection.';
      shouldRetry = true;
    } else {
      // Other error
      message = error?.message || message;
    }

    this.handleError(new Error(message), {
      screen: 'API',
      action: `${context?.method || 'UNKNOWN'} ${context?.endpoint || 'unknown endpoint'}`,
      metadata: {
        status: error?.response?.status,
        endpoint: context?.endpoint,
        method: context?.method,
        params: context?.params,
        retryable: shouldRetry,
      },
    });

    return { message, shouldRetry };
  }

  // Handle network connectivity errors
  handleNetworkError(error: any, context?: {
    operation?: string;
    retryCallback?: () => void;
  }) {
    const { message, shouldRetry } = this.handleApiError(error, {
      retryable: true,
      ...context,
    });

    if (shouldRetry && context?.retryCallback) {
      this.scheduleRetry(context.operation || 'network_operation', context.retryCallback);
    }

    return { message, shouldRetry };
  }

  // Schedule a retry with exponential backoff
  private scheduleRetry(operationId: string, callback: () => void) {
    // Clear existing timeout for this operation
    const existingTimeout = this.retryTimeouts.get(operationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(operationId);
      callback();
    }, this.config.retryDelay);

    this.retryTimeouts.set(operationId, timeout);
  }

  // Cancel scheduled retry
  cancelRetry(operationId: string) {
    const timeout = this.retryTimeouts.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(operationId);
    }
  }

  // Clear all scheduled retries
  clearAllRetries() {
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  private logError(report: ErrorReport) {
    if (this.config.enableConsoleLogging) {
      console.error('Error Report:', {
        message: report.message,
        screen: report.screen,
        action: report.action,
        timestamp: report.timestamp,
        stack: report.stack?.split('\n').slice(0, 5).join('\n'),
        metadata: report.metadata,
      });
    }
  }

  private async sendToRemoteLogging(report: ErrorReport) {
    if (!this.config.remoteLoggingEndpoint) return;

    try {
      await fetch(this.config.remoteLoggingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      // Don't create infinite loop by calling handleError here
      console.warn('Failed to send error report to remote logging:', error);
    }
  }

  private showErrorAlert(message: string) {
    Alert.alert(
      'Error',
      message,
      [{ text: 'OK', style: 'default' }],
      { cancelable: true }
    );
  }

  private getApiErrorMessage(status: number, data?: any): string {
    // FastAPI returns { detail: string } or { detail: [{loc, msg, type}] } (422)
    const detail = data?.detail;
    const detailStr: string | undefined =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
        ? detail.map((e: any) => e?.msg ?? String(e)).join('; ')
        : undefined;

    switch (status) {
      case 400:
        return detailStr || data?.message || 'Bad request. Please check your input.';
      case 401:
        return 'Authentication failed. Please log in again.';
      case 403:
        return detailStr || 'You do not have permission to perform this action.';
      case 404:
        return detailStr || 'The requested resource was not found.';
      case 409:
        return detailStr || 'Conflict with existing data.';
      case 422:
        return detailStr || data?.message || 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return detailStr || 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return detailStr || data?.message || `Request failed with status ${status}`;
    }
  }

  private isRetryableStatus(status: number): boolean {
    // Retry on network errors and server errors, but not on client errors
    return status >= 500 || status === 429 || status === 408 || status === 0;
  }

  // Utility method to wrap async operations with error handling
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: {
      screen?: string;
      action?: string;
      metadata?: Record<string, any>;
      showAlert?: boolean;
    }
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error as Error, context);
      return null;
    }
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Export types
export type { ErrorHandler };

