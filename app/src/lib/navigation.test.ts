import { describe, expect, it } from 'vitest'
import { safeNext } from './navigation'

describe('return destinations', () => {
  it.each([null, '', '//example.com', '/\\example.com', '/\t/example.com', 'https://example.com', '/login', '/register', '/forgot'])('rejects unsafe or authentication destination %s', (value) => {
    expect(safeNext(value)).toBe('/account')
  })
  it('preserves local path, query and fragment', () => {
    expect(safeNext('/listing/aa-001?buy=1#checkout')).toBe('/listing/aa-001?buy=1#checkout')
    expect(safeNext('//example.com', '/')).toBe('/')
  })
})
