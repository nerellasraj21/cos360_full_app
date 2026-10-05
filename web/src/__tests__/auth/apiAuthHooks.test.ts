import './helpers/storage'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const state = { refreshToken: 'refresh-1' as string | null, logout: () => {}, setAvailableStudents: () => {}, login: () => {} }
  return { state, clear: () => {} }
})

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => options,
  useMutation: (options: unknown) => options,
  useQueryClient: () => ({ clear: mocks.clear, invalidateQueries: () => {} }),
}))

vi.mock('@/lib/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
    { getState: () => mocks.state }
  ),
}))

import CAxios from '@/api'
import { useLogoutMutation, useMyChildren } from '@/api/auth'

type Options = {
  mutationFn: () => Promise<void>
  onError: (error: unknown) => void
  onSuccess: () => void
  queryFn: () => Promise<Array<Record<string, string>>>
}

describe('auth api hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('TC-AUTH-09-U04 my-children splits a combined name into first and last name', async () => {
    vi.spyOn(CAxios, 'get').mockResolvedValue({ data: [{ id: 's1', name: 'Asha Rao' }] })
    const options = useMyChildren() as unknown as Options
    const children = await options.queryFn()
    expect(children).toHaveLength(1)
    expect(children[0].first_name).toBe('Asha')
    expect(children[0].last_name).toBe('Rao')
    expect(children[0].name).toBe('Asha Rao')
    expect(children[0].id).toBe('s1')
  })

  it('TC-AUTH-09-U04 my-children accepts a wrapped data array and a single word name', async () => {
    vi.spyOn(CAxios, 'get').mockResolvedValue({ data: { data: [{ student_id: 's2', name: 'Asha' }] } })
    const options = useMyChildren() as unknown as Options
    const children = await options.queryFn()
    expect(children[0].id).toBe('s2')
    expect(children[0].first_name).toBe('Asha')
    expect(children[0].last_name).toBe('')
  })

  it('TC-AUTH-14-U08 logout clears local state even when the request is rejected', async () => {
    const logout = vi.fn()
    const clear = vi.fn()
    mocks.state.logout = logout
    mocks.clear = clear
    const post = vi.spyOn(CAxios, 'post').mockRejectedValue(new Error('network down'))
    const options = useLogoutMutation() as unknown as Options

    let failure: unknown
    try {
      await options.mutationFn()
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(Error)
    expect(post).toHaveBeenCalledWith('/auth/logout', { refresh_token: 'refresh-1' })

    vi.spyOn(console, 'error').mockImplementation(() => {})
    options.onError(failure)
    expect(logout).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('TC-AUTH-14-U08 logout sends an empty body when no refresh token is stored', async () => {
    mocks.state.refreshToken = null
    const post = vi.spyOn(CAxios, 'post').mockResolvedValue({ data: {} })
    const options = useLogoutMutation() as unknown as Options
    await options.mutationFn()
    expect(post).toHaveBeenCalledWith('/auth/logout', {})
    mocks.state.refreshToken = 'refresh-1'
  })
})
