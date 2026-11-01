import { HOUR, MINUTE } from '../lib/time'

/** Reservation rules: docs/Markdown.md §5. */
export const RESERVATION = {
  depositPercent: 50,
  holdMs: 12 * HOUR,
  graceMs: 2 * HOUR,
  /** Same customer + same listing only, counted from the moment reservation rights expire. */
  cooldownMs: 6 * HOUR,
  /** Demo notification threshold before the 12-hour point. Not a business rule. */
  nearEndNoticeMs: 1 * HOUR,
} as const

/** Standby / verification windows: docs/Markdown.md §7. */
export const STANDBY = {
  readyWindowMs: 5 * MINUTE,
  verificationWindowMs: 5 * MINUTE,
} as const

/**
 * Verification-code format is configuration: no fixed digit count is assumed.
 * TODO(owner): define the real accepted format.
 */
export const VERIFICATION_CODE = {
  pattern: /^[0-9A-Za-z-]{1,32}$/,
  hint: 'กรอกรหัสตามที่ได้รับ (รูปแบบรหัสจริงรอร้านกำหนด)',
}

/** Demo-only guard so testers do not type a real Roblox username. */
export const DEMO_USERNAME_PREFIX = 'demo_'

/** Contact channels: null = awaiting owner. Never fabricate a link. */
export const CONTACT: { line: string | null; discord: string | null } = {
  line: null,
  discord: null,
}
