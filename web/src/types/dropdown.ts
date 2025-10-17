import type { ReactNode } from 'react';

/**
 * Core dropdown option interface
 */
export interface DropdownOption {
  id: string | number;
  label: string;
  value: string | number;
  disabled?: boolean;
  metadata?: Record<string, any>;
}

/**
 * API response structure for dropdown data
 */
export interface DropdownResponse {
  data: any[];
  hasNextPage: boolean;
  nextCursor?: string | number;
  total?: number;
}

/**
 * Internal dropdown state management
 */
export interface DropdownState {
  isOpen: boolean;
  searchTerm: string;
  selectedOption: DropdownOption | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Configuration for dropdown API endpoints
 */
export interface DropdownEndpoint {
  key: string;
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  queryParams?: Record<string, any>;
  // Data transformation
  dataPath?: string; // Path to array in response
  labelField: string; // Field to use as display label
  valueField: string; // Field to use as value
  // Pagination
  pageParam?: string;
  pageSizeParam?: string;
  pageSize?: number;
  // Search
  searchParam?: string;
  // Caching
  cacheTime?: number;
  staleTime?: number;
}

/**
 * Props for the main InfiniteScrollDropdown component
 */
export interface InfiniteScrollDropdownProps {
  endpoint?: DropdownEndpoint;
  data?: DropdownOption[];
  value?: string | number;
  onChange: (value: string | number, option: DropdownOption) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  className?: string;
  error?: string;
  required?: boolean;
  // Cascading support
  dependsOn?: string | number;
  // Form integration
  name?: string;
  // Custom rendering
  renderOption?: (option: DropdownOption) => ReactNode;
  renderValue?: (option: DropdownOption) => ReactNode;
}

/**
 * Props for individual dropdown option component
 */
export interface DropdownOptionProps {
  id?: string;
  option: DropdownOption;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: (option: DropdownOption) => void;
  onMouseEnter: () => void;
  renderOption?: (option: DropdownOption) => ReactNode;
  className?: string;
  'aria-posinset'?: number;
  'aria-setsize'?: number;
}

/**
 * Props for dropdown search component
 */
export interface DropdownSearchProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onClear?: () => void;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Props for dropdown loading component
 */
export interface DropdownLoadingProps {
  isLoading: boolean;
  error?: string | null;
  hasData: boolean;
  onRetry?: () => void;
  className?: string;
}

/**
 * Configuration for error recovery strategies
 */
export interface ErrorRecoveryConfig {
  networkError: {
    retryCount: number;
    retryDelay: number[];
    fallbackToCached: boolean;
  };
  rateLimit: {
    retryCount: number;
    retryDelay: number[];
    showUserNotification: boolean;
  };
  serverError: {
    retryCount: number;
    retryDelay: number[];
    fallbackToCached: boolean;
    reportError: boolean;
  };
}

/**
 * Cache configuration for dropdown data
 */
export interface DropdownCacheConfig {
  maxSize: number;
  defaultCacheTime: number;
  defaultStaleTime: number;
  cleanupInterval: number;
}

/**
 * Hook return type for useInfiniteDropdown
 */
export interface UseInfiniteDropdownReturn {
  data: DropdownOption[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  refetch: () => void;
}

/**
 * Hook return type for useDropdownSearch
 */
export interface UseDropdownSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  clearSearch: () => void;
}

/**
 * Hook return type for useCascadingDropdown
 */
export interface UseCascadingDropdownReturn {
  isDisabled: boolean;
  shouldReset: boolean;
  dependencyValue: string | number | null;
  resetTrigger: number;
}

/**
 * API service method signatures
 */
export interface DropdownApiService {
  fetchDropdownData: (
    endpoint: DropdownEndpoint,
    page?: number,
    searchTerm?: string,
    dependsOn?: string | number
  ) => Promise<DropdownResponse>;
  
  transformResponseData: (
    response: any,
    endpoint: DropdownEndpoint
  ) => DropdownOption[];
  
  buildQueryParams: (
    endpoint: DropdownEndpoint,
    page?: number,
    searchTerm?: string,
    dependsOn?: string | number
  ) => Record<string, any>;
}

/**
 * Cache service method signatures
 */
export interface DropdownCacheService {
  get: (key: string) => DropdownResponse | null;
  set: (key: string, data: DropdownResponse, ttl?: number) => void;
  invalidate: (pattern: string) => void;
  clear: () => void;
  cleanup: () => void;
}