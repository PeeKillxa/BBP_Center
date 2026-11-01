import { describe, expect, it } from 'vitest'
import { STANDBY } from '../config/rules'
import { baht } from '../lib/money'
import { MINUTE } from '../lib/time'
import { createSeed } from '../mock/seed'
import type { DemoState } from './types'
import * as E from './engine'

const T0 = Date.UTC(2026, 10, 1, 3, 0, 0)
const as = (s: DemoState, user: string, mode: DemoState['viewMode'] = 'customer'): DemoState => ({ ...s, currentUserId: user, viewMode: mode })
const ok = (s: DemoState, now: number, cmd: E.Cmd) => {
  const r = E.run(s, now, null, cmd)
  expect(r.result).toMatchObject({ ok: true })
  return r.state
}
const job = (s: DemoState, id: string) => s.farmJobs.find((j) => j.id === id)!

describe('top-up (simulated)', () => {
  it('credits only on success, once, and refuses a reused slip', () => {
    let s = as(createSeed(T0), 'u-c')
    const r1 = E.run(s, T0, 'tu-1', E.submitTopUp('bank-slip', baht(500), 'slip-x', 'success', null))
    s = r1.state
    const id = (r1.result as { id: string }).id
    expect(E.balanceOf(s, 'u-c')).toBe(0)
    s = ok(s, T0 + 1, E.resolveTopUp(id))
    s = ok(s, T0 + 2, E.resolveTopUp(id))
    expect(E.balanceOf(s, 'u-c')).toBe(baht(500))
    const r2 = E.run(s, T0 + 3, 'tu-2', E.submitTopUp('bank-slip', baht(500), 'slip-x', 'success', null))
    s = ok(r2.state, T0 + 4, E.resolveTopUp((r2.result as { id: string }).id))
    expect(s.topups[0].status).toBe('duplicate-slip')
    expect(E.balanceOf(s, 'u-c')).toBe(baht(500))
  })

  it('failure outcomes never credit', () => {
    let s = as(createSeed(T0), 'u-c')
    for (const o of ['amount-mismatch', 'recipient-mismatch', 'unverifiable'] as const) {
      const r = E.run(s, T0, null, E.submitTopUp('bank-slip', baht(100), `f-${o}`, o, 0))
      s = E.sweep(r.state, T0 + 1)
    }
    expect(E.balanceOf(s, 'u-c')).toBe(0)
    expect(s.topups.slice(0, 3).map((t) => t.status).sort()).toEqual(['amount-mismatch', 'recipient-mismatch', 'unverifiable'])
  })
})

describe('farm order + standby workflow', () => {
  const ordered = () => {
    const s = as(createSeed(T0), 'u-a')
    const r = E.run(s, T0, 'farm-1', E.orderFarm('aa-diamond', '40000', baht(80)))
    expect(r.result.ok).toBe(true)
    return { s: r.state, id: (r.result as { id: string }).id, before: E.balanceOf(s, 'u-a') }
  }

  it('charges the configured price and rejects off-step quantities', () => {
    const { s, id, before } = ordered()
    expect(E.balanceOf(s, 'u-a')).toBe(before - baht(80))
    expect(job(s, id).estimateSeconds).toBe(2223 * 120)
    expect(E.run(s, T0, null, E.orderFarm('aa-diamond', '15000', baht(29))).result).toMatchObject({ code: 'quantity' })
    expect(E.run(s, T0, null, E.orderFarm('aa-secret', '10000', baht(20))).result).toMatchObject({ code: 'not-orderable' })
  })

  it('never stores password or verification code; separate timers; admin decides login', () => {
    const PW = 'SECRET_PW_9a8b7c'
    const CODE = 'CODE77XQ'
    let { s, id } = ordered()
    expect(E.run(s, T0, null, E.submitFarmCredentials(id, 'realuser', PW)).result).toMatchObject({ code: 'demo-username' })
    s = ok(s, T0, E.submitFarmCredentials(id, 'demo_tester', PW))
    expect(E.run(as(s, 'u-a', 'customer'), T0, null, E.ownerCallStandby(id)).result).toMatchObject({ code: 'role' })
    s = ok(as(s, 'u-a', 'owner'), T0 + MINUTE, E.ownerCallStandby(id))
    const standby = job(s, id).standby!
    expect(standby.deadline - standby.startedAt).toBe(STANDBY.readyWindowMs)
    s = ok(as(s, 'u-a', 'customer'), T0 + 4 * MINUTE, E.customerReady(id, standby.requestId))
    s = ok(as(s, 'u-a', 'owner'), T0 + 5 * MINUTE, E.ownerStartLogin(id))
    s = ok(s, T0 + 9 * MINUTE, E.ownerRequestVerification(id, 'code'))
    const v1 = job(s, id).verification!
    expect(v1.startedAt).toBe(T0 + 9 * MINUTE)
    expect(v1.deadline - v1.startedAt).toBe(STANDBY.verificationWindowMs)
    // past the standby deadline, the verification window still applies independently
    expect(job(E.sweep(s, T0 + 10 * MINUTE), id).access).toBe('awaiting-code')
    s = ok(s, T0 + 10 * MINUTE, E.ownerRequestVerification(id, 'code'))
    const v2 = job(s, id).verification!
    const cust = as(s, 'u-a', 'customer')
    expect(E.run(cust, T0 + 11 * MINUTE, null, E.customerSubmitCode(id, v1.requestId, CODE)).result).toMatchObject({ code: 'stale' })
    s = ok(cust, T0 + 11 * MINUTE, E.customerSubmitCode(id, v2.requestId, CODE))
    expect(job(s, id).access).toBe('checking-result')
    expect(job(E.sweep(s, T0 + 60 * MINUTE), id).access).toBe('checking-result') // no automatic success or timeout once submitted
    s = ok(as(s, 'u-a', 'owner'), T0 + 12 * MINUTE, E.ownerMarkAccess(id))
    s = ok(s, T0 + 13 * MINUTE, E.ownerStartFarm(id))
    s = ok(s, T0 + 60 * MINUTE, E.ownerReportProgress(id, 5000))
    s = ok(s, T0 + 70 * MINUTE, E.ownerComplete(id))
    expect(job(s, id).status).toBe('completed')
    const persisted = JSON.stringify(s)
    expect(persisted).not.toContain(PW)
    expect(persisted).not.toContain(CODE)
  })

  it('timeouts go to reschedule with no money change', () => {
    let { s, id } = ordered()
    s = ok(s, T0, E.submitFarmCredentials(id, 'demo_tester', 'pw'))
    const bal = E.balanceOf(s, 'u-a')
    s = ok(as(s, 'u-a', 'owner'), T0, E.ownerCallStandby(id))
    s = E.sweep(s, T0 + STANDBY.readyWindowMs)
    expect(job(s, id).access).toBe('reschedule')
    s = ok(s, T0 + 10 * MINUTE, E.ownerCallStandby(id))
    s = ok(as(s, 'u-a', 'customer'), T0 + 11 * MINUTE, E.customerReady(id, job(s, id).standby!.requestId))
    s = ok(as(s, 'u-a', 'owner'), T0 + 11 * MINUTE, E.ownerStartLogin(id))
    s = ok(s, T0 + 12 * MINUTE, E.ownerRequestVerification(id, 'roblox-approval'))
    s = E.sweep(s, T0 + 17 * MINUTE)
    expect(job(s, id).access).toBe('reschedule')
    expect(E.balanceOf(s, 'u-a')).toBe(bal)
  })

  it('progress is undefined until the shop reports a measurement', () => {
    const { s, id } = ordered()
    expect(job(s, id).measuredDiamonds).toBeUndefined()
  })
})
