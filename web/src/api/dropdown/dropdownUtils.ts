import type { DropdownEndpoint, DropdownOption } from '../../types/dropdown';
import { DEFAULT_DROPDOWN_CONFIG } from '../../constants/dropdown/endpoints';

/**
 * Validation error class for dropdown configurations
 */
export class DropdownConfigError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'DropdownConfigError';
  }
}

/**
 * Validates a dropdown endpoint configuration
 */
export function validateDropdownEndpoint(endpoint: DropdownEndpoint): void {
  const errors: string[] = [];

  // Required fields validation
  if (!endpoint.key || typeof endpoint.key !== 'string') {
    errors.push('key is required and must be a string');
  }

  if (!endpoint.url || typeof endpoint.url !== 'string') {
    errors.push('url is required and must be a string');
  }

  if (!endpoint.labelField || typeof endpoint.labelField !== 'string') {
    errors.push('labelField is required and must be a string');
  }

  if (!endpoint.valueField || typeof endpoint.valueField !== 'string') {
    errors.push('valueField is required and must be a string');
  }

  // Optional fields validation
  if (endpoint.method && !['GET', 'POST'].includes(endpoint.method)) {
    errors.push('method must be either GET or POST');
  }

  if (endpoint.pageSize && (typeof endpoint.pageSize !== 'number' || endpoint.pageSize <= 0)) {
    errors.push('pageSize must be a positive number');
  }

  if (endpoint.cacheTime && (typeof endpoint.cacheTime !== 'number' || endpoint.cacheTime < 0)) {
    errors.push('cacheTime must be a non-negative number');
  }

  if (endpoint.staleTime && (typeof endpoint.staleTime !== 'number' || endpoint.staleTime < 0)) {
    errors.push('staleTime must be a non-negative number');
  }

  if (endpoint.headers && typeof endpoint.headers !== 'object') {
    errors.push('headers must be an object');
  }

  if (endpoint.queryParams && typeof endpoint.queryParams !== 'object') {
    errors.push('queryParams must be an object');
  }

  if (errors.length > 0) {
    throw new DropdownConfigError(
      `Invalid dropdown endpoint configuration for "${endpoint.key}": ${errors.join(', ')}`
    );
  }
}

/**
 * Merges endpoint configuration with default values
 */
export function mergeWithDefaults(endpoint: Partial<DropdownEndpoint>): DropdownEndpoint {
  return {
    ...DEFAULT_DROPDOWN_CONFIG,
    ...endpoint,
    headers: {
      ...endpoint.headers,
    },
    queryParams: {
      ...endpoint.queryParams,
    },
  } as DropdownEndpoint;
}

/**
 * Transforms raw API response data to dropdown options
 */
export function transformToDropdownOptions(
  data: any[],
  labelField: string,
  valueField: string
): DropdownOption[] {
  if (!Array.isArray(data)) {
    console.warn('Expected array for dropdown data transformation, received:', typeof data);
    return [];
  }

  return data.map((item, index) => {
    // Handle null or undefined items
    if (!item || typeof item !== 'object') {
      console.warn(`Invalid item at index ${index}:`, item);
      return {
        id: index,
        label: 'Invalid Item',
        value: index,
        disabled: true,
        metadata: item,
      };
    }

    // Extract label and value with fallbacks
    const label = getNestedValue(item, labelField) || 
                  item.name || 
                  item.label || 
                  item.title || 
                  `Item ${index + 1}`;

    const value = getNestedValue(item, valueField) || 
                  item.id || 
                  item.value || 
                  index;

    return {
      id: value,
      label: String(label),
      value: value,
      disabled: item.disabled || item.is_active === false || false,
      metadata: item,
    };
  });
}

/**
 * Gets nested value from object using dot notation
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object' || !path) {
    return undefined;
  }

  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * Extracts data array from API response using dataPath
 */
export function extractDataFromResponse(response: any, dataPath?: string): any[] {
  if (!response) {
    console.log('extractDataFromResponse: response is null/undefined');
    return [];
  }

  console.log('extractDataFromResponse: response =', response, 'dataPath =', dataPath);

  // If no dataPath specified, try common patterns
  if (!dataPath) {
    if (Array.isArray(response)) {
      console.log('extractDataFromResponse: response is array, returning it');
      return response;
    }
    if (response.data && Array.isArray(response.data)) {
      console.log('extractDataFromResponse: found response.data as array');
      return response.data;
    }
    if (response.results && Array.isArray(response.results)) {
      console.log('extractDataFromResponse: found response.results as array');
      return response.results;
    }
    if (response.items && Array.isArray(response.items)) {
      console.log('extractDataFromResponse: found response.items as array');
      return response.items;
    }
    console.log('extractDataFromResponse: no array found in response');
    return [];
  }

  // Use specified dataPath
  const data = getNestedValue(response, dataPath);
  console.log('extractDataFromResponse: extracted data =', data, 'isArray =', Array.isArray(data));
  return Array.isArray(data) ? data : [];
}

/**
 * Builds cache key for dropdown data
 */
export function buildCacheKey(
  endpoint: DropdownEndpoint,
  page?: number,
  searchTerm?: string,
  dependsOn?: string | number
): string {
  const parts = [endpoint.key];
  
  if (page !== undefined) {
    parts.push(`page:${page}`);
  }
  
  if (searchTerm) {
    parts.push(`search:${searchTerm}`);
  }
  
  if (dependsOn !== undefined) {
    parts.push(`depends:${dependsOn}`);
  }

  return parts.join('|');
}

/**
 * Sanitizes search term for API requests
 */
export function sanitizeSearchTerm(searchTerm: string): string {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return '';
  }

  return searchTerm
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 100); // Limit length
}

/**
 * Determines if endpoint supports cascading (depends on another dropdown)
 */
export function isCascadingEndpoint(endpoint: DropdownEndpoint): boolean {
  return !!(
    endpoint.queryParams &&
    Object.values(endpoint.queryParams).some(value => 
      typeof value === 'string' && value.includes('{{dependsOn}}')
    )
  );
}

/**
 * Replaces template variables in query parameters
 */
export function replaceTemplateVariables(
  queryParams: Record<string, any>,
  dependsOn?: string | number
): Record<string, any> {
  if (!queryParams) {
    return {};
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(queryParams)) {
    if (typeof value === 'string' && value.includes('{{dependsOn}}')) {
      if (dependsOn !== undefined) {
        result[key] = value.replace('{{dependsOn}}', String(dependsOn));
      }
      // Skip parameter if dependsOn is not provided
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validates that required dependencies are provided for cascading dropdowns
 */
export function validateCascadingDependencies(
  endpoint: DropdownEndpoint,
  dependsOn?: string | number
): void {
  if (isCascadingEndpoint(endpoint) && dependsOn === undefined) {
    throw new DropdownConfigError(
      `Endpoint "${endpoint.key}" requires a dependency value but none was provided`,
      'dependsOn'
    );
  }
}

/**
 * Formats error message for user display
 */
export function formatErrorMessage(error: any, endpointKey: string): string {
  if (error instanceof DropdownConfigError) {
    return error.message;
  }

  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.message;

    switch (status) {
      case 400:
        return `Invalid request for ${endpointKey}: ${message}`;
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return `Access denied for ${endpointKey}. You may not have permission to view this data.`;
      case 404:
        return `Data not found for ${endpointKey}. The endpoint may not exist.`;
      case 422:
        return `Invalid parameters for ${endpointKey}: ${message}`;
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return `Server error while loading ${endpointKey}. Please try again later.`;
      default:
        return `Error loading ${endpointKey}: ${message}`;
    }
  }

  if (error.code === 'NETWORK_ERROR' || !error.response) {
    return `Network error while loading ${endpointKey}. Please check your connection.`;
  }

  return `Unexpected error while loading ${endpointKey}: ${error.message || 'Unknown error'}`;
}

/**
 * Debounce utility for search functionality
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Creates a unique identifier for dropdown instances
 */
export function createDropdownInstanceId(): string {
  return `dropdown_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}