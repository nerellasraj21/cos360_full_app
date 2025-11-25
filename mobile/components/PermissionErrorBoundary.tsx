import React, { Component, ReactNode, ErrorInfo } from 'react';
import { 
  PermissionError, 
  PermissionErrorType
} from '../src/types/permissions';
import {
  isPermissionError,
  getPermissionErrorMessage,
  logPermissionError 
} from '../src/utils/permission-errors';
import { 
  EnhancedPermissionErrorBoundary,
  PermissionAccessDenied 
} from './ui';

interface PermissionErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: PermissionError, retry: () => void) => ReactNode;
  onError?: (error: PermissionError, errorInfo: ErrorInfo) => void;
}

interface PermissionErrorBoundaryState {
  hasError: boolean;
  error: PermissionError | null;
  errorInfo: ErrorInfo | null;
}

// Legacy PermissionErrorBoundary - now uses EnhancedPermissionErrorBoundary
export class PermissionErrorBoundary extends Component<
  PermissionErrorBoundaryProps,
  PermissionErrorBoundaryState
> {
  render() {
    const { children, fallback, onError } = this.props;

    return (
      <EnhancedPermissionErrorBoundary
        fallback={fallback}
        onError={onError}
        context="legacy_boundary"
        autoRetry={true}
        maxRetries={2}
      >
        {children}
      </EnhancedPermissionErrorBoundary>
    );
  }
}

// Higher-order component for wrapping components with permission error boundary
export const withPermissionErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<PermissionErrorBoundaryProps, 'children'>
) => {
  return (props: P) => (
    <PermissionErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </PermissionErrorBoundary>
  );
};