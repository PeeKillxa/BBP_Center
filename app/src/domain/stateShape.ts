import type { DemoState } from './types'

type JsonRecord = Record<string, unknown>
type Guard = (value: unknown) => boolean

const LISTING_STATUSES = ['available', 'reserved', 'sold'] as const
const LEDGER_KINDS = ['topup', 'purchase', 'reservation-deposit', 'reservation-remainder', 'reservation-forfeit', 'farm-order', 'demo-adjust'] as const
const TOP_UP_METHODS = ['bank-slip', 'truemoney'] as const
const TOP_UP_STATUSES = ['checking', 'success', 'amount-mismatch', 'duplicate-slip', 'recipient-mismatch', 'unverifiable', 'invalid-link', 'used', 'expired', 'provider-unavailable'] as const
const RESERVATION_STATUSES = ['active', 'settled', 'forfeited'] as const
const FARM_JOB_STATUSES = ['awaiting-details', 'queued', 'in-progress', 'awaiting-customer', 'completed', 'cancelled'] as const
const ACCESS_STATUSES = ['waiting-call', 'standby-called', 'customer-ready', 'logging-in', 'awaiting-code', 'awaiting-roblox-approval', 'checking-result', 'access-granted', 'reschedule'] as const
const NOTIFICATION_KINDS = ['topup', 'purchase', 'reservation', 'farm'] as const

const isObject = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const has = (value: unknown, fields: readonly string[]): value is JsonRecord =>
  isObject(value) && fields.every((field) => field in value)

const isString: Guard = (value) => typeof value === 'string'
const isBoolean: Guard = (value) => typeof value === 'boolean'
const isNumber: Guard = (value) => typeof value === 'number' && Number.isFinite(value)
const isOptional = (value: unknown, guard: Guard) => value === undefined || guard(value)
const isArrayOf = (value: unknown, guard: Guard) => Array.isArray(value) && value.every(guard)
const isOneOf = (value: unknown, values: readonly string[]) =>
  typeof value === 'string' && values.includes(value)

const isUser: Guard = (value) =>
  has(value, ['id', 'displayName', 'email', 'joinedAt']) &&
  isString(value.id) && isString(value.displayName) && isString(value.email) && isNumber(value.joinedAt) &&
  isOptional(value.demoNote, isString)

const isMap: Guard = (value) =>
  has(value, ['id', 'name', 'tagline', 'hue']) &&
  isString(value.id) && isString(value.name) && isString(value.tagline) && isNumber(value.hue)

const isListingAttribute: Guard = (value) =>
  has(value, ['label', 'value']) && isString(value.label) && isString(value.value)

const isListing: Guard = (value) =>
  has(value, ['id', 'mapId', 'title', 'priceSatang', 'highlights', 'attributes', 'imageCount', 'status', 'createdAt']) &&
  isString(value.id) && isString(value.mapId) && isString(value.title) && isNumber(value.priceSatang) &&
  isArrayOf(value.highlights, isString) && isArrayOf(value.attributes, isListingAttribute) &&
  isNumber(value.imageCount) && isOneOf(value.status, LISTING_STATUSES) && isNumber(value.createdAt) &&
  isOptional(value.server, isString)

const isLedgerEntry: Guard = (value) =>
  has(value, ['id', 'userId', 'at', 'amountSatang', 'kind', 'note']) &&
  isString(value.id) && isString(value.userId) && isNumber(value.at) && isNumber(value.amountSatang) &&
  isOneOf(value.kind, LEDGER_KINDS) && isString(value.note) && isOptional(value.refId, isString)

const isTopUp: Guard = (value) =>
  has(value, ['id', 'userId', 'method', 'amountSatang', 'status', 'createdAt', 'sourceFingerprint', 'credited', 'plannedOutcome', 'resolveAt']) &&
  isString(value.id) && isString(value.userId) && isOneOf(value.method, TOP_UP_METHODS) &&
  isNumber(value.amountSatang) && isOneOf(value.status, TOP_UP_STATUSES) && isNumber(value.createdAt) &&
  isOptional(value.resolvedAt, isNumber) && isString(value.sourceFingerprint) && isBoolean(value.credited) &&
  isOneOf(value.plannedOutcome, TOP_UP_STATUSES) && (value.resolveAt === null || isNumber(value.resolveAt))

const isOrder: Guard = (value) =>
  has(value, ['id', 'userId', 'listingId', 'listingTitle', 'priceSatang', 'discountSatang', 'paidSatang', 'source', 'createdAt']) &&
  isString(value.id) && isString(value.userId) && isString(value.listingId) && isString(value.listingTitle) &&
  isNumber(value.priceSatang) && isNumber(value.discountSatang) && isNumber(value.paidSatang) &&
  isOneOf(value.source, ['direct', 'reservation']) && isNumber(value.createdAt) &&
  isOptional(value.couponCode, isString) && isOptional(value.reservationId, isString)

const isReservation: Guard = (value) =>
  has(value, ['id', 'userId', 'listingId', 'listingTitle', 'lockedPriceSatang', 'depositSatang', 'createdAt', 'holdEndsAt', 'expiresAt', 'status', 'notified']) &&
  isString(value.id) && isString(value.userId) && isString(value.listingId) && isString(value.listingTitle) &&
  isNumber(value.lockedPriceSatang) && isNumber(value.depositSatang) && isNumber(value.createdAt) &&
  isNumber(value.holdEndsAt) && isNumber(value.expiresAt) && isOneOf(value.status, RESERVATION_STATUSES) &&
  isObject(value.notified) && isOptional(value.notified.nearHoldEnd, isBoolean) && isOptional(value.notified.grace, isBoolean) &&
  isOptional(value.settledAt, isNumber) && isOptional(value.orderId, isString) &&
  isOptional(value.forfeitedAt, isNumber) && isOptional(value.cooldownUntil, isNumber)

const isTimedRequest: Guard = (value) =>
  has(value, ['requestId', 'startedAt', 'deadline']) &&
  isString(value.requestId) && isNumber(value.startedAt) && isNumber(value.deadline)

const isTimelineEvent: Guard = (value) =>
  has(value, ['id', 'at', 'actor', 'text']) &&
  isString(value.id) && isNumber(value.at) && isOneOf(value.actor, ['customer', 'shop', 'system']) && isString(value.text)

const isFarmJob: Guard = (value) => {
  if (!has(value, ['id', 'userId', 'serviceId', 'serviceName', 'diamonds', 'priceSatang', 'discountSatang', 'paidSatang', 'estimateSeconds', 'createdAt', 'status', 'access', 'timeline'])) return false
  if (!isString(value.id) || !isString(value.userId) || !isString(value.serviceId) || !isString(value.serviceName)) return false
  if (!isNumber(value.diamonds) || !isNumber(value.priceSatang) || !isNumber(value.discountSatang) || !isNumber(value.paidSatang) || !isNumber(value.estimateSeconds) || !isNumber(value.createdAt)) return false
  if (!isOneOf(value.status, FARM_JOB_STATUSES) || !isOneOf(value.access, ACCESS_STATUSES) || !isArrayOf(value.timeline, isTimelineEvent)) return false
  if (!isOptional(value.couponCode, isString) || !isOptional(value.measuredDiamonds, isNumber) || !isOptional(value.standby, isTimedRequest)) return false
  if (value.credentials !== undefined && (!has(value.credentials, ['usernameMasked', 'submittedAt']) || !isString(value.credentials.usernameMasked) || !isNumber(value.credentials.submittedAt))) return false
  const verification = value.verification
  return verification === undefined || (has(verification, ['requestId', 'startedAt', 'deadline', 'method']) && isTimedRequest(verification) && isOneOf(verification.method, ['code', 'roblox-approval']))
}

const isCoupon: Guard = (value) =>
  has(value, ['code', 'label', 'scope', 'kind', 'value', 'expiresAt']) &&
  isString(value.code) && isString(value.label) && isOneOf(value.scope, ['listing', 'farm']) &&
  isOneOf(value.kind, ['percent', 'fixed']) && isNumber(value.value) && isNumber(value.expiresAt) &&
  isOptional(value.maxDiscountSatang, isNumber) && isOptional(value.minSpendSatang, isNumber)

const isNotification: Guard = (value) =>
  has(value, ['id', 'userId', 'at', 'kind', 'title', 'body', 'read']) &&
  isString(value.id) && isString(value.userId) && isNumber(value.at) && isOneOf(value.kind, NOTIFICATION_KINDS) &&
  isString(value.title) && isString(value.body) && isBoolean(value.read) && isOptional(value.href, isString)

const isReview: Guard = (value) =>
  has(value, ['id', 'userId', 'orderId', 'displayName', 'rating', 'text', 'at', 'sample']) &&
  isString(value.id) && isString(value.userId) && isString(value.orderId) && isString(value.displayName) &&
  isNumber(value.rating) && isString(value.text) && isNumber(value.at) && isBoolean(value.sample)

const isCommandResult: Guard = (value) => {
  if (!has(value, ['ok']) || !isBoolean(value.ok)) return false
  if (value.ok) return isOptional(value.id, isString) && isOptional(value.message, isString)
  return has(value, ['code', 'message']) && isString(value.code) && isString(value.message) && isOptional(value.shortfallSatang, isNumber)
}

const isDemoSettings: Guard = (value) =>
  has(value, ['nextTopUpOutcome', 'simulateLoadError', 'latencyMs']) &&
  isOneOf(value.nextTopUpOutcome, TOP_UP_STATUSES) && isBoolean(value.simulateLoadError) && isNumber(value.latencyMs)

/**
 * Parse persisted demo state. Returns null (caller reseeds) when the data is missing,
 * unparseable, from another version, or the right version but the wrong shape.
 * A wrong-shaped state would otherwise throw on every render and every tick.
 */
export const parseStoredState = (raw: string | null, version: number): DemoState | null => {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!has(parsed, ['version', 'clockOffsetMs', 'currentUserId', 'viewMode', 'users', 'maps', 'listings', 'ledger', 'topups', 'orders', 'reservations', 'farmJobs', 'coupons', 'notifications', 'reviews', 'processed', 'demo'])) return null
  if (parsed.version !== version || !isNumber(parsed.clockOffsetMs)) return null
  if (!(parsed.currentUserId === null || isString(parsed.currentUserId)) || !isOneOf(parsed.viewMode, ['customer', 'owner'])) return null
  if (!isArrayOf(parsed.users, isUser) || !isArrayOf(parsed.maps, isMap) || !isArrayOf(parsed.listings, isListing)) return null
  if (!isArrayOf(parsed.ledger, isLedgerEntry) || !isArrayOf(parsed.topups, isTopUp) || !isArrayOf(parsed.orders, isOrder)) return null
  if (!isArrayOf(parsed.reservations, isReservation) || !isArrayOf(parsed.farmJobs, isFarmJob) || !isArrayOf(parsed.coupons, isCoupon)) return null
  if (!isArrayOf(parsed.notifications, isNotification) || !isArrayOf(parsed.reviews, isReview)) return null
  if (!isObject(parsed.processed) || !Object.values(parsed.processed).every(isCommandResult) || !isDemoSettings(parsed.demo)) return null
  return parsed as unknown as DemoState
}
