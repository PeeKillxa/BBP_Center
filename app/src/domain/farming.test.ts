import { describe, expect, it } from 'vitest'
import { getFarmService } from '../config/farming'
import { formatDurationTH } from '../lib/time'
import { estimateDiamondFarm, priceForDiamonds, validateDiamondQuantity } from './farming'

const cfg = getFarmService('aa-diamond')!.diamond!
const price = (d: number) => {
  const r = priceForDiamonds(d, cfg)
  return r.ok ? r.satang / 100 : r.reason
}
const time = (d: number) => formatDurationTH(estimateDiamondFarm(d, cfg.rate).seconds)
const v = (raw: string) => {
  const r = validateDiamondQuantity(raw, cfg.custom)
  return r.ok ? r.value : r.error.code
}

describe('Anime Adventures diamond pricing', () => {
  it('returns exact anchor prices', () => {
    expect([10, 20, 30, 50, 100, 120, 250].map((k) => price(k * 1000))).toEqual([20, 40, 60, 100, 160, 180, 310])
  })
  it('interpolates between anchors', () => {
    expect(price(40_000)).toBe(80)
    expect(price(60_000)).toBe(112)
    expect(price(110_000)).toBe(170)
    expect(price(130_000)).toBe(190)
    expect(price(200_000)).toBe(260)
  })
  it('every orderable 10k step up to the cap yields whole baht', () => {
    for (let d = cfg.custom.min; d <= cfg.custom.max; d += cfg.custom.step) expect(typeof price(d)).toBe('number')
  })
  it('does not extrapolate beyond the last anchor', () => {
    expect(price(260_000)).toBe('out-of-range')
    expect(price(9_000)).toBe('out-of-range')
  })
  it('package cards match the spec', () => {
    expect(cfg.packages).toEqual([10_000, 20_000, 50_000, 100_000, 250_000])
    expect(cfg.custom).toMatchObject({ min: 10_000, step: 10_000, max: 250_000 })
  })
})

describe('custom quantity validation', () => {
  it('accepts 10k steps from the minimum to 250k', () => {
    expect(v('10000')).toBe(10_000)
    expect(v('40,000')).toBe(40_000)
    expect(v('250000')).toBe(250_000)
  })
  it('accepts pasted values with commas and surrounding spaces', () => {
    expect(v('  100,000 ')).toBe(100_000)
  })
  it('rejects invalid input', () => {
    expect(v('15000')).toBe('off-step')
    expect(v('')).toBe('not-a-number')
    expect(v('abc')).toBe('not-a-number')
    expect(v('๑๐๐๐๐')).toBe('not-a-number')
    expect(v('1e4')).toBe('not-a-number')
    expect(v('-10000')).toBe('negative')
    expect(v('10000.5')).toBe('not-integer')
    expect(v('0')).toBe('below-min')
    expect(v('260000')).toBe('above-max')
  })
})

describe('duration estimate', () => {
  it('1k = 56 rounds = 1 ชั่วโมง 52 นาที (formula check; below order minimum)', () => {
    expect(estimateDiamondFarm(1_000, cfg.rate).rounds).toBe(56)
    expect(time(1_000)).toBe('1 ชั่วโมง 52 นาที')
  })
  it('matches the documented examples', () => {
    expect(time(10_000)).toBe('18 ชั่วโมง 32 นาที')
    expect(time(100_000)).toBe('7 วัน 17 ชั่วโมง 12 นาที')
    expect(time(120_000)).toBe('9 วัน 6 ชั่วโมง 14 นาที')
  })
  it('250k = 13,889 rounds = 19 วัน 6 ชั่วโมง 58 นาที', () => {
    expect(estimateDiamondFarm(250_000, cfg.rate).rounds).toBe(13_889)
    expect(time(250_000)).toBe('19 วัน 6 ชั่วโมง 58 นาที')
  })
})
