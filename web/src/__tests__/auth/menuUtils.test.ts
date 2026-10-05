import { describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  current: { menuItems: [] as unknown[], user: { id: 'u1' }, isAuthenticated: true, role: { name: 'admin' } },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => options,
}))

vi.mock('@/lib/authStore', () => ({
  useAuthStore: () => auth.current,
}))

import { useMenuData } from '@/lib/menuUtils'
import type { MenuItem } from '@/lib/menuUtils'

type RawItem = { id: string; name: string; path: string | null; children?: RawItem[] }

const raw = (id: number, name: string, path: string | null, children: RawItem[] = []): RawItem => ({
  id: String(id),
  name,
  path,
  children,
})

const buildMenu = (roleName: string, items: RawItem[]): MenuItem[] => {
  auth.current = { menuItems: items, user: { id: 'u1' }, isAuthenticated: true, role: { name: roleName } }
  const options = useMenuData() as unknown as { queryFn: () => MenuItem[] }
  return options.queryFn()
}

const names = (items: MenuItem[]) => items.map((item) => item.name)
const find = (items: MenuItem[], name: string) => items.find((item) => item.name === name)

describe('menu role filtering', () => {
  it('TC-AUTH-06-U06 hidden transport items are removed for any role, case-insensitively', () => {
    const items = [
      raw(1, 'Transport', null, [
        raw(2, 'Route Stops', '/transport/stops'),
        raw(3, 'Transport Trips', '/transport/trips'),
        raw(4, 'Student Transport', '/students/studenttransport'),
        raw(5, 'Routes', '/transport/routes'),
      ]),
    ]
    for (const role of ['admin', 'teacher', 'student', 'parent', 'staff']) {
      const menu = buildMenu(role, items)
      expect(names(find(menu, 'Transport')?.children ?? [])).toEqual(['Routes'])
    }
    const upper = buildMenu('admin', [raw(1, 'Transport', null, [raw(2, 'ROUTE STOPS', '/x'), raw(3, 'Routes', '/y')])])
    expect(names(upper[0].children ?? [])).toEqual(['Routes'])
  })

  it('TC-AUTH-06-U07 teacher loses fee items recursively and keeps Students', () => {
    const items = [
      raw(1, 'Fee', '/fee'),
      raw(2, 'Fee Management', null, [raw(3, 'Fee Types', '/fee/types')]),
      raw(4, 'Students', '/students', [raw(5, 'Fee Dues', '/fee/dues'), raw(6, 'Admission', '/students/admission')]),
    ]
    const menu = buildMenu('teacher', items)
    expect(names(menu)).toEqual(['Students'])
    expect(names(menu[0].children ?? [])).toEqual(['Admission'])
  })

  it('TC-AUTH-06-U08 student loses My Fees and keeps My Receipts', () => {
    const items = [
      raw(1, 'Fee', '/fee', [
        raw(2, 'My Fees', '/fee/my-fees'),
        raw(3, 'My Receipts', '/fee/my-receipts'),
        raw(4, 'My Transactions', '/fee/my-transactions'),
      ]),
    ]
    const menu = buildMenu('student', items)
    expect(names(find(menu, 'Fee')?.children ?? [])).toEqual(['My Receipts', 'My Transactions'])
  })

  it('TC-AUTH-06-U09 student without a Fee node gets the self-service Fee node appended', () => {
    const menu = buildMenu('student', [raw(1, 'Dashboard', '/dashboard')])
    const fee = menu.find((item) => item.id === 99001)
    expect(fee).toBeDefined()
    expect(fee?.name).toBe('Fee')
    expect(fee?.url).toBe('/fee')
    expect(names(fee?.children ?? [])).toEqual(['My Receipts', 'My Transactions'])
  })

  it('TC-AUTH-06-U10 parent Fee node only gains the missing child', () => {
    const items = [
      raw(1, 'Fee', '/fee', [raw(2, 'My Receipts', '/fee/my-receipts'), raw(3, 'Other', '/fee/other')]),
    ]
    const menu = buildMenu('parent', items)
    const children = find(menu, 'Fee')?.children ?? []
    expect(names(children)).toEqual(['My Receipts', 'Other', 'My Transactions'])
    expect(children[0].id).toBe(2)
    expect(children[1].id).toBe(3)
  })
})

describe('menu enrichment', () => {
  it('TC-AUTH-06-U11 admin gets 8 submenu items on a flat Fee Management; other roles do not', () => {
    const items = [raw(1, 'Fee Management', '/fee')]
    const admin = buildMenu('admin', items)
    expect(find(admin, 'Fee Management')?.children).toHaveLength(8)
    expect(names(find(admin, 'Fee Management')?.children ?? [])).toContain('Fee Refunds')

    const student = buildMenu('student', items)
    expect(names(find(student, 'Fee Management')?.children ?? [])).toEqual(['My Receipts', 'My Transactions'])
    const parent = buildMenu('parent', items)
    expect(names(find(parent, 'Fee Management')?.children ?? [])).toEqual(['My Receipts', 'My Transactions'])
    const teacher = buildMenu('teacher', items)
    expect(find(teacher, 'Fee Management')).toBeUndefined()
  })

  it('TC-AUTH-06-U12 School Registration is added under Masters for admin only, once', () => {
    const items = [raw(1, 'Masters', null, [raw(2, 'Classes', '/masters/classes')])]
    const admin = buildMenu('admin', items)
    const child = find(admin, 'Masters')?.children?.find((c) => c.name === 'School Registration')
    expect(child?.url).toBe('/settings/school')

    expect(find(buildMenu('teacher', items), 'Masters')?.children?.some((c) => c.url === '/settings/school')).toBe(
      false
    )
    expect(find(buildMenu('student', items), 'Masters')?.children?.some((c) => c.url === '/settings/school')).toBe(
      false
    )

    const existing = [raw(1, 'Masters', null, [raw(2, 'School Settings', '/settings/school')])]
    const again = buildMenu('admin', existing)
    expect(find(again, 'Masters')?.children?.filter((c) => c.url === '/settings/school')).toHaveLength(1)
  })

  it('TC-AUTH-06-U13 top level order follows the agreed sequence with unknown names last', () => {
    const items = [
      raw(1, 'Reports', '/reports'),
      raw(2, 'Dashboard', '/dashboard'),
      raw(3, 'Zeta', '/zeta'),
      raw(4, 'Students', '/students'),
    ]
    expect(names(buildMenu('admin', items))).toEqual(['Dashboard', 'Students', 'Reports', 'Zeta'])
  })

  it('TC-AUTH-06-U13 empty menu data returns an empty list', () => {
    expect(buildMenu('admin', [])).toEqual([])
  })
})
