import { vi } from 'vitest'

export interface RawMenuNode {
  id: string
  name: string
  path: string | null
  children?: RawMenuNode[]
}

export interface BuiltMenuNode {
  id: number
  name: string
  url: string | null
  level: 'L0' | 'L1' | 'L2'
  children?: BuiltMenuNode[]
}

export const node = (id: number, name: string, path: string | null, children: RawMenuNode[] = []): RawMenuNode => ({
  id: String(id),
  name,
  path,
  children,
})

export async function buildMenu(roleName: string, menuItems: RawMenuNode[]): Promise<BuiltMenuNode[]> {
  vi.resetModules()
  vi.doMock('@tanstack/react-query', () => ({
    useQuery: (options: { queryFn: () => unknown }) => options,
  }))
  vi.doMock('@/lib/authStore', () => ({
    useAuthStore: () => ({
      menuItems,
      user: { id: 'u1' },
      isAuthenticated: true,
      role: { name: roleName },
    }),
  }))
  const { useMenuData } = await import('@/lib/menuUtils')
  const query = useMenuData() as unknown as { queryFn: () => BuiltMenuNode[] }
  return query.queryFn()
}

export const names = (items: BuiltMenuNode[] | undefined): string[] => (items ?? []).map(item => item.name)
