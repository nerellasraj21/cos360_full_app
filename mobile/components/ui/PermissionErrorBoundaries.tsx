import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';
import { ThemedTouchableOpacity } from '../themed-touchable-opacity';
import { 
  PermissionError, 
  PermissionErrorType 
} from '../../src/types/permissions';
import {
  isPermissionError,
  getPermissionErrorMessage,
  logPermissionError,
  handlePermissionError 
} from '../../src/utils/permission-errors';
import { AccessDenied, PermissionAccessDenied } from './AccessDeniedComponents';

// Enhanced permission error boundary props
interface EnhancedPermissionErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: PermissionError, retry: () => void, context?: string) => ReactNode;
  onError?: (error: PermissionError, errorInfo: ErrorInfo, context?: string) => void;
  context?: string;
  showRetry?: boolean;
  showContactSupport?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  style?: ViewStyle;
}

interface EnhancedPermissionErrorBoundaryState {
  hasError: boolean;
  error: PermissionError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

export class EnhancedPermissionErrorBoundary extends Component<
  EnhancedPermissionErrorBoundaryProps,
  EnhancedPermissionErrorBoundaryState
> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: EnhancedPermissionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EnhancedPermissionErrorBoundaryState> {
    if (isPermissionError(error)) {
      return {
        hasError: true,
        error: error as PermissionError,
      };
    }
    return {};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isPermissionError(error)) {
      const permissionError = error as PermissionError;
      
      // Log the error with context
      logPermissionError(permissionError, this.props.context || 'error_boundary');
      
      // Update state with error info
      this.setState({
        errorInfo,
      });

      // Call onError callback if provided
      if (this.props.onError) {
        this.props.onError(permissionError, errorInfo, this.props.context);
      }

      // Auto retry if enabled and within limits
      if (this.props.autoRetry && this.canAutoRetry(permissionError)) {
        this.scheduleAutoRetry();
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private canAutoRetry = (error: PermissionError): boolean => {
    const maxRetries = this.props.maxRetries || 2;
    return (
      this.state.retryCount < maxRetries &&
      error.type === PermissionErrorType.PERMISSION_CHECK_FAILED
    );
  };

  private scheduleAutoRetry = () => {
    const delay = this.props.retryDelay || 2000;
    
    this.setState({ isRetrying: true });
    
    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }));

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  };

  private handleContactSupport = () => {
    console.log('Contact support requested for permission error:', this.state.error);
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.state.isRetrying) {
        return (
          <ThemedView style={[styles.container, this.props.style]}>
            <View style={styles.retryingContainer}>
              <Ionicons name="refresh" size={32} color="#3b82f6" />
              <ThemedText style={styles.retryingText}>
                Retrying... ({this.state.retryCount + 1}/{this.props.maxRetries || 2})
              </ThemedText>
            </View>
          </ThemedView>
        );
      }

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry, this.props.context);
      }

      // Default error UI using PermissionAccessDenied
      const showRetry = this.props.showRetry !== false && 
        this.state.error.type === PermissionErrorType.PERMISSION_CHECK_FAILED;
      
      const showContactSupport = this.props.showContactSupport !== false;

      return (
        <PermissionAccessDenied
          error={this.state.error}
          onRetry={showRetry ? this.handleRetry : undefined}
          onContactSupport={showContactSupport ? this.handleContactSupport : undefined}
          style={this.props.style}
        />
      );
    }

    return this.props.children;
  }
}

// Screen-level permission error boundary
interface ScreenPermissionErrorBoundaryProps {
  children: ReactNode;
  screenName: string;
  onNavigateBack?: () => void;
  style?: ViewStyle;
}

export const ScreenPermissionErrorBoundary: React.FC<ScreenPermissionErrorBoundaryProps> = ({
  children,
  screenName,
  onNavigateBack,
  style,
}) => {
  const handleError = (error: PermissionError, errorInfo: ErrorInfo) => {
    console.log(`Permission error in ${screenName} screen:`, error);
  };

  const renderFallback = (error: PermissionError, retry: () => void) => (
    <AccessDenied
      title={`${screenName} Access Error`}
      message={getPermissionErrorMessage(error)}
      onRetry={error.type === PermissionErrorType.PERMISSION_CHECK_FAILED ? retry : undefined}
      onContactSupport={onNavigateBack}
      style={style}
    />
  );

  return (
    <EnhancedPermissionErrorBoundary
      context={`screen_${screenName.toLowerCase()}`}
      fallback={renderFallback}
      onError={handleError}
      autoRetry={true}
      maxRetries={2}
      style={style}
    >
      {children}
    </EnhancedPermissionErrorBoundary>
  );
};

// Component-level permission error boundary
interface ComponentPermissionErrorBoundaryProps {
  children: ReactNode;
  componentName: string;
  compact?: boolean;
  style?: ViewStyle;
}

export const ComponentPermissionErrorBoundary: React.FC<ComponentPermissionErrorBoundaryProps> = ({
  children,
  componentName,
  compact = true,
  style,
}) => {
  const handleError = (error: PermissionError, errorInfo: ErrorInfo) => {
    console.log(`Permission error in ${componentName} component:`, error);
  };

  const renderFallback = (error: PermissionError, retry: () => void) => (
    <PermissionAccessDenied
      error={error}
      onRetry={error.type === PermissionErrorType.PERMISSION_CHECK_FAILED ? retry : undefined}
      compact={compact}
      style={style}
    />
  );

  return (
    <EnhancedPermissionErrorBoundary
      context={`component_${componentName.toLowerCase()}`}
      fallback={renderFallback}
      onError={handleError}
      autoRetry={false}
      showContactSupport={false}
      style={style}
    >
      {children}
    </EnhancedPermissionErrorBoundary>
  );
};

// API operation permission error boundary
interface APIPermissionErrorBoundaryProps {
  children: ReactNode;
  operation: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const APIPermissionErrorBoundary: React.FC<APIPermissionErrorBoundaryProps> = ({
  children,
  operation,
  onRetry,
  style,
}) => {
  const handleError = (error: PermissionError, errorInfo: ErrorInfo) => {
    console.log(`Permission error in API operation ${operation}:`, error);
  };

  const renderFallback = (error: PermissionError, retry: () => void) => (
    <AccessDenied
      title="Operation Failed"
      message={`Unable to ${operation}: ${getPermissionErrorMessage(error)}`}
      onRetry={onRetry || retry}
      compact={true}
      style={style}
    />
  );

  return (
    <EnhancedPermissionErrorBoundary
      context={`api_${operation.toLowerCase()}`}
      fallback={renderFallback}
      onError={handleError}
      autoRetry={true}
      maxRetries={1}
      retryDelay={1000}
      style={style}
    >
      {children}
    </EnhancedPermissionErrorBoundary>
  );
};

// Higher-order component for wrapping components with permission error boundary
export const withPermissionErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    context?: string;
    autoRetry?: boolean;
    maxRetries?: number;
    showRetry?: boolean;
    showContactSupport?: boolean;
  }
) => {
  return (props: P) => (
    <EnhancedPermissionErrorBoundary
      context={options?.context}
      autoRetry={options?.autoRetry}
      maxRetries={options?.maxRetries}
      showRetry={options?.showRetry}
      showContactSupport={options?.showContactSupport}
    >
      <Component {...props} />
    </EnhancedPermissionErrorBoundary>
  );
};

// Permission error fallback component for use in error boundaries
interface PermissionErrorFallbackProps {
  error: PermissionError;
  retry: () => void;
  context?: string;
  compact?: boolean;
  style?: ViewStyle;
}

export const PermissionErrorFallback: React.FC<PermissionErrorFallbackProps> = ({
  error,
  retry,
  context,
  compact = false,
  style,
}) => {
  const getContextualMessage = () => {
    if (!context) return getPermissionErrorMessage(error);
    
    const baseMessage = getPermissionErrorMessage(error);
    return `${baseMessage} (Context: ${context})`;
  };

  return (
    <PermissionAccessDenied
      error={error}
      onRetry={error.type === PermissionErrorType.PERMISSION_CHECK_FAILED ? retry : undefined}
      compact={compact}
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryingContainer: {
    alignItems: 'center',
  },
  retryingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default {
  EnhancedPermissionErrorBoundary,
  ScreenPermissionErrorBoundary,
  ComponentPermissionErrorBoundary,
  APIPermissionErrorBoundary,
  withPermissionErrorBoundary,
  PermissionErrorFallback,
};