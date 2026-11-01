import { describe, expect, it } from 'vitest'
import { baht } from '../lib/money'
import { createSeed } from '../mock/seed'
import type { DemoState } from './types'
import * as E from './engine'

const T0 = Date.UTC(2026, 10, 1, 3, 0, 0)
const fresh = (user: string | null = 'u-a', mode: DemoState['viewMode'] = 'customer') => {
  const s = createSeed(T0)
  s.currentUserId = user
  s.viewMode = mode
  return s
}
const priceOf = (s: DemoState, id: string) => s.listings.find((l) => l.id === id)!.priceSatang
const statusOf = (s: DemoState, id: string) => s.listings.find((l) => l.id === id)!.status

describe('purchase', () => {
  it('requires sign-in', () => {
    const s = fresh(null)
    expect(E.run(s, T0, null, E.purchaseListing('aa-001', priceOf(s, 'aa-001'))).result.ok).toBe(false)
  })

  it('debits once, creates one order, marks sold; replaying the key has no new effect', () => {
    let s = fresh()
    const before = E.balanceOf(s, 'u-a')
    const key = 'buy-aa-001-attempt-1'
    const r1 = E.run(s, T0, key, E.purchaseListing('aa-001', priceOf(s, 'aa-001')))
    s = r1.state
    expect(r1.result.ok).toBe(true)
    const r2 = E.run(s, T0 + 1000, key, E.purchaseListing('aa-001', baht(1290)))
    expect(r2.state).toBe(s)
    expect(r2.result).toEqual(r1.result)
    expect(E.balanceOf(r2.state, 'u-a')).toBe(before - baht(1290))
    expect(r2.state.orders.filter((o) => o.listingId === 'aa-001')).toHaveLength(1)
    expect(statusOf(r2.state, 'aa-001')).toBe('sold')
  })

  it('second buyer of the same listing is rejected and not charged', () => {
    let s = fresh('u-a')
    s = E.run(s, T0, 'k1', E.purchaseListing('aa-004', baht(190))).state
    s = { ...s, currentUserId: 'u-b' }
    const bBefore = E.balanceOf(s, 'u-b')
    const r = E.run(s, T0, 'k2', E.purchaseListing('aa-004', baht(190)))
    expect(r.result.ok).toBe(false)
    expect(E.balanceOf(r.state, 'u-b')).toBe(bBefore)
  })

  it('reports the exact shortfall without debiting', () => {
    const s = fresh('u-b') // 120 + 300 - 380 - 20 = 20 THB
    expect(E.balanceOf(s, 'u-b')).toBe(baht(20))
    const r = E.run(s, T0, null, E.purchaseListing('aa-004', baht(190)))
    expect(r.result).toMatchObject({ ok: false, code: 'insufficient', shortfallSatang: baht(170) })
    expect(E.balanceOf(r.state, 'u-b')).toBe(baht(20))
  })

  it('rejects a stale quoted price', () => {
    const s = fresh()
    expect(E.run(s, T0, null, E.purchaseListing('aa-001', baht(1000))).result).toMatchObject({ code: 'price-changed' })
  })

  it('applies a valid coupon and rejects expired / wrong-scope coupons', () => {
    const s = fresh()
    const ok = E.run(s, T0, null, E.purchaseListing('aa-001', baht(1290), 'DEMO10'))
    expect(ok.result.ok).toBe(true)
    expect(ok.state.orders[0].paidSatang).toBe(baht(1190)) // 10% capped at 100
    expect(E.run(s, T0, null, E.purchaseListing('aa-001', baht(1290), 'OLD50')).result.ok).toBe(false)
    expect(E.run(s, T0, null, E.purchaseListing('aa-001', baht(1290), 'FARM5')).result.ok).toBe(false)
  })
})
