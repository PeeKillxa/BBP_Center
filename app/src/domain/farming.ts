import type { DiamondPricingConfig } from '../config/farming'
import type { Satang } from '../lib/money'

export type QuantityError =
  | { code: 'not-a-number' }
  | { code: 'not-integer' }
  | { code: 'negative' }
  | { code: 'below-min'; min: number }
  | { code: 'above-max'; max: number }
  | { code: 'off-step'; step: number; lower: number; upper: number }

export const QUANTITY_ERROR_TEXT = (e: QuantityError): string => {
  const n = (v: number) => v.toLocaleString('th-TH')
  switch (e.code) {
    case 'not-a-number':
      return 'กรุณาใช้เลขอารบิก 0–9 สำหรับจำนวนเพชร'
    case 'not-integer':
      return 'จำนวนเพชรต้องเป็นจำนวนเต็ม'
    case 'negative':
      return 'จำนวนเพชรต้องไม่ติดลบ'
    case 'below-min':
      return `ขั้นต่ำ ${n(e.min)} เพชร`
    case 'above-max':
      return `สูงสุด ${n(e.max)} เพชรต่อออเดอร์`
    case 'off-step':
      return `ต้องเพิ่มทีละ ${n(e.step)} เพชร เช่น ${n(e.lower)} หรือ ${n(e.upper)}`
  }
}

/** Validate a raw custom-quantity input against the configured min/step/max. */
export const validateDiamondQuantity = (
  raw: string | number,
  cfg: DiamondPricingConfig['custom'],
): { ok: true; value: number } | { ok: false; error: QuantityError } => {
  const s = typeof raw === 'number' ? String(raw) : raw.replace(/,/g, '').trim()
  if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return { ok: false, error: { code: 'not-a-number' } }
  const v = Number(s)
  if (v < 0) return { ok: false, error: { code: 'negative' } }
  if (!Number.isInteger(v)) return { ok: false, error: { code: 'not-integer' } }
  if (v < cfg.min) return { ok: false, error: { code: 'below-min', min: cfg.min } }
  if (v > cfg.max) return { ok: false, error: { code: 'above-max', max: cfg.max } }
  if ((v - cfg.min) % cfg.step !== 0) {
    const lower = cfg.min + Math.floor((v - cfg.min) / cfg.step) * cfg.step
    return { ok: false, error: { code: 'off-step', step: cfg.step, lower, upper: lower + cfg.step } }
  }
  return { ok: true, value: v }
}

/** Move to the next valid step; repair out-of-range values at the nearest boundary. */
export function stepDiamondQuantity(raw: string, direction: -1 | 1, cfg: DiamondPricingConfig['custom']): number {
  const text = raw.replace(/,/g, '').trim()
  if (!/^-?\d+(\.\d+)?$/.test(text) || !Number.isFinite(Number(text))) return cfg.min
  const value = Number(text)
  if (value < cfg.min) return cfg.min
  if (value > cfg.max) return cfg.max
  const position = (value - cfg.min) / cfg.step
  const next = direction < 0 ? Math.ceil(position) - 1 : Math.floor(position) + 1
  return Math.min(cfg.max, Math.max(cfg.min, cfg.min + next * cfg.step))
}

export type PriceResult =
  | { ok: true; satang: Satang }
  | { ok: false; reason: 'out-of-range' | 'fractional-rounding-undefined' }

/**
 * Piecewise linear interpolation between configured anchors, computed in integer satang.
 * Markdown.md asks for whole-unit results but defines no rounding direction, so a
 * configuration that produces a fraction is reported instead of silently rounded.
 */
export const priceForDiamonds = (diamonds: number, cfg: DiamondPricingConfig): PriceResult => {
  const a = cfg.anchors
  if (diamonds < a[0].diamonds || diamonds > a[a.length - 1].diamonds) return { ok: false, reason: 'out-of-range' }
  for (let i = 0; i < a.length; i++) {
    if (a[i].diamonds === diamonds) return { ok: true, satang: a[i].priceBaht * 100 }
    const next = a[i + 1]
    if (next && diamonds > a[i].diamonds && diamonds < next.diamonds) {
      const p0 = a[i].priceBaht * 100
      const p1 = next.priceBaht * 100
      const num = (diamonds - a[i].diamonds) * (p1 - p0)
      const den = next.diamonds - a[i].diamonds
      if (num % den !== 0) return { ok: false, reason: 'fractional-rounding-undefined' }
      const satang = p0 + num / den
      if (satang % 100 !== 0) return { ok: false, reason: 'fractional-rounding-undefined' }
      return { ok: true, satang }
    }
  }
  return { ok: false, reason: 'out-of-range' }
}

export interface FarmEstimate {
  rounds: number
  seconds: number
}

/** Anime Adventures diamond farming only: rounds = ceil(d / perRound), seconds = rounds × secondsPerRound. */
export const estimateDiamondFarm = (diamonds: number, rate: DiamondPricingConfig['rate']): FarmEstimate => {
  const rounds = Math.ceil(diamonds / rate.diamondsPerRound)
  return { rounds, seconds: rounds * rate.secondsPerRound }
}
