import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMenu, names, node } from './menuHarness'

afterEach(() => {
  vi.doUnmock('@tanstack/react-query')
  vi.doUnmock('@/lib/authStore')
})

const find = (items: Awaited<ReturnType<typeof buildMenu>>, name: string) => items.find(item => item.name === name)

describe('web menu rules (menuUtils pipeline)', () => {
  it('TC-RPT-01-U01 teacher role loses the Fee node', async () => {
    const menu = await buildMenu('teacher', [
      node(1, 'Students', '/students'),
      node(2, 'Fee Management', '/fee', [node(21, 'Fee Types', '/fee/types')]),
    ])
    expect(names(menu)).toEqual(['Students'])
  })

  it('TC-RPT-01-U01 teacher keeps Fee-free children of other nodes', async () => {
    const menu = await buildMenu('teacher', [
      node(1, 'Students', '/students', [node(11, 'Fees', '/fee/x'), node(12, 'Admission', '/students/admission')]),
    ])
    expect(names(find(menu, 'Students')?.children)).toEqual(['Admission'])
  })

  it('TC-RPT-01-U02 student role loses "My Fees" but keeps "Fee Receipts"', async () => {
    const menu = await buildMenu('student', [
      node(2, 'Fee', '/fee', [
        node(21, 'My Fees', '/fee/my-fees'),
        node(22, 'Fee Receipts', '/fee/receipts'),
        node(23, 'My Receipts', '/fee/my-receipts'),
        node(24, 'My Transactions', '/fee/my-transactions'),
      ]),
    ])
    const fee = find(menu, 'Fee')
    expect(names(fee?.children)).toEqual(['Fee Receipts', 'My Receipts', 'My Transactions'])
  })

  it('TC-RPT-01-U02 student without a Fee node gets the self-service Fee menu injected', async () => {
    const menu = await buildMenu('student', [node(1, 'Students', '/students')])
    const fee = find(menu, 'Fee')
    expect(fee?.url).toBe('/fee')
    expect(names(fee?.children)).toEqual(['My Receipts', 'My Transactions'])
  })

  it('TC-RPT-01-U03 Route Stops, Transport Trips and Student Transport are hidden for every role', async () => {
    const children = [
      node(31, 'Routes', '/transport/routes'),
      node(32, 'Route Stops', '/transport/route-stops'),
      node(33, 'Trips', '/transport/trips'),
      node(34, 'Transport Trips', '/transport/trips-x'),
      node(35, 'Student Transport', '/transport/student'),
    ]
    for (const role of ['admin', 'teacher', 'student', 'parent', 'staff']) {
      const menu = await buildMenu(role, [node(3, 'Transport', '/transport', children)])
      expect(names(find(menu, 'Transport')?.children)).toEqual(['Routes', 'Trips'])
    }
  })

  it('TC-TRN-01-U01 Transport node children exclude Route Stops for every role', async () => {
    for (const role of ['admin', 'staff', 'teacher']) {
      const menu = await buildMenu(role, [
        node(3, 'Transport', '/transport', [
          node(31, 'Routes', '/transport/routes'),
          node(32, 'Route Stops', '/transport/route-stops'),
          node(33, 'Trips', '/transport/trips'),
        ]),
      ])
      expect(names(find(menu, 'Transport')?.children)).toEqual(['Routes', 'Trips'])
    }
  })

  it('TC-RPT-01-U04 top level items follow the canonical order', async () => {
    const menu = await buildMenu('admin', [
      node(1, 'Reports', '/reports'),
      node(2, 'Students', '/students'),
      node(3, 'Transport', '/transport'),
      node(4, 'Fee Management', '/fee'),
      node(5, 'Expense', '/expense'),
    ])
    expect(names(menu)).toEqual(['Students', 'Fee Management', 'Expense', 'Reports', 'Transport'])
  })

  it('TC-RPT-01-U04 unknown names sort after the known ones', async () => {
    const menu = await buildMenu('admin', [node(1, 'Zeta', '/z'), node(2, 'Transport', '/transport'), node(3, 'Students', '/s')])
    expect(names(menu)).toEqual(['Students', 'Transport', 'Zeta'])
  })

  it('TC-RPT-01-U05 flat L0 Fee Management gets the admin sub menu for Admin', async () => {
    const menu = await buildMenu('admin', [node(1, 'Fee Management', '/fee')])
    expect(names(find(menu, 'Fee Management')?.children)).toEqual([
      'Fee Categories',
      'Fee Types',
      'Fee Terms',
      'Fee Mappings',
      'Fee Term Amounts',
      'Fee Collection',
      'Fee Receipts',
      'Fee Refunds',
    ])
  })

  it('TC-RPT-01-U05 teacher keeps no injected children (node is removed for teacher)', async () => {
    const menu = await buildMenu('teacher', [node(1, 'Fee Management', '/fee')])
    expect(find(menu, 'Fee Management')).toBeUndefined()
  })

  it('TC-RPT-01-U05 Fee node with existing children is left alone for Admin', async () => {
    const menu = await buildMenu('admin', [node(1, 'Fee Management', '/fee', [node(11, 'Fee Types', '/fee/types')])])
    expect(names(find(menu, 'Fee Management')?.children)).toEqual(['Fee Types'])
  })

  it('TC-RPT-01-U05 injectFeeSubmenu skips parent and student roles', async () => {
    for (const role of ['student', 'parent']) {
      const menu = await buildMenu(role, [node(1, 'Fee Management', '/fee')])
      expect(names(find(menu, 'Fee Management')?.children)).toEqual(['My Receipts', 'My Transactions'])
    }
  })
})
