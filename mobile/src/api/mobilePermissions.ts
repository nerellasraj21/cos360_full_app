import apiClient from './client'
import { MobilePermissionCache, permissionUtils } from '../utils/mobilePermissionCache'
import { useMobileAuthStore } from '../stores/mobileAuthStore'

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
   * Sync permissions from server and cache them
   */
  async syncPermissions(userId: string): Promise<PermissionSyncResponse> {
    try {
      const response = await apiClient.get('/auth/mobile/permissions/sync')
      const data = response.data

      // Cache the permissions for offline use
      const permissionsMap = data.permissions.reduce((acc: Record<string, string[]>, perm: any) => {
        acc[perm.resource] = perm.actions
        return acc
      }, {})

      await MobilePermissionCache.setCachedPermissions(userId, permissionsMap)

      // Update the store
      useMobileAuthStore.getState().login({
        user: useMobileAuthStore.getState().user!,
        role: useMobileAuthStore.getState().role,
        permissions: data.permissions.flatMap((perm: any) =>
          perm.actions.map((action: string) => ({
            resource: perm.resource,
            action,
            is_granted: true
          }))
        ),
        access_token: useMobileAuthStore.getState().accessToken!,
        refresh_token: useMobileAuthStore.getState().refreshToken!,
      })

      return data
    } catch (error) {
      console.error('Failed to sync permissions:', error)
      throw error
    }
  },

  /**
   * Check a single permission online
   */
  async checkPermission(resource: string, action: string): Promise<boolean> {
    try {
      const response = await apiClient.post('/auth/permissions/check', {
        resource,
        action,
      })
      return response.data.granted
    } catch (error) {
      console.warn('Online permission check failed, using cache')
      // Fallback to cached permissions
      const userId = useMobileAuthStore.getState().user?.id
      if (userId) {
        const cached = await MobilePermissionCache.getCachedPermissions(userId)
        return cached?.[resource]?.includes(action) || false
      }
      return false
    }
  },

  /**
   * Check multiple permissions at once
   */
  async checkBulkPermissions(resources: string[]): Promise<Record<string, string[]>> {
    try {
      const response = await apiClient.post('/auth/permissions/bulk-check', {
        resources,
      })
      return response.data.permissions
    } catch (error) {
      console.warn('Bulk permission check failed, using cache')
      // Fallback to cached permissions
      const userId = useMobileAuthStore.getState().user?.id
      if (userId) {
        const cached = await MobilePermissionCache.getCachedPermissions(userId)
        if (cached) {
          return resources.reduce((acc, resource) => {
            acc[resource] = cached[resource] || []
            return acc
          }, {} as Record<string, string[]>)
        }
      }
      return {}
    }
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
  async getCacheMetadata(userId: string) {
    return MobilePermissionCache.getCacheMetadata()
  },

  /**
   * Clear permission cache
   */
  async clearCache(): Promise<void> {
    await MobilePermissionCache.clearCache()
  },
}

// Auto-sync permissions when coming online
export const initializePermissionSync = () => {
  const syncPermissions = async () => {
    const userId = useMobileAuthStore.getState().user?.id
    const isOnline = useMobileAuthStore.getState().isOnline

    if (userId && isOnline) {
      const shouldSync = await mobilePermissionsApi.shouldSyncPermissions(userId)
      if (shouldSync) {
        try {
          await mobilePermissionsApi.syncPermissions(userId)
          console.log('Permissions auto-synced successfully')
        } catch (error) {
          console.error('Failed to auto-sync permissions:', error)
        }
      }
    }
  }

  // Sync when coming online
  useMobileAuthStore.subscribe((state, prevState) => {
    if (!prevState.isOnline && state.isOnline) {
      syncPermissions()
    }
  })

  // Initial sync if online
  if (useMobileAuthStore.getState().isOnline) {
    syncPermissions()
  }
}