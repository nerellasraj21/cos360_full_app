import { useMemo, useRef, useCallback } from 'react';
import { PermissionTuple } from '../src/types/permissions';

interface PermissionCacheEntry {
  result: boolean;
  timestamp: number;
  accessCount: number;
}

interface PermissionCacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  enableMetrics: boolean;
}

interface PermissionCacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalChecks: number;
  averageAccessTime: number;
}

const DEFAULT_CONFIG: PermissionCacheConfig = {
  maxSize: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
  enableMetrics: true,
};

/**
 * High-performance permission caching hook
 * Implements LRU cache with TTL and performance metrics
 */
export const usePermissionCache = (config: Partial<PermissionCacheConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const cache = useRef<Map<string, PermissionCacheEntry>>(new Map());
  const accessOrder = useRef<string[]>([]);
  const metrics = useRef<PermissionCacheMetrics>({
    hits: 0,
    misses: 0,
    evictions: 0,
    totalChecks: 0,
    averageAccessTime: 0,
  });

  // Generate cache key for permission check
  const generateCacheKey = useCallback((
    resource: string, 
    action: string, 
    additionalContext?: string
  ): string => {
    return `${resource}:${action}${additionalContext ? `:${additionalContext}` : ''}`;
  }, []);

  // Generate cache key for multiple permissions
  const generateMultiPermissionKey = useCallback((
    permissions: PermissionTuple[], 
    requireAll: boolean,
    additionalContext?: string
  ): string => {
    const permissionStr = permissions
      .map(([resource, action]) => `${resource}:${action}`)
      .sort()
      .join('|');
    return `multi:${requireAll ? 'all' : 'any'}:${permissionStr}${additionalContext ? `:${additionalContext}` : ''}`;
  }, []);

  // Clean expired entries
  const cleanExpiredEntries = useCallback(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];

    cache.current.forEach((entry, key) => {
      if (now - entry.timestamp > finalConfig.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      cache.current.delete(key);
      const index = accessOrder.current.indexOf(key);
      if (index > -1) {
        accessOrder.current.splice(index, 1);
      }
    });

    if (finalConfig.enableMetrics && expiredKeys.length > 0) {
      metrics.current.evictions += expiredKeys.length;
    }
  }, [finalConfig.ttl, finalConfig.enableMetrics]);

  // Evict least recently used entries if cache is full
  const evictLRU = useCallback(() => {
    while (cache.current.size >= finalConfig.maxSize && accessOrder.current.length > 0) {
      const lruKey = accessOrder.current.shift();
      if (lruKey) {
        cache.current.delete(lruKey);
        if (finalConfig.enableMetrics) {
          metrics.current.evictions++;
        }
      }
    }
  }, [finalConfig.maxSize, finalConfig.enableMetrics]);

  // Update access order for LRU
  const updateAccessOrder = useCallback((key: string) => {
    const index = accessOrder.current.indexOf(key);
    if (index > -1) {
      accessOrder.current.splice(index, 1);
    }
    accessOrder.current.push(key);
  }, []);

  // Get cached permission result
  const getCachedResult = useCallback((key: string): boolean | null => {
    const startTime = performance.now();
    
    cleanExpiredEntries();
    
    const entry = cache.current.get(key);
    if (entry) {
      const now = Date.now();
      if (now - entry.timestamp <= finalConfig.ttl) {
        entry.accessCount++;
        updateAccessOrder(key);
        
        if (finalConfig.enableMetrics) {
          metrics.current.hits++;
          metrics.current.totalChecks++;
          const accessTime = performance.now() - startTime;
          metrics.current.averageAccessTime = 
            (metrics.current.averageAccessTime * (metrics.current.totalChecks - 1) + accessTime) / 
            metrics.current.totalChecks;
        }
        
        return entry.result;
      } else {
        // Entry expired
        cache.current.delete(key);
        const index = accessOrder.current.indexOf(key);
        if (index > -1) {
          accessOrder.current.splice(index, 1);
        }
      }
    }

    if (finalConfig.enableMetrics) {
      metrics.current.misses++;
      metrics.current.totalChecks++;
    }

    return null;
  }, [finalConfig.ttl, finalConfig.enableMetrics, cleanExpiredEntries, updateAccessOrder]);

  // Set cached permission result
  const setCachedResult = useCallback((key: string, result: boolean) => {
    evictLRU();
    
    const entry: PermissionCacheEntry = {
      result,
      timestamp: Date.now(),
      accessCount: 1,
    };
    
    cache.current.set(key, entry);
    updateAccessOrder(key);
  }, [evictLRU, updateAccessOrder]);

  // Clear cache
  const clearCache = useCallback(() => {
    cache.current.clear();
    accessOrder.current = [];
    if (finalConfig.enableMetrics) {
      metrics.current = {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalChecks: 0,
        averageAccessTime: 0,
      };
    }
  }, [finalConfig.enableMetrics]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return {
      size: cache.current.size,
      maxSize: finalConfig.maxSize,
      hitRate: metrics.current.totalChecks > 0 
        ? metrics.current.hits / metrics.current.totalChecks 
        : 0,
      metrics: finalConfig.enableMetrics ? { ...metrics.current } : null,
    };
  }, [finalConfig.maxSize, finalConfig.enableMetrics]);

  // Get most accessed permissions (for optimization insights)
  const getMostAccessedPermissions = useCallback((limit: number = 10) => {
    const entries = Array.from(cache.current.entries())
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
    
    return entries;
  }, []);

  return useMemo(() => ({
    generateCacheKey,
    generateMultiPermissionKey,
    getCachedResult,
    setCachedResult,
    clearCache,
    getCacheStats,
    getMostAccessedPermissions,
  }), [
    generateCacheKey,
    generateMultiPermissionKey,
    getCachedResult,
    setCachedResult,
    clearCache,
    getCacheStats,
    getMostAccessedPermissions,
  ]);
};