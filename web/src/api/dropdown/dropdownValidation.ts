import type { DropdownEndpoint } from '../../types/dropdown';
import { DROPDOWN_ENDPOINTS } from '../../constants/dropdown/endpoints';
import { validateDropdownEndpoint, DropdownConfigError } from './dropdownUtils';

/**
 * Validation result for endpoint configurations
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  endpointKey: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  endpointKey: string;
  field?: string;
  message: string;
  suggestion?: string;
}

/**
 * Validates all dropdown endpoint configurations
 */
export function validateAllEndpoints(): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const [key, endpoint] of Object.entries(DROPDOWN_ENDPOINTS)) {
    try {
      validateDropdownEndpoint(endpoint);
      
      // Additional validations and warnings
      const endpointWarnings = validateEndpointBestPractices(key, endpoint);
      warnings.push(...endpointWarnings);
      
    } catch (error) {
      if (error instanceof DropdownConfigError) {
        errors.push({
          endpointKey: key,
          field: error.field,
          message: error.message,
          severity: 'error',
        });
      } else {
        errors.push({
          endpointKey: key,
          message: `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates best practices for endpoint configuration
 */
function validateEndpointBestPractices(
  key: string,
  endpoint: DropdownEndpoint
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check for reasonable page size
  if (endpoint.pageSize && endpoint.pageSize > 100) {
    warnings.push({
      endpointKey: key,
      field: 'pageSize',
      message: 'Page size is quite large, which may impact performance',
      suggestion: 'Consider using a smaller page size (20-50 items)',
    });
  }

  if (endpoint.pageSize && endpoint.pageSize < 10) {
    warnings.push({
      endpointKey: key,
      field: 'pageSize',
      message: 'Page size is very small, which may cause excessive API calls',
      suggestion: 'Consider using a larger page size (20-50 items)',
    });
  }

  // Check cache configuration
  if (!endpoint.cacheTime || endpoint.cacheTime < 60000) { // Less than 1 minute
    warnings.push({
      endpointKey: key,
      field: 'cacheTime',
      message: 'Cache time is very short or not set',
      suggestion: 'Consider setting cache time to at least 1-5 minutes for better performance',
    });
  }

  if (endpoint.cacheTime && endpoint.cacheTime > 30 * 60 * 1000) { // More than 30 minutes
    warnings.push({
      endpointKey: key,
      field: 'cacheTime',
      message: 'Cache time is very long',
      suggestion: 'Consider shorter cache time to ensure data freshness',
    });
  }

  // Check stale time vs cache time
  if (endpoint.staleTime && endpoint.cacheTime && endpoint.staleTime >= endpoint.cacheTime) {
    warnings.push({
      endpointKey: key,
      field: 'staleTime',
      message: 'Stale time should be less than cache time',
      suggestion: 'Set stale time to be 30-50% of cache time',
    });
  }

  // Check URL patterns
  if (!endpoint.url.startsWith('/api/')) {
    warnings.push({
      endpointKey: key,
      field: 'url',
      message: 'URL does not follow expected API pattern',
      suggestion: 'URLs should start with /api/ for consistency',
    });
  }

  // Check for search support
  if (!endpoint.searchParam) {
    warnings.push({
      endpointKey: key,
      field: 'searchParam',
      message: 'No search parameter configured',
      suggestion: 'Consider adding search support for better user experience',
    });
  }

  // Check field naming conventions
  if (!endpoint.labelField.includes('name') && !endpoint.labelField.includes('title')) {
    warnings.push({
      endpointKey: key,
      field: 'labelField',
      message: 'Label field name may not be intuitive',
      suggestion: 'Consider using fields with "name" or "title" in the name',
    });
  }

  return warnings;
}

/**
 * Validates a single endpoint configuration
 */
export function validateSingleEndpoint(
  key: string,
  endpoint: DropdownEndpoint
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    validateDropdownEndpoint(endpoint);
    const endpointWarnings = validateEndpointBestPractices(key, endpoint);
    warnings.push(...endpointWarnings);
  } catch (error) {
    if (error instanceof DropdownConfigError) {
      errors.push({
        endpointKey: key,
        field: error.field,
        message: error.message,
        severity: 'error',
      });
    } else {
      errors.push({
        endpointKey: key,
        message: `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates endpoint configuration at runtime
 */
export function validateEndpointAtRuntime(
  endpoint: DropdownEndpoint,
  context: {
    searchTerm?: string;
    dependsOn?: string | number;
    page?: number;
  } = {}
): void {
  // Basic configuration validation
  validateDropdownEndpoint(endpoint);

  // Runtime context validation
  if (context.page !== undefined && context.page < 1) {
    throw new DropdownConfigError('Page number must be greater than 0', 'page');
  }

  if (context.searchTerm !== undefined && context.searchTerm.length > 100) {
    throw new DropdownConfigError('Search term is too long (max 100 characters)', 'searchTerm');
  }

  // Validate cascading dependencies
  const hasDependencyPlaceholder = endpoint.queryParams && 
    Object.values(endpoint.queryParams).some(value => 
      typeof value === 'string' && value.includes('{{dependsOn}}')
    );

  if (hasDependencyPlaceholder && context.dependsOn === undefined) {
    throw new DropdownConfigError(
      `Endpoint "${endpoint.key}" requires a dependency value`,
      'dependsOn'
    );
  }
}

/**
 * Gets endpoint by key with validation
 */
export function getValidatedEndpoint(key: string): DropdownEndpoint {
  const endpoint = DROPDOWN_ENDPOINTS[key];
  
  if (!endpoint) {
    throw new DropdownConfigError(`Endpoint configuration not found for key: ${key}`);
  }

  validateDropdownEndpoint(endpoint);
  return endpoint;
}

/**
 * Lists all available endpoint keys
 */
export function getAvailableEndpointKeys(): string[] {
  return Object.keys(DROPDOWN_ENDPOINTS);
}

/**
 * Gets endpoint configuration summary for debugging
 */
export function getEndpointSummary(key: string): {
  key: string;
  url: string;
  method: string;
  hasSearch: boolean;
  hasPagination: boolean;
  isCascading: boolean;
  cacheConfig: {
    cacheTime?: number;
    staleTime?: number;
  };
} {
  const endpoint = getValidatedEndpoint(key);
  
  return {
    key: endpoint.key,
    url: endpoint.url,
    method: endpoint.method || 'GET',
    hasSearch: !!endpoint.searchParam,
    hasPagination: !!(endpoint.pageParam && endpoint.pageSizeParam),
    isCascading: !!(endpoint.queryParams && 
      Object.values(endpoint.queryParams).some(value => 
        typeof value === 'string' && value.includes('{{dependsOn}}')
      )),
    cacheConfig: {
      cacheTime: endpoint.cacheTime,
      staleTime: endpoint.staleTime,
    },
  };
}

/**
 * Validates all endpoints and logs results (for development)
 */
export function validateAndLogEndpoints(): void {
  const result = validateAllEndpoints();
  
  console.group('Dropdown Endpoint Validation Results');
  
  if (result.isValid) {
    console.log('✅ All endpoint configurations are valid');
  } else {
    console.error(`❌ Found ${result.errors.length} validation errors`);
    result.errors.forEach(error => {
      console.error(`  - ${error.endpointKey}: ${error.message}`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.warn(`⚠️  Found ${result.warnings.length} warnings`);
    result.warnings.forEach(warning => {
      console.warn(`  - ${warning.endpointKey}: ${warning.message}`);
      if (warning.suggestion) {
        console.warn(`    Suggestion: ${warning.suggestion}`);
      }
    });
  }
  
  console.groupEnd();
}

// Run validation in development mode
if (process.env.NODE_ENV === 'development') {
  validateAndLogEndpoints();
}