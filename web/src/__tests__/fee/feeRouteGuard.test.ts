import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/lib/authStore'
import { Route } from '@/routes/_app/fee'

type BeforeLoad = (ctx: { location: { pathname: string } }) => void

const runGuard = (roleName: string, pathname: string) => {
  useAuthStore.setState({ role: { name: roleName } as never })
  const guard = (Route.options as unknown as { beforeLoad: BeforeLoad }).beforeLoad
  try {
    guard({ location: { pathname } })
    return null
  } catch (error) {
    return error as { options?: { to?: string } }
  }
}

describe('fee route guard', () => {
  beforeEach(() => {
    useAuthStore.setState({ role: null })
  })

  it('TC-FEE-17-U03 teacher on /fee/categories is redirected to /', () => {
    const thrown = runGuard('Teacher', '/fee/categories')
    expect(thrown).not.toBeNull()
    expect(thrown?.options?.to).toBe('/')
  })

  it('TC-FEE-17-U04 student on /fee/categories is not redirected', () => {
    expect(runGuard('Student', '/fee/categories')).toBeNull()
  })

  it('TC-FEE-17-U04 student allow-list covers every fee path through the /fee prefix', () => {
    expect(runGuard('student', '/fee/my-receipts')).toBeNull()
    expect(runGuard('student', '/fee/refunds/')).toBeNull()
  })

  it('TC-FEE-17-U03 admin is never redirected', () => {
    expect(runGuard('Admin', '/fee/categories')).toBeNull()
  })
})
