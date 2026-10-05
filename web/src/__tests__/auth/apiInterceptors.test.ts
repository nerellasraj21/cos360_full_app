import './helpers/storage'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import CAxios from '@/api'
import { useAuthStore } from '@/lib/authStore'
import { config as appConfig } from '@/lib/config'
import { makeLogin, makeStudent } from './helpers/fixtures'

type Handler = (config: InternalAxiosRequestConfig) => number

const seen: InternalAxiosRequestConfig[] = []

const installAdapter = (handler: Handler) => {
  seen.length = 0
  CAxios.defaults.adapter = async (requestConfig) => {
    seen.push(requestConfig)
    const status = handler(requestConfig)
    const response = { data: { ok: true }, status, statusText: '', headers: {}, config: requestConfig }
    if (status >= 400) {
      throw new AxiosError('failed', 'ERR_BAD_REQUEST', requestConfig, null, response)
    }
    return response
  }
}

const authHeader = (requestConfig: InternalAxiosRequestConfig) => {
  const value = requestConfig.headers.get('Authorization')
  return value === undefined || value === null ? undefined : String(value)
}

const tenantHeader = (requestConfig: InternalAxiosRequestConfig) => requestConfig.headers.get(appConfig.tenant.headerName)

const signIn = (accessToken: string, refreshToken = 'refresh-old') => {
  useAuthStore.getState().login(makeLogin('Admin', { access_token: accessToken, refresh_token: refreshToken }))
}

describe('request interceptor', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { hostname: 'school1.abc.com', href: '/start' } })
    useAuthStore.getState().logout()
    installAdapter(() => 200)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TC-AUTH-08-U12 token-less auth paths carry no Authorization header but set cschema', async () => {
    signIn('token-1')
    for (const path of ['/auth/refresh', '/auth/login', '/auth/academic-years', '/auth/staff/set-password']) {
      seen.length = 0
      await CAxios.post(path, {})
      expect(authHeader(seen[0])).toBeUndefined()
      expect(tenantHeader(seen[0])).toBe('school1')
    }
  })

  it('TC-AUTH-08-U13 authenticated paths send the bearer token and no cschema header', async () => {
    signIn('token-1')
    await CAxios.get('/admin/users/')
    expect(authHeader(seen[0])).toBe('Bearer token-1')
    expect(tenantHeader(seen[0])).toBeUndefined()
  })

  it('TC-AUTH-08-U13 an authenticated path without a stored token falls back to the cschema header', async () => {
    await CAxios.get('/admin/users/')
    expect(authHeader(seen[0])).toBeUndefined()
    expect(tenantHeader(seen[0])).toBe('school1')
  })

  it('TC-AUTH-09-U05 a selected student adds the three context headers', async () => {
    signIn('token-1')
    const student = makeStudent('s1', { class_id: 'c1', academic_year_id: 'y1' })
    useAuthStore.getState().selectStudent(student)
    await CAxios.get('/students/')
    expect(seen[0].headers.get('X-Student-ID')).toBe('s1')
    expect(seen[0].headers.get('X-Academic-Year-ID')).toBe('y1')
    expect(seen[0].headers.get('X-Class-ID')).toBe('c1')
  })

  it('TC-AUTH-09-U05 without a selected student the context headers are absent', async () => {
    signIn('token-1')
    await CAxios.get('/students/')
    expect(seen[0].headers.get('X-Student-ID')).toBeUndefined()
  })
})

describe('response interceptor refresh handling', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { hostname: 'school1.abc.com', href: '/start' } })
    useAuthStore.getState().logout()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('TC-AUTH-08-U08 three concurrent 401 responses trigger one refresh and each request is retried once', async () => {
    signIn('old-token')
    const post = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { access_token: 'new-token', refresh_token: 'refresh-new' } })
    installAdapter((requestConfig) => (authHeader(requestConfig) === 'Bearer new-token' ? 200 : 401))

    const results = await Promise.all([CAxios.get('/a'), CAxios.get('/b'), CAxios.get('/c')])

    expect(results.map((result) => result.status)).toEqual([200, 200, 200])
    expect(post).toHaveBeenCalledTimes(1)
    expect(String(post.mock.calls[0][0])).toContain('/auth/refresh')
    expect(post.mock.calls[0][1]).toEqual({ refresh_token: 'refresh-old' })
    for (const url of ['/a', '/b', '/c']) {
      const attempts = seen.filter((requestConfig) => requestConfig.url === url)
      expect(attempts).toHaveLength(2)
      expect(authHeader(attempts[1])).toBe('Bearer new-token')
    }
    expect(useAuthStore.getState().accessToken).toBe('new-token')
    expect(useAuthStore.getState().refreshToken).toBe('refresh-new')
  })

  it('TC-AUTH-08-U09 a 401 on /auth/login is not refreshed and the error propagates', async () => {
    signIn('old-token')
    const post = vi.spyOn(axios, 'post')
    installAdapter(() => 401)
    await expect(CAxios.post('/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } })
    expect(post).not.toHaveBeenCalled()
    expect(seen).toHaveLength(1)
  })

  it('TC-AUTH-08-U10 a failed refresh logs out and redirects to /login', async () => {
    signIn('old-token')
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'))
    installAdapter(() => 401)
    await expect(CAxios.get('/a')).rejects.toBeDefined()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect((window as unknown as { location: { href: string } }).location.href).toBe('/login')
  })

  it('TC-AUTH-08-U11 a request already retried is not refreshed again', async () => {
    signIn('old-token')
    const post = vi.spyOn(axios, 'post')
    installAdapter(() => 401)
    await expect(
      CAxios.get('/a', { _retry: true } as unknown as Record<string, unknown>)
    ).rejects.toMatchObject({ response: { status: 401 } })
    expect(post).not.toHaveBeenCalled()
    expect(seen).toHaveLength(1)
  })
})
