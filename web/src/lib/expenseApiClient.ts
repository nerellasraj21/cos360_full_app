import CAxios from '@/api/index';
import type {
  ExpenseCategoryCreateRequest,
  ExpenseCategoryUpdateRequest,
  ExpenseCategoryRead,
  ExpenseCategoryDropdown,
  ExpenseCategoryListResponse
} from '@/types/expense/index';

// Define missing types
interface ExpenseCategoryFilters {
  skip?: number;
  limit?: number;
  active_only?: boolean;
}

interface ExpenseCategoryDeleteResponse {
  message: string;
  category_id: string;
  deleted_at: string;
}


export class ExpenseApiError extends Error {
  constructor(
    public error_code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Rate limiting configuration
const RATE_LIMITS = {
  '/expense/transactions': 50, // requests per minute
  '/expense/transactions/': 50,
  '/expense/categories': 100,
  '/expense/types': 100,
  '/expense/types/dropdown': 200,
  '/expense/categories/dropdown': 200,
  '/expense/transactions/pending/approval': 50,
  '/expense/transactions/*/approval': 20,
} as const;

class ExpenseApiClient {
  private requestCounts = new Map<string, number>();
  private resetTimes = new Map<string, number>();

  private getRateLimit(endpoint: string): number {
    // Find matching endpoint pattern
    for (const [pattern, limit] of Object.entries(RATE_LIMITS)) {
      if (endpoint.includes(pattern.replace('*', ''))) {
        return limit;
      }
    }
    return 100; // Default rate limit
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const limit = this.getRateLimit(endpoint);
    const current = this.requestCounts.get(endpoint) || 0;
    const now = Date.now();
    const resetTime = this.resetTimes.get(endpoint) || now;

    // Reset counter if minute has passed
    if (now >= resetTime) {
      this.requestCounts.set(endpoint, 0);
      this.resetTimes.set(endpoint, now + 60000); // Reset in 1 minute
    }

    if (current >= limit) {
      const waitTime = resetTime - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requestCounts.set(endpoint, current + 1);
  }

  async apiCall<T>(
    endpoint: string,
    options: any = {}
  ): Promise<T> {
    await this.checkRateLimit(endpoint);

    try {
      // Prepare axios config
      const axiosConfig: any = {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        data: options.body ? JSON.parse(options.body) : undefined,
        ...options
      };

      // Remove conflicting properties
      delete axiosConfig.body;
      delete axiosConfig.headers;

      const response = await CAxios(endpoint, axiosConfig);

      return response.data.data || response.data;
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data;
        throw new ExpenseApiError(
          errorData.error_code || 'UNKNOWN_ERROR',
          errorData.message || 'An error occurred',
          errorData.details
        );
      } else if (error instanceof ExpenseApiError) {
        throw error;
      } else {
        throw new ExpenseApiError(
          'NETWORK_ERROR',
          'Network error occurred',
          error.message
        );
      }
    }
  }

  private getToken(): string {
    // Get token from auth store or localStorage
    return localStorage.getItem('authToken') || '';
  }
}

// Export singleton instance
export const expenseApiClient = new ExpenseApiClient();

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export function handleBusinessError(error: ExpenseApiError): void {
  // Handle business logic errors
  switch (error.error_code) {
    case 'VALIDATION_ERROR':
      console.error('Validation error:', error.details);
      break;
    case 'DUPLICATE_IDEMPOTENCY_KEY':
      console.error('Duplicate transaction detected');
      break;
    case 'INSUFFICIENT_PERMISSIONS':
      console.error('Insufficient permissions');
      break;
    case 'DEPARTMENT_ACCESS_DENIED':
      console.error('Department access denied');
      break;
    case 'INACTIVE_EXPENSE_TYPE':
      console.error('Cannot use inactive expense type');
      break;
    case 'TRANSACTION_IMMUTABLE':
      console.error('Transaction cannot be modified');
      break;
    case 'INVALID_STATUS_FOR_APPROVAL':
      console.error('Invalid status for approval');
      break;
    case 'RATE_LIMIT_EXCEEDED':
      console.error('Rate limit exceeded');
      break;
    default:
      console.error('Business error:', error.message);
  }
}

export function handleSystemError(error: Error): void {
  // Handle network/system errors
  console.error('System error:', error.message);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

export function formatTransactionDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
}

// ============================================================================
// EXPENSE CATEGORY API METHODS
// ============================================================================

export class ExpenseCategoryApi {
  // Create Expense Category
  static async create(data: ExpenseCategoryCreateRequest): Promise<ExpenseCategoryRead> {
    return expenseApiClient.apiCall<ExpenseCategoryRead>(
      '/expense/categories',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  }

  // Get All Expense Categories
  static async getAll(filters?: ExpenseCategoryFilters): Promise<ExpenseCategoryListResponse> {
    const params = new URLSearchParams();
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.active_only !== undefined) params.append('active_only', filters.active_only.toString());

    const queryString = params.toString();
    const endpoint = `/expense/categories${queryString ? `?${queryString}` : ''}`;

    return expenseApiClient.apiCall<ExpenseCategoryListResponse>(endpoint);
  }

  // Get Expense Categories for Dropdown
  static async getDropdown(): Promise<ExpenseCategoryDropdown[]> {
    return expenseApiClient.apiCall<ExpenseCategoryDropdown[]>('/expense/categories/dropdown');
  }

  // Get Single Expense Category
  static async getById(categoryId: string): Promise<ExpenseCategoryRead> {
    return expenseApiClient.apiCall<ExpenseCategoryRead>(`/expense/categories/${categoryId}`);
  }

  // Update Expense Category
  static async update(categoryId: string, data: ExpenseCategoryUpdateRequest): Promise<ExpenseCategoryRead> {
    return expenseApiClient.apiCall<ExpenseCategoryRead>(
      `/expense/categories/${categoryId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    );
  }

  // Delete Expense Category
  static async delete(categoryId: string): Promise<ExpenseCategoryDeleteResponse> {
    return expenseApiClient.apiCall<ExpenseCategoryDeleteResponse>(
      `/expense/categories/${categoryId}`,
      {
        method: 'DELETE'
      }
    );
  }
}

// Export types for use in components
export type {
  ExpenseCategoryCreateRequest,
  ExpenseCategoryUpdateRequest,
  ExpenseCategoryRead,
  ExpenseCategoryDropdown,
  ExpenseCategoryListResponse
} from '@/types/expense/index';

// Export local types
export type { ExpenseCategoryFilters, ExpenseCategoryDeleteResponse };