
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ExpenseCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateByPrefixes(prefixes: string[]): void {
    for (const key of this.cache.keys()) {
      if (prefixes.some(prefix => key.startsWith(prefix))) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Specific cache invalidation methods
  invalidateCategories(): void {
    this.invalidateByPrefixes(['categories', 'types']); // Types depend on categories
  }

  invalidateTypes(): void {
    this.invalidateByPrefixes(['types', 'transactions']); // Transactions depend on types
  }

  invalidateTransactions(): void {
    this.invalidateByPrefixes(['transactions', 'attachments', 'audit']);
  }

  invalidateAttachments(): void {
    this.invalidate('attachments');
  }

  invalidateAudit(): void {
    this.invalidate('audit');
  }

  invalidateSettings(): void {
    this.invalidate('settings');
  }

  invalidateReports(): void {
    this.invalidate('reports');
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const expenseCache = new ExpenseCache();

// ============================================================================
// PAGINATED DATA CACHE HOOK
// ============================================================================

import { useState, useEffect } from 'react';

interface PaginationState {
  skip: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationState;
}

export function usePaginatedExpenseData<T>(
  fetchFunction: (skip: number, limit: number) => Promise<{ items: T[]; total: number }>,
  cacheKey: string,
  defaultLimit: number = 50
) {
  const [data, setData] = useState<PaginatedData<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (skip: number = 0, limit: number = defaultLimit, force: boolean = false) => {
    const cacheKeyWithParams = `${cacheKey}_${skip}_${limit}`;

    if (!force) {
      const cached = expenseCache.get<PaginatedData<T>>(cacheKeyWithParams);
      if (cached) {
        setData(cached);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchFunction(skip, limit);
      const paginatedData: PaginatedData<T> = {
        items: response.items,
        pagination: {
          skip,
          limit,
          total: response.total,
          hasNext: skip + limit < response.total,
          hasPrev: skip > 0
        }
      };

      setData(paginatedData);
      expenseCache.set(cacheKeyWithParams, paginatedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadNext = () => {
    if (data?.pagination.hasNext) {
      loadData(data.pagination.skip + data.pagination.limit, data.pagination.limit);
    }
  };

  const loadPrev = () => {
    if (data?.pagination.hasPrev) {
      const newSkip = Math.max(0, data.pagination.skip - data.pagination.limit);
      loadData(newSkip, data.pagination.limit);
    }
  };

  return {
    data,
    loading,
    error,
    loadData,
    loadNext,
    loadPrev,
    refresh: () => loadData(data?.pagination.skip || 0, data?.pagination.limit || defaultLimit, true)
  };
}

// ============================================================================
// SPECIFIC CACHE UTILITIES
// ============================================================================

export const expenseCacheUtils = {
  // Generate cache keys for different entities
  getCategoryKey: (params?: any) => `categories_${JSON.stringify(params || {})}`,
  getTypeKey: (params?: any) => `types_${JSON.stringify(params || {})}`,
  getTransactionKey: (params?: any) => `transactions_${JSON.stringify(params || {})}`,
  getAttachmentKey: (transactionId: string) => `attachments_${transactionId}`,
  getAuditKey: (transactionId: string, params?: any) => `audit_${transactionId}_${JSON.stringify(params || {})}`,
  getSettingsKey: (params?: any) => `settings_${JSON.stringify(params || {})}`,
  getReportKey: (filters: any) => `reports_${JSON.stringify(filters)}`,

  // Cache TTL constants
  TTL: {
    SHORT: 1 * 60 * 1000,    // 1 minute
    MEDIUM: 5 * 60 * 1000,   // 5 minutes
    LONG: 15 * 60 * 1000,    // 15 minutes
    EXTRA_LONG: 60 * 60 * 1000 // 1 hour
  }
};