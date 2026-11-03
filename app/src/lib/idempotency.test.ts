import { afterEach, expect, test, vi } from 'vitest'
import { idempotencyKey } from './idempotency'

afterEach(() => vi.unstubAllGlobals())

test('command keys work on LAN origins where randomUUID is unavailable', () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto)
  vi.stubGlobal('crypto', { getRandomValues })
  const first = idempotencyKey()
  expect(first).toMatch(/^[a-f0-9]{32}$/)
  expect(idempotencyKey()).not.toBe(first)
})
