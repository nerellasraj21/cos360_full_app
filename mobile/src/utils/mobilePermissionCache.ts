import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'

const PERMISSION_CACHE_KEY = 'permission-cache'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

interface CachedPermissions {
  permissionsMap: Record<string, string[]>
  timestamp: number
  userId: string
}

export class MobilePermissionCache {
  static async getCachedPermissions(userId: string): Promise<Record<string, string[]> | null> {
    try {
      const cached = await AsyncStorage.getItem(PERMISSION_CACHE_KEY)
      if (!cached) return null

      const parsed: CachedPermissions = JSON.parse(cached)

      // Check if cache is for the same user and not expired
      if (parsed.userId !== userId) return null
      if (Date.now() - parsed.timestamp > CACHE_EXPIRY) return null

      return parsed.permissionsMap
    } catch (error) {
      console.error('Failed to get cached permissions:', error)
      return null
    }
  }

  static async setCachedPermissions(
    userId: string,
    permissionsMap: Record<string, string[]>
  ): Promise<void> {
    try {
      const cacheData: CachedPermissions = {
        permissionsMap,
        timestamp: Date.now(),
        userId,
      }

      await AsyncStorage.setItem(PERMISSION_CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Failed to cache permissions:', error)
    }
  }

  static async shouldSyncPermissions(): Promise<boolean> {
    const netInfo = await NetInfo.fetch()
    return netInfo.isConnected === true
  }

  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PERMISSION_CACHE_KEY)
    } catch (error) {
      console.error('Failed to clear permission cache:', error)
    }
  }

  static async isCacheValid(userId: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(PERMISSION_CACHE_KEY)
      if (!cached) return false

      const parsed: CachedPermissions = JSON.parse(cached)

      // Check if cache is for the same user and not expired
      return parsed.userId === userId && (Date.now() - parsed.timestamp) <= CACHE_EXPIRY
    } catch (error) {
      console.error('Failed to check cache validity:', error)
      return false
    }
  }

  static async getCacheAge(userId: string): Promise<number | null> {
    try {
      const cached = await AsyncStorage.getItem(PERMISSION_CACHE_KEY)
      if (!cached) return null

      const parsed: CachedPermissions = JSON.parse(cached)

      if (parsed.userId !== userId) return null

      return Date.now() - parsed.timestamp
    } catch (error) {
      console.error('Failed to get cache age:', error)
      return null
    }
  }

  // Force refresh cache with new permissions
  static async refreshCache(
    userId: string,
    permissionsMap: Record<string, string[]>
  ): Promise<void> {
    await this.clearCache()
    await this.setCachedPermissions(userId, permissionsMap)
  }

  // Get cache metadata without the actual permissions
  static async getCacheMetadata(): Promise<{ userId: string; timestamp: number; age: number } | null> {
    try {
      const cached = await AsyncStorage.getItem(PERMISSION_CACHE_KEY)
      if (!cached) return null

      const parsed: CachedPermissions = JSON.parse(cached)

      return {
        userId: parsed.userId,
        timestamp: parsed.timestamp,
        age: Date.now() - parsed.timestamp,
      }
    } catch (error) {
      console.error('Failed to get cache metadata:', error)
      return null
    }
  }
}

// Utility functions for permission management
export const permissionUtils = {
  // Check if permissions need syncing
  shouldSyncPermissions: async (userId: string): Promise<boolean> => {
    const isOnline = await MobilePermissionCache.shouldSyncPermissions()
    if (!isOnline) return false

    const isValid = await MobilePermissionCache.isCacheValid(userId)
    return !isValid
  },

  // Get permissions with fallback to cache
  getPermissionsWithFallback: async (
    userId: string,
    fetchFromServer: () => Promise<Record<string, string[]>>
  ): Promise<Record<string, string[]>> => {
    // Try to get from cache first
    const cached = await MobilePermissionCache.getCachedPermissions(userId)
    if (cached) {
      // Check if we should sync in background
      const shouldSync = await permissionUtils.shouldSyncPermissions(userId)
      if (shouldSync) {
        // Sync in background without blocking
        fetchFromServer()
          .then(permissions => MobilePermissionCache.setCachedPermissions(userId, permissions))
          .catch(error => console.error('Background permission sync failed:', error))
      }

      return cached
    }

    // No cache, fetch from server
    const permissions = await fetchFromServer()
    await MobilePermissionCache.setCachedPermissions(userId, permissions)
    return permissions
  },

  // Validate permission format
  validatePermissionString: (permission: string): boolean => {
    const parts = permission.split(':')
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0
  },

  // Convert permission array to map
  permissionsToMap: (permissions: Array<{ resource: string; action: string; is_granted: boolean }>): Record<string, string[]> => {
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = []
      }
      if (perm.is_granted) {
        acc[perm.resource].push(perm.action)
      }
      return acc
    }, {} as Record<string, string[]>)
  },
}