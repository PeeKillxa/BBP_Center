/**
 * Money is always an integer number of satang (1 THB = 100 satang).
 * Never store or compute money as floating-point baht.
 */
export type Satang = number

export const baht = (wholeBaht: number): Satang => {
  if (!Number.isInteger(wholeBaht)) throw new Error('baht() expects whole baht; use satang for fractions')
  return wholeBaht * 100
}

export const assertSatang = (v: number): Satang => {
  if (!Number.isSafeInteger(v)) throw new Error(`Invalid satang amount: ${v}`)
  return v
}

const fmt = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Consistent display: ฿1,290.00 */
export const formatTHB = (s: Satang): string => fmt.format(s / 100)

/** Parse a user-entered baht string ("150", "150.5", "1,200.25") into satang. */
export const parseBahtInput = (raw: string): Satang | null => {
  const t = raw.replace(/,/g, '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null
  const [w, f = ''] = t.split('.')
  return Number(w) * 100 + Number((f + '00').slice(0, 2))
}
