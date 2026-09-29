import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { dropdownApi } from '../../api/dropdown/dropdownApi';
import type { 
  DropdownEndpoint, 
  DropdownOption, 
  UseInfiniteDropdownReturn 
} from '../../types/dropdown';

/**
 * Options for the useInfiniteDropdown hook
 */
export interface UseInfiniteDropdownOptions {
  endpoint: DropdownEndpoint;
  searchTerm?: string;
  dependsOn?: string | number;
  enabled?: boolean;
}

/**
 * Custom hook for infinite scroll dropdown data fetching with TanStack Query
 * 
 * Features:
 * - Infinite scroll pagination
 * - Search functionality
 * - Caching with configurable TTL
 * - Error handling with retry logic
 * - Dependency management for cascading dropdowns
 * 
 * @param options - Configuration options for the hook
 * @returns Hook return object with data, loading states, and control functions
 */
export function useInfiniteDropdown({
  endpoint,
  searchTerm = '',
  dependsOn,
  enabled = true
}: UseInfiniteDropdownOptions): UseInfiniteDropdownReturn {
  
  /**
   * Generate unique query key for caching
   * Includes endpoint key, search term, and dependency value
   */
  const queryKey = useMemo(() => [
    'dropdown',
    endpoint.key,
    searchTerm,
    dependsOn
  ], [endpoint.key, searchTerm, dependsOn]);

  /**
   * Check if query should be enabled
   * Disabled if:
   * - explicitly disabled via enabled prop
   * - endpoint requires dependency but none provided
   */
  const isQueryEnabled = useMemo(() => {
    if (!enabled) return false;
    
    // Check if endpoint has dependency requirements
    const hasDependencyPlaceholder = endpoint.queryParams && 
      Object.values(endpoint.queryParams).some(value => 
        typeof value === 'string' && value.includes('{{dependsOn}}')
      );
    
    // If endpoint needs dependency but none provided, disable query
    if (hasDependencyPlaceholder && !dependsOn) {
      return false;
    }
    
    return true;
  }, [enabled, endpoint.queryParams, dependsOn]);

  /**
   * TanStack Query infinite query configuration
   */
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await dropdownApi.fetchDropdownData(
        endpoint,
        pageParam,
        searchTerm || undefined,
        dependsOn
      );
    },
    getNextPageParam: (lastPage, allPages) => {
      // If no more pages, return undefined
      if (!lastPage.hasNextPage) {
        return undefined;
      }
      
      // Use nextCursor if available, otherwise increment page number
      return typeof lastPage.nextCursor === 'number' ? lastPage.nextCursor : (allPages.length + 1);
    },
    initialPageParam: 1 as number,
    enabled: isQueryEnabled,
    // Cache configuration from endpoint
    gcTime: endpoint.cacheTime || 5 * 60 * 1000, // 5 minutes default
    staleTime: endpoint.staleTime || 2 * 60 * 1000, // 2 minutes default
    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        return false;
      }
      
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  /**
   * Flatten all pages into a single array of dropdown options
   */
  const flattenedData = useMemo(() => {
    if (!data?.pages) return [];
    
    return data.pages.reduce<DropdownOption[]>((acc, page: any) => {
      return [...acc, ...page.data];
    }, []);
  }, [data?.pages]);

  /**
   * Return hook interface
   */
  return {
    data: flattenedData,
    isLoading,
    isError,
    error: error as Error | null,
    hasNextPage: hasNextPage || false,
    fetchNextPage: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    isFetchingNextPage,
    refetch
  };
}