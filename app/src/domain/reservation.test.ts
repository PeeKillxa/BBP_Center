import { describe, expect, it } from 'vitest'
import { RESERVATION } from '../config/rules'
import { baht } from '../lib/money'
import { HOUR } from '../lib/time'
import { createSeed } from '../mock/seed'
import type { DemoState } from './types'
import * as E from './engine'

const T0 = Date.UTC(2026, 10, 1, 3, 0, 0)
const fresh = (user = 'u-a') => {
  const s = createSeed(T0)
  s.currentUserId = user
  return s
}
const statusOf = (s: DemoState, id: string) => s.listings.find((l) => l.id === id)!.status

/** Reserve aa-001 (1,290 THB) at T0 as user A. */
const reserved = () => {
  const s = fresh()
  const r = E.run(s, T0, 'res-1', E.createReservation('aa-001', baht(1290), true))
  expect(r.result.ok).toBe(true)
  return { s: r.state, id: (r.result as { id: string }).id, before: E.balanceOf(s, 'u-a') }
}

describe('reservation', () => {
  it('requires the forfeiture checkbox', () => {
    const s = fresh()
    expect(E.run(s, T0, null, E.createReservation('aa-001', baht(1290), false)).result).toMatchObject({ code: 'consent' })
  })

  it('debits 50% once, locks the price and listing, with 12 h + 2 h deadlines', () => {
    const { s, id, before } = reserved()
    const r = s.reservations.find((x) => x.id === id)!
    expect(r.depositSatang).toBe(baht(645))
    expect(E.balanceOf(s, 'u-a')).toBe(before - baht(645))
    expect(r.holdEndsAt - r.createdAt).toBe(12 * HOUR)
    expect(r.expiresAt - r.createdAt).toBe(14 * HOUR)
    expect(statusOf(s, 'aa-001')).toBe('reserved')
    const replay = E.run(s, T0 + 5, 'res-1', E.createReservation('aa-001', baht(1290), true))
    expect(E.balanceOf(replay.state, 'u-a')).toBe(before - baht(645))
  })

  it('blocks other buyers during hold and grace', () => {
    const { s } = reserved()
    for (const t of [T0 + 11 * HOUR, T0 + 13 * HOUR + 59 * 60_000]) {
      const r = E.run({ ...s, currentUserId: 'u-b' }, t, null, E.purchaseListing('aa-001', baht(1290)))
      expect(r.result.ok).toBe(false)
    }
  })

  it('in grace, settlement debits only the remainder and marks sold', () => {
    const { s, id, before } = reserved()
    const r = E.run(s, T0 + 13 * HOUR, 'settle-1', E.settleReservation(id))
    expect(r.result.ok).toBe(true)
    expect(E.balanceOf(r.state, 'u-a')).toBe(before - baht(1290))
    expect(statusOf(r.state, 'aa-001')).toBe('sold')
    const again = E.run(r.state, T0 + 13 * HOUR + 1, 'settle-2', E.settleReservation(id))
    expect(E.balanceOf(again.state, 'u-a')).toBe(before - baht(1290))
  })

  it('at exactly 14 h unpaid: forfeits once, no refund, listing reopens, settlement refused', () => {
    const { s, id, before } = reserved()
    const at = T0 + RESERVATION.holdMs + RESERVATION.graceMs
    let x = E.sweep(s, at)
    x = E.sweep(x, at + 1000) // replayed sweep has no second effect
    const r = x.reservations.find((y) => y.id === id)!
    expect(r.status).toBe('forfeited')
    expect(r.cooldownUntil).toBe(at + 6 * HOUR)
    expect(x.ledger.filter((e) => e.refId === id && e.kind === 'reservation-forfeit')).toHaveLength(1)
    expect(E.balanceOf(x, 'u-a')).toBe(before - baht(645))
    expect(statusOf(x, 'aa-001')).toBe('available')
    expect(E.run(s, at, null, E.settleReservation(id)).result).toMatchObject({ code: 'expired' })
  })

  it('cooldown blocks only the same customer + listing, still allows full purchase without deposit credit', () => {
    const { s, before } = reserved()
    const at = T0 + 14 * HOUR
    const x = E.sweep(s, at)
    expect(E.run(x, at + 5 * HOUR, null, E.createReservation('aa-001', baht(1290), true)).result).toMatchObject({ code: 'cooldown' })
    // another customer may reserve the same listing during A's cooldown
    const xb = E.run({ ...x, currentUserId: 'u-b' }, at, null, E.demoSetBalance('u-b', baht(1000))).state
    expect(E.run(xb, at + HOUR, null, E.createReservation('aa-001', baht(1290), true)).result.ok).toBe(true)
    // the same customer may reserve a different listing
    expect(E.run(x, at + HOUR, null, E.createReservation('aa-004', baht(190), true)).result.ok).toBe(true)
    const buy = E.run(x, at + HOUR, null, E.purchaseListing('aa-001', baht(1290)))
    expect(buy.result.ok).toBe(true)
    expect(E.balanceOf(buy.state, 'u-a')).toBe(before - baht(645) - baht(1290))
    expect(E.run(x, at + 6 * HOUR, null, E.createReservation('aa-001', baht(1290), true)).result.ok).toBe(true)
  })

  it('seed shows normal, grace, forfeited/cooldown and settled reservations', () => {
    const s = createSeed(T0)
    const phase = (id: string) => E.reservationPhase(s.reservations.find((r) => r.id === id)!, T0)
    expect([phase('RS-SEED1'), phase('RS-SEED2'), phase('RS-SEED3'), phase('RS-SEED4')]).toEqual(['hold', 'grace', 'forfeited', 'settled'])
    expect(E.cooldownFor(s, 'u-a', 'aa-006', T0)).toBeTruthy()
  })
})
