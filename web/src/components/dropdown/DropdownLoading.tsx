import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DropdownLoadingProps } from '@/types/dropdown';

export const DropdownLoading: React.FC<DropdownLoadingProps> = ({
  isLoading,
  error,
  hasData,
  onRetry,
  className,
}) => {
  // Don't render anything if there's data and no error
  if (hasData && !error && !isLoading) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-6 px-4', className)}>
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive text-center mb-3">
          {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'inline-flex items-center justify-center rounded-md text-sm font-medium',
              'ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
              'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
              'h-8 px-3 py-1'
            )}
            type="button"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </button>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-6', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Loading options...</p>
      </div>
    );
  }

  return null;
};

// Skeleton loading component for individual options
export const DropdownOptionSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 5,
  className,
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center space-x-3 px-2 py-1.5"
        >
          <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            {Math.random() > 0.5 && (
              <div className="h-3 bg-muted rounded animate-pulse" style={{ width: `${40 + Math.random() * 20}%` }} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Loading state for infinite scroll
export const DropdownInfiniteLoading: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex items-center justify-center py-3', className)}>
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
      <span className="text-sm text-muted-foreground">Loading more...</span>
    </div>
  );
};

DropdownLoading.displayName = 'DropdownLoading';
DropdownOptionSkeleton.displayName = 'DropdownOptionSkeleton';
DropdownInfiniteLoading.displayName = 'DropdownInfiniteLoading';