import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorHandler } from './errorHandler';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  version: string;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data?: any;
  timestamp: number;
  retryCount: number;
}

class OfflineStorage {
  private readonly CACHE_PREFIX = '@cache_';
  private readonly SYNC_PREFIX = '@sync_';
  private readonly CACHE_VERSION = '1.0.0';
  private readonly DEFAULT_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

  // Cache management
  async setCache<T>(key: string, data: T, duration?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: duration ? Date.now() + duration : undefined,
        version: this.CACHE_VERSION,
      };

      await AsyncStorage.setItem(
        this.CACHE_PREFIX + key,
        JSON.stringify(entry)
      );
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'setCache',
        metadata: { key },
      });
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(this.CACHE_PREFIX + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      // Check if cache is expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.removeCache(key);
        return null;
      }

      // Check version compatibility
      if (entry.version !== this.CACHE_VERSION) {
        await this.removeCache(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'getCache',
        metadata: { key },
      });
      return null;
    }
  }

  async removeCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_PREFIX + key);
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'removeCache',
        metadata: { key },
      });
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'clearAllCache',
      });
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith(this.CACHE_PREFIX)).length;
    } catch (error) {
      return 0;
    }
  }

  // Sync queue management
  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const syncOp: SyncOperation = {
        ...operation,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        retryCount: 0,
      };

      const queue = await this.getSyncQueue();
      queue.push(syncOp);

      await AsyncStorage.setItem(
        this.SYNC_PREFIX + 'queue',
        JSON.stringify(queue)
      );
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'addToSyncQueue',
        metadata: { operation },
      });
    }
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    try {
      const item = await AsyncStorage.getItem(this.SYNC_PREFIX + 'queue');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'getSyncQueue',
      });
      return [];
    }
  }

  async removeFromSyncQueue(operationId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const filteredQueue = queue.filter(op => op.id !== operationId);

      await AsyncStorage.setItem(
        this.SYNC_PREFIX + 'queue',
        JSON.stringify(filteredQueue)
      );
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'removeFromSyncQueue',
        metadata: { operationId },
      });
    }
  }

  async clearSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SYNC_PREFIX + 'queue');
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'clearSyncQueue',
      });
    }
  }

  async incrementRetryCount(operationId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const operation = queue.find(op => op.id === operationId);

      if (operation) {
        operation.retryCount += 1;
        await AsyncStorage.setItem(
          this.SYNC_PREFIX + 'queue',
          JSON.stringify(queue)
        );
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'incrementRetryCount',
        metadata: { operationId },
      });
    }
  }

  // Network status monitoring
  async isOnline(): Promise<boolean> {
    try {
      // Simple online check - try to fetch a small resource
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Smart caching with network awareness
  async getWithFallback<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options?: {
      cacheDuration?: number;
      forceRefresh?: boolean;
    }
  ): Promise<T | null> {
    const { cacheDuration = this.DEFAULT_CACHE_DURATION, forceRefresh = false } = options || {};

    // Try to get from cache first
    if (!forceRefresh) {
      const cached = await this.getCache<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Check if online
    const online = await this.isOnline();

    if (!online) {
      // Return null if offline and no cache
      return null;
    }

    try {
      // Fetch fresh data
      const data = await fetchFunction();

      // Cache the result
      await this.setCache(key, data, cacheDuration);

      return data;
    } catch (error) {
      // If fetch fails, try to return stale cache
      const cached = await this.getCache<T>(key);
      if (cached !== null) {
        return cached;
      }

      throw error;
    }
  }

  // Background sync
  async performBackgroundSync(): Promise<void> {
    const online = await this.isOnline();
    if (!online) return;

    const queue = await this.getSyncQueue();
    if (queue.length === 0) return;

    for (const operation of queue) {
      try {
        await this.syncOperation(operation);
        await this.removeFromSyncQueue(operation.id);
      } catch (error) {
        // Increment retry count
        await this.incrementRetryCount(operation.id);

        // Remove if max retries exceeded
        if (operation.retryCount >= 3) {
          await this.removeFromSyncQueue(operation.id);
          errorHandler.handleError(error as Error, {
            screen: 'OfflineStorage',
            action: 'backgroundSync',
            metadata: { operation },
          });
        }
      }
    }
  }

  private async syncOperation(operation: SyncOperation): Promise<void> {
    // This would be implemented based on your API structure
    // For now, it's a placeholder
    switch (operation.type) {
      case 'create':
        // await apiClient.post(operation.endpoint, operation.data);
        break;
      case 'update':
        // await apiClient.put(operation.endpoint, operation.data);
        break;
      case 'delete':
        // await apiClient.delete(operation.endpoint);
        break;
    }
  }

  // Storage cleanup
  async cleanup(): Promise<void> {
    try {
      // Remove expired cache entries
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

      for (const key of cacheKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          const entry: CacheEntry = JSON.parse(item);
          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            await AsyncStorage.removeItem(key);
          }
        }
      }

      // Remove old sync operations (older than 7 days)
      const queue = await this.getSyncQueue();
      const filteredQueue = queue.filter(op =>
        Date.now() - op.timestamp < 1000 * 60 * 60 * 24 * 7
      );

      if (filteredQueue.length !== queue.length) {
        await AsyncStorage.setItem(
          this.SYNC_PREFIX + 'queue',
          JSON.stringify(filteredQueue)
        );
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        screen: 'OfflineStorage',
        action: 'cleanup',
      });
    }
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorage();

// Export types
export type { OfflineStorage };

