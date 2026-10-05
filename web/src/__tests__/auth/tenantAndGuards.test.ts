import './helpers/storage'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { isRedirect } from '@tanstack/react-router'
import { config, getTenantFromHostname } from '@/lib/config'
import { useAuthStore } from '@/lib/authStore'
import { makeLogin } from './helpers/fixtures'

type RouteLike = { options: { beforeLoad: () => void } }

const redirectTarget = (run: () => void): string | null => {
  try {
    run()
  } catch (error) {
    if (isRedirect(error)) {
      return String((error as unknown as { options: { to: string } }).options.to)
    }
    throw error
  }
  return null
}

describe('tenant from hostname', () => {
  it('TC-AUTH-01-U14 subdomains resolve to the tenant and plain hosts to the default', () => {
    expect(getTenantFromHostname('school1.abc.com')).toBe('school1')
    expect(getTenantFromHostname('www.school1.abc.com')).toBe('school1')
    expect(getTenantFromHostname('localhost')).toBe(config.tenant.defaultTenant)
    expect(getTenantFromHostname('127.0.0.1')).toBe('127')
  })
})

let appRoute: RouteLike
let authRoute: RouteLike

describe('route guards', () => {
  beforeAll(async () => {
    appRoute = ((await import('@/routes/_app')) as unknown as { Route: RouteLike }).Route
    authRoute = ((await import('@/routes/_auth')) as unknown as { Route: RouteLike }).Route
  }, 60000)

  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('TC-AUTH-07-U09 the app layout redirects an anonymous visitor to /login', async () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(redirectTarget(() => appRoute.options.beforeLoad())).toBe('/login')
  })

  it('TC-AUTH-07-U09 the app layout lets an authenticated user through', async () => {
    useAuthStore.getState().login(makeLogin('Admin'))
    expect(redirectTarget(() => appRoute.options.beforeLoad())).toBeNull()
  })

  it('TC-AUTH-07-U10 the auth layout redirects an authenticated user to /dashboard', async () => {
    useAuthStore.getState().login(makeLogin('Admin'))
    expect(redirectTarget(() => authRoute.options.beforeLoad())).toBe('/dashboard')
  })

  it('TC-AUTH-07-U10 the auth layout lets an anonymous visitor through', async () => {
    expect(redirectTarget(() => authRoute.options.beforeLoad())).toBeNull()
  })
})
