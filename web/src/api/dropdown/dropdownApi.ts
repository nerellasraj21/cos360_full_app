import CAxios from '../index';
import type { 
  DropdownEndpoint, 
  DropdownResponse, 
  DropdownOption,
  DropdownApiService,
  ErrorRecoveryConfig 
} from '../../types/dropdown';
import { 
  replaceTemplateVariables, 
  sanitizeSearchTerm,
  extractDataFromResponse,
  transformToDropdownOptions 
} from './dropdownUtils';

/**
 * Error recovery configuration for different error types
 */
const ERROR_RECOVERY_CONFIG: ErrorRecoveryConfig = {
  networkError: {
    retryCount: 3,
    retryDelay: [1000, 2000, 4000],
    fallbackToCached: true
  },
  rateLimit: {
    retryCount: 5,
    retryDelay: [2000, 4000, 8000, 16000, 32000],
    showUserNotification: true
  },
  serverError: {
    retryCount: 2,
    retryDelay: [1000, 3000],
    fallbackToCached: true,
    reportError: true
  }
};

/**
 * Custom error class for dropdown API errors
 */
export class DropdownApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DropdownApiError';
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Determines error type based on status code or error type
 */
const getErrorType = (error: any): keyof ErrorRecoveryConfig => {
  if (error.code === 'NETWORK_ERROR' || !error.response) {
    return 'networkError';
  }
  
  if (error.response?.status === 429) {
    return 'rateLimit';
  }
  
  return 'serverError';
};

/**
 * Dropdown API service implementation
 */
class DropdownApiServiceImpl implements DropdownApiService {
  /**
   * Builds query parameters for API requests
   */
  buildQueryParams(
    endpoint: DropdownEndpoint,
    page?: number,
    searchTerm?: string,
    dependsOn?: string | number
  ): Record<string, any> {
    // Start with base query params and replace template variables
    const params: Record<string, any> = replaceTemplateVariables(
      endpoint.queryParams || {},
      dependsOn
    );

    // Add pagination parameters
    if (page !== undefined && endpoint.pageParam) {
      params[endpoint.pageParam] = page;
    }
    
    if (endpoint.pageSizeParam && endpoint.pageSize) {
      params[endpoint.pageSizeParam] = endpoint.pageSize;
    }

    // Add search parameter (sanitized)
    if (searchTerm && endpoint.searchParam) {
      params[endpoint.searchParam] = sanitizeSearchTerm(searchTerm);
    }

    return params;
  }

  /**
   * Transforms API response data to dropdown options
   */
  transformResponseData(
    response: any,
    endpoint: DropdownEndpoint
  ): DropdownOption[] {
    // Extract data array from response using utility function
    const dataArray = extractDataFromResponse(response, endpoint.dataPath);
    
    // Transform using utility function
    return transformToDropdownOptions(dataArray, endpoint.labelField, endpoint.valueField);
  }

  /**
   * Makes API request with retry logic and error handling
   */
  private async makeRequestWithRetry(
    endpoint: DropdownEndpoint,
    params: Record<string, any>,
    attempt: number = 0
  ): Promise<any> {
    try {
      const config = {
        method: endpoint.method || 'GET',
        url: endpoint.url,
        params,
        headers: {
          ...endpoint.headers,
        },
      };

      const response = await CAxios.request(config);
      return response.data;
    } catch (error: any) {
      const errorType = getErrorType(error);
      const recoveryConfig = ERROR_RECOVERY_CONFIG[errorType];

      // If retries are exhausted, throw the error
      if (attempt >= recoveryConfig.retryCount) {
        const statusCode = error.response?.status;
        const message = this.getErrorMessage(error, statusCode);
        throw new DropdownApiError(message, statusCode, error);
      }

      // Wait before retrying
      const delay = recoveryConfig.retryDelay[attempt] || recoveryConfig.retryDelay[recoveryConfig.retryDelay.length - 1];
      await sleep(delay);

      // Retry the request
      return this.makeRequestWithRetry(endpoint, params, attempt + 1);
    }
  }

  /**
   * Gets user-friendly error message based on error type
   */
  private getErrorMessage(error: any, statusCode?: number): string {
    if (!error.response) {
      return 'Network error. Please check your connection and try again.';
    }

    switch (statusCode) {
      case 401:
        return 'Authentication failed. Please log in again.';
      case 403:
        return 'You do not have permission to access this data.';
      case 404:
        return 'The requested data could not be found.';
      case 422:
        return 'Invalid request parameters.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.response?.data?.message || 'An unexpected error occurred.';
    }
  }

  /**
   * Fetches dropdown data from API with pagination and search support
   */
  async fetchDropdownData(
    endpoint: DropdownEndpoint,
    page: number = 1,
    searchTerm?: string,
    dependsOn?: string | number
  ): Promise<DropdownResponse> {
    // Build query parameters
    const params = this.buildQueryParams(endpoint, page, searchTerm, dependsOn);

    try {
      // Make API request with retry logic
      const responseData = await this.makeRequestWithRetry(endpoint, params);
      console.log('Dropdown API response for', endpoint.key, ':', responseData);

      // Transform response data
      const transformedData = this.transformResponseData(responseData, endpoint);
      console.log('Transformed data for', endpoint.key, ':', transformedData);

      // Determine pagination info
      const hasNextPage = this.determineHasNextPage(responseData, transformedData, endpoint);
      const nextCursor = this.getNextCursor(responseData, page);
      const total = this.getTotal(responseData);

      return {
        data: transformedData,
        hasNextPage,
        nextCursor,
        total
      };
    } catch (error) {
      // Re-throw DropdownApiError as-is, wrap others
      if (error instanceof DropdownApiError) {
        throw error;
      }

      throw new DropdownApiError(
        'Failed to fetch dropdown data',
        undefined,
        error
      );
    }
  }

  /**
   * Determines if there are more pages available
   */
  private determineHasNextPage(
    responseData: any,
    transformedData: DropdownOption[],
    endpoint: DropdownEndpoint
  ): boolean {
    // Check if response has explicit pagination info
    if (responseData.hasNextPage !== undefined) {
      return responseData.hasNextPage;
    }
    
    if (responseData.has_next_page !== undefined) {
      return responseData.has_next_page;
    }

    // Check if we got a full page of results
    if (endpoint.pageSize && transformedData.length >= endpoint.pageSize) {
      return true;
    }

    // Check total count vs current data
    if (responseData.total && responseData.current_page) {
      const totalPages = Math.ceil(responseData.total / (endpoint.pageSize || 20));
      return responseData.current_page < totalPages;
    }

    // Default to false if we can't determine
    return false;
  }

  /**
   * Gets the next cursor/page identifier
   */
  private getNextCursor(responseData: any, currentPage: number): string | number | undefined {
    if (responseData.nextCursor !== undefined) {
      return responseData.nextCursor;
    }
    
    if (responseData.next_cursor !== undefined) {
      return responseData.next_cursor;
    }

    // Default to next page number
    return currentPage + 1;
  }

  /**
   * Gets total count from response
   */
  private getTotal(responseData: any): number | undefined {
    return responseData.total || responseData.count || responseData.total_count;
  }
}

/**
 * Singleton instance of the dropdown API service
 */
export const dropdownApi = new DropdownApiServiceImpl();