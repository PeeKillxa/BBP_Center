import type { Satang } from '../lib/money'

export type ListingStatus = 'available' | 'reserved' | 'sold'

export interface MapCategory {
  id: string
  name: string // editable data, not hardcoded in UI
  tagline: string
  hue: number // placeholder art color
}

export interface ListingAttribute {
  label: string
  value: string
}

export interface Listing {
  id: string
  mapId: string
  title: string
  priceSatang: Satang
  highlights: string[]
  attributes: ListingAttribute[]
  server?: string
  imageCount: number // placeholder art only; no third-party images
  status: ListingStatus
  createdAt: number
}

export interface User {
  id: string
  displayName: string
  email: string
  joinedAt: number
  demoNote?: string
}

export type LedgerKind =
  | 'topup'
  | 'purchase'
  | 'reservation-deposit'
  | 'reservation-remainder'
  | 'reservation-forfeit'
  | 'farm-order'
  | 'demo-adjust'

export interface LedgerEntry {
  id: string
  userId: string
  at: number
  /** Signed satang change to the wallet. Forfeit entries are 0: the deposit was already debited. */
  amountSatang: Satang
  kind: LedgerKind
  refId?: string
  note: string
}

export type TopUpMethod = 'bank-slip' | 'truemoney'
export type TopUpStatus =
  | 'checking'
  | 'success'
  | 'amount-mismatch'
  | 'duplicate-slip'
  | 'recipient-mismatch'
  | 'unverifiable'
  | 'invalid-link'
  | 'used'
  | 'expired'
  | 'provider-unavailable'

export interface TopUp {
  id: string
  userId: string
  method: TopUpMethod
  amountSatang: Satang
  status: TopUpStatus
  createdAt: number
  resolvedAt?: number
  /** Demo duplicate detection only; the real check must run on the server. */
  sourceFingerprint: string
  credited: boolean
  /** Outcome the demo checker will return; chosen in Demo Controls at submit time. */
  plannedOutcome: TopUpStatus
  /** Demo auto-resolve time; null waits for a manual Demo Controls decision. */
  resolveAt: number | null
}

export interface Order {
  id: string
  userId: string
  listingId: string
  listingTitle: string
  priceSatang: Satang // locked/list price
  discountSatang: Satang
  paidSatang: Satang // total actually debited for this order
  couponCode?: string
  source: 'direct' | 'reservation'
  reservationId?: string
  createdAt: number
}

export type ReservationStatus = 'active' | 'settled' | 'forfeited'

export interface Reservation {
  id: string
  userId: string
  listingId: string
  listingTitle: string
  lockedPriceSatang: Satang
  depositSatang: Satang
  createdAt: number
  holdEndsAt: number // created + 12h
  expiresAt: number // created + 14h (hold + 2h grace)
  status: ReservationStatus
  settledAt?: number
  orderId?: string
  forfeitedAt?: number
  cooldownUntil?: number // forfeitedAt + 6h, same user + same listing only
  notified: { nearHoldEnd?: boolean; grace?: boolean }
}

export type FarmJobStatus = 'awaiting-details' | 'queued' | 'in-progress' | 'awaiting-customer' | 'completed' | 'cancelled'

export type AccessStatus =
  | 'waiting-call'
  | 'standby-called'
  | 'customer-ready'
  | 'logging-in'
  | 'awaiting-code'
  | 'awaiting-roblox-approval'
  | 'checking-result'
  | 'access-granted'
  | 'reschedule'

export type VerificationMethod = 'code' | 'roblox-approval'

export interface TimedRequest {
  requestId: string
  startedAt: number
  deadline: number
}

export interface FarmTimelineEvent {
  id: string
  at: number
  actor: 'customer' | 'shop' | 'system'
  text: string // never contains passwords or verification codes
}

export interface FarmJob {
  id: string
  userId: string
  serviceId: string
  serviceName: string
  diamonds: number
  priceSatang: Satang
  discountSatang: Satang
  paidSatang: Satang
  couponCode?: string
  estimateSeconds: number
  createdAt: number
  status: FarmJobStatus
  access: AccessStatus
  /** Masked username only. The password is never stored, even in the demo. */
  credentials?: { usernameMasked: string; submittedAt: number }
  standby?: TimedRequest
  verification?: TimedRequest & { method: VerificationMethod }
  /** Measured progress reported by the shop. Undefined means "no measurement", never a time-based guess. */
  measuredDiamonds?: number
  timeline: FarmTimelineEvent[]
}

export type CouponScope = 'listing' | 'farm'
export interface Coupon {
  code: string
  label: string
  scope: CouponScope
  kind: 'percent' | 'fixed'
  value: number // percent (integer) or satang
  maxDiscountSatang?: Satang
  minSpendSatang?: Satang
  expiresAt: number
}

export interface AppNotification {
  id: string
  userId: string
  at: number
  kind: 'topup' | 'purchase' | 'reservation' | 'farm'
  title: string
  body: string
  href?: string
  read: boolean
}

export interface Review {
  id: string
  userId: string
  orderId: string
  displayName: string
  rating: number
  text: string
  at: number
  sample: boolean
}

export interface DemoSettings {
  nextTopUpOutcome: TopUpStatus
  simulateLoadError: boolean
  latencyMs: number
}

export interface DemoState {
  version: number
  clockOffsetMs: number
  currentUserId: string | null
  viewMode: 'customer' | 'owner'
  users: User[]
  maps: MapCategory[]
  listings: Listing[]
  ledger: LedgerEntry[]
  topups: TopUp[]
  orders: Order[]
  reservations: Reservation[]
  farmJobs: FarmJob[]
  coupons: Coupon[]
  notifications: AppNotification[]
  reviews: Review[]
  /** Idempotency keys already processed → stored result. Mirrors what the server must do. */
  processed: Record<string, CommandResult>
  demo: DemoSettings
}

export type CommandResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; code: string; message: string; shortfallSatang?: Satang }
