export const SECOND = 1000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY_MS = 24 * HOUR

/** Seconds → "2 วัน 7 ชั่วโมง 34 นาที" (seconds below a minute are dropped). */
export const formatDurationTH = (totalSeconds: number): string => {
  const mins = Math.floor(totalSeconds / 60)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const parts: string[] = []
  if (d) parts.push(`${d} วัน`)
  if (h) parts.push(`${h} ชั่วโมง`)
  if (m || parts.length === 0) parts.push(`${m} นาที`)
  return parts.join(' ')
}

/** Milliseconds remaining → "11:59:03" or "04:59". */
export const formatCountdown = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

const dtf = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Bangkok',
})
/** All customer-facing timestamps use the shop's Asia/Bangkok timezone. */
export const formatDateTime = (ms: number): string => dtf.format(new Date(ms))
