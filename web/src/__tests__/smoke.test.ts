import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('web unit test setup', () => {
  it('resolves the @ alias and runs in node', () => {
    expect(cn('a', 'b')).toContain('a')
  })
})
