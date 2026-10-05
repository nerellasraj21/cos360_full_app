const data = new Map<string, string>()

export const memoryStorage = {
  getItem: (key: string) => (data.has(key) ? (data.get(key) as string) : null),
  setItem: (key: string, value: string) => {
    data.set(key, String(value))
  },
  removeItem: (key: string) => {
    data.delete(key)
  },
  clear: () => {
    data.clear()
  },
  key: (index: number) => Array.from(data.keys())[index] ?? null,
  get length() {
    return data.size
  },
}

const globalScope = globalThis as unknown as Record<string, unknown>
globalScope.localStorage = memoryStorage
globalScope.sessionStorage = memoryStorage
