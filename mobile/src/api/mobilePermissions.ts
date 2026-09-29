// NOTE: This file is not currently called anywhere in the app. Permission checking
// is handled entirely by AuthContext + useMobilePermission (which delegates to useAuth).
// Kept for future use but should not be wired up without resolving H-2 (dual auth stores).
import { MobilePermissionCache, permissionUtils } from '../utils/mobilePermissionCache'

export interface PermissionSyncResponse {
  permissions: Array<{
    resource: string
    actions: string[]
  }>
  last_sync: string
}

export interface BulkPermissionCheckResponse {
  permissions: Record<string, string[]>
}

export const mobilePermissionsApi = {
  /**
   * Returns cached permissions for the user.
   * Note: The backend has no dedicated mobile-permissions sync endpoint.
   * Permissions are embedded in the login response and cached at login time.
   */
  async syncPermissions(userId: string): Promise<PermissionSyncResponse> {
    const cached = await MobilePermissionCache.getCachedPermissions(userId)
    const permissions = cached
      ? Object.entries(cached).map(([resource, actions]) => ({ resource, actions }))
      : []
    return { permissions, last_sync: new Date().toISOString() }
  },

  /**
   * Check a single permission from cache.
   * Caller must supply userId (obtain from AuthContext).
   */
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    if (!userId) return false
    const cached = await MobilePermissionCache.getCachedPermissions(userId)
    return cached?.[resource]?.includes(action) ?? false
  },

  /**
   * Check multiple permissions from cache.
   * Caller must supply userId (obtain from AuthContext).
   */
  async checkBulkPermissions(userId: string, resources: string[]): Promise<Record<string, string[]>> {
    if (!userId) return {}
    const cached = await MobilePermissionCache.getCachedPermissions(userId)
    if (!cached) return {}
    return resources.reduce((acc, resource) => {
      acc[resource] = cached[resource] || []
      return acc
    }, {} as Record<string, string[]>)
  },

  /**
   * Get all permissions for current user with smart caching
   */
  async getAllPermissions(userId: string): Promise<Record<string, string[]>> {
    return permissionUtils.getPermissionsWithFallback(
      userId,
      async () => {
        const response = await this.syncPermissions(userId)
        return response.permissions.reduce((acc: Record<string, string[]>, perm: any) => {
          acc[perm.resource] = perm.actions
          return acc
        }, {})
      }
    )
  },

  /**
   * Force refresh permissions from server
   */
  async refreshPermissions(userId: string): Promise<void> {
    const permissionsMap = await this.getAllPermissions(userId)
    await MobilePermissionCache.refreshCache(userId, permissionsMap)
  },

  /**
   * Check if permissions need syncing
   */
  async shouldSyncPermissions(userId: string): Promise<boolean> {
    return permissionUtils.shouldSyncPermissions(userId)
  },

  /**
   * Get permission cache metadata
   */
  async getCacheMetadata(_userId: string) {
    return MobilePermissionCache.getCacheMetadata()
  },

  /**
   * Clear permission cache
   */
  async clearCache(): Promise<void> {
    await MobilePermissionCache.clearCache()
  },
}

// Auto-sync permissions when coming online.
// Returns a cleanup function — MUST be called when the caller unmounts/deinitialises
// to prevent the subscription from leaking across sessions.
// userId and isOnline must be supplied by the caller (obtain from AuthContext).
export const initializePermissionSync = (userId: string, isOnline: boolean, onlineStream: {
  subscribe: (cb: (isOnline: boolean) => void) => () => void
}) => {
  const syncPermissions = async () => {
    if (!userId || !isOnline) return
    const shouldSync = await mobilePermissionsApi.shouldSyncPermissions(userId)
    if (shouldSync) {
      try {
        await mobilePermissionsApi.syncPermissions(userId)
        if (__DEV__) console.log('Permissions auto-synced successfully')
      } catch (error) {
        console.error('Failed to auto-sync permissions:', error)
      }
    }
  }

  // Subscribe to online-state changes; store the unsubscribe handle to prevent leaks
  const unsubscribe = onlineStream.subscribe((nowOnline) => {
    if (nowOnline) syncPermissions()
  })

  // Initial sync if already online
  if (isOnline) syncPermissions()

  return unsubscribe
}