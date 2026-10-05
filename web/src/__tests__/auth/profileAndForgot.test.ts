import './helpers/storage'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'

const profileAuth = vi.hoisted(() => ({ role: null as { name: string } | null }))

vi.mock('@/lib/authStore', () => ({
  useAuthStore: () => ({ role: profileAuth.role }),
}))
vi.mock('@/pages/ParentProfile', () => ({
  default: function ParentProfileStub() {
    return null
  },
}))
vi.mock('@/pages/students/StudentProfile', () => ({
  default: function StudentProfileStub() {
    return null
  },
}))
vi.mock('@/pages/staff/StaffProfile', () => ({
  default: function StaffProfileStub() {
    return null
  },
}))

import ParentProfile from '@/pages/ParentProfile'
import StudentProfile from '@/pages/students/StudentProfile'
import StaffProfile from '@/pages/staff/StaffProfile'
import ForgotPasswordForm from '@/components/ui/forgot-password-form'

type Node = ReactElement<{ children?: unknown; to?: string }>

const collect = (node: unknown, texts: string[], links: string[]): void => {
  if (node === null || node === undefined || typeof node === 'boolean') return
  if (typeof node === 'string' || typeof node === 'number') {
    texts.push(String(node).replace(/\s+/g, ' ').trim())
    return
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, texts, links))
    return
  }
  const element = node as Node
  if (element.props?.to) links.push(element.props.to)
  collect(element.props?.children, texts, links)
}

let renderProfile: () => Node

describe('profile router role switch', () => {
  beforeAll(async () => {
    const { Route } = (await import('@/routes/_app/profile')) as unknown as {
      Route: { options: { component: () => Node } }
    }
    renderProfile = Route.options.component
  }, 60000)

  it('TC-AUTH-10-U07 routes each role to its profile page', () => {
    const cases: Array<[string, unknown]> = [
      ['Student', StudentProfile],
      ['Parent', ParentProfile],
      ['Admin', StaffProfile],
      ['Teacher', StaffProfile],
    ]
    for (const [roleName, expected] of cases) {
      profileAuth.role = { name: roleName }
      expect(renderProfile().type).toBe(expected)
    }
  })

  it('TC-AUTH-10-U07 shows a login prompt when there is no role', () => {
    profileAuth.role = null
    const element = renderProfile()
    expect(element.type).toBe('div')
    expect(element.props.children).toBe('Please log in to view your profile')
  })
})

describe('forgot password form', () => {
  it('TC-AUTH-12-U01 shows the explanation texts and a link to /login', () => {
    const tree = (ForgotPasswordForm as unknown as () => Node)()
    const texts: string[] = []
    const links: string[] = []
    collect(tree, texts, links)
    const joined = texts.join(' | ')
    expect(joined).toContain('Forgot your password?')
    expect(joined).toContain('Password reset by email is not available yet.')
    expect(joined).toContain('Please contact your school administrator.')
    expect(joined).toContain('Back to login')
    expect(links).toEqual(['/login'])
  })
})
