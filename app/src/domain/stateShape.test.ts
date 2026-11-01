import { describe, expect, it } from 'vitest'
import { createSeed, DEMO_STATE_VERSION } from '../mock/seed'
import { parseStoredState } from './stateShape'

const V = DEMO_STATE_VERSION

describe('parseStoredState', () => {
  it('accepts a valid current-version state', () => {
    const seed = createSeed(0)
    const parsed = parseStoredState(JSON.stringify(seed), V)
    expect(parsed).not.toBeNull()
    expect(parsed!.listings.length).toBe(seed.listings.length)
  })

  it.each([
    ['missing', null],
    ['empty string', ''],
    ['not json', '{not json'],
    ['json null', 'null'],
    ['json array', '[]'],
    ['json number', '1'],
    ['old version', '{"version":0}'],
  ])('rejects %s', (_label, raw) => {
    expect(parseStoredState(raw, V)).toBeNull()
  })

  it('rejects a current-version object with no collections', () => {
    expect(parseStoredState(JSON.stringify({ version: V }), V)).toBeNull()
  })

  it('rejects invalid core scalar values', () => {
    for (const [field, value] of [
      ['clockOffsetMs', '0'],
      ['currentUserId', 42],
      ['viewMode', 'administrator'],
    ]) {
      const s = createSeed(0) as unknown as Record<string, unknown>
      s[field] = value
      expect(parseStoredState(JSON.stringify(s), V)).toBeNull()
    }
  })

  it.each(['listings', 'users', 'reservations', 'notifications', 'ledger', 'orders', 'farmJobs'])(
    'rejects a current-version state whose %s is not an array',
    (field) => {
      const s = createSeed(0) as unknown as Record<string, unknown>
      s[field] = undefined
      expect(parseStoredState(JSON.stringify(s), V)).toBeNull()
    },
  )

  it('rejects a current-version state whose processed map or demo settings are missing', () => {
    const a = createSeed(0) as unknown as Record<string, unknown>
    delete a.processed
    expect(parseStoredState(JSON.stringify(a), V)).toBeNull()
    const b = createSeed(0) as unknown as Record<string, unknown>
    b.demo = null
    expect(parseStoredState(JSON.stringify(b), V)).toBeNull()
  })

  it('rejects malformed collection items and demo settings', () => {
    const listing = createSeed(0) as unknown as Record<string, unknown>
    listing.listings = [null]
    expect(parseStoredState(JSON.stringify(listing), V)).toBeNull()

    const user = createSeed(0) as unknown as Record<string, unknown>
    user.users = [{ id: 'u-a' }]
    expect(parseStoredState(JSON.stringify(user), V)).toBeNull()

    const demo = createSeed(0) as unknown as Record<string, unknown>
    demo.demo = { nextTopUpOutcome: 'success', simulateLoadError: false, latencyMs: '700' }
    expect(parseStoredState(JSON.stringify(demo), V)).toBeNull()
  })

  it('rejects malformed idempotency results', () => {
    const s = createSeed(0) as unknown as Record<string, unknown>
    s.processed = { 'purchase-1': { ok: true, id: 7 } }
    expect(parseStoredState(JSON.stringify(s), V)).toBeNull()
  })
})
