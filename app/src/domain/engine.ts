/**
 * Demo domain engine. Pure functions over DemoState.
 *
 * This file simulates what the real server must do (atomic debit + stock change,
 * idempotency, server time). Running it in the browser is NOT a security control.
 * See docs/HANDOFF.md for the production requirements.
 */
import { getFarmService } from '../config/farming'
import { RESERVATION, STANDBY, VERIFICATION_CODE, DEMO_USERNAME_PREFIX } from '../config/rules'
import { formatTHB, type Satang } from '../lib/money'
import { formatDurationTH } from '../lib/time'
import { uid } from '../lib/util'
import { estimateDiamondFarm, priceForDiamonds, QUANTITY_ERROR_TEXT, validateDiamondQuantity } from './farming'
import type {
  AppNotification,
  CommandResult,
  Coupon,
  CouponScope,
  DemoState,
  FarmJob,
  LedgerEntry,
  Listing,
  Reservation,
  TopUpMethod,
  TopUpStatus,
  VerificationMethod,
} from './types'

export type Cmd = (draft: DemoState, now: number) => CommandResult

const fail = (code: string, message: string, extra?: { shortfallSatang?: Satang }): CommandResult => ({
  ok: false,
  code,
  message,
  ...extra,
})

/**
 * Run a command against a copy of state. A successful result is remembered under its
 * idempotency key: replaying the key returns the original result with no new effect.
 */
export const run = (
  state: DemoState,
  now: number,
  key: string | null,
  cmd: Cmd,
): { state: DemoState; result: CommandResult } => {
  if (key && state.processed[key]) return { state, result: state.processed[key] }
  const draft: DemoState = structuredClone(state)
  sweepInto(draft, now)
  const result = cmd(draft, now)
  if (!result.ok) return { state, result }
  if (key) draft.processed[key] = result
  return { state: draft, result }
}

// ---------- wallet ----------

export const balanceOf = (s: DemoState, userId: string): Satang =>
  s.ledger.reduce((sum, e) => (e.userId === userId ? sum + e.amountSatang : sum), 0)

const post = (d: DemoState, e: Omit<LedgerEntry, 'id'>) => {
  d.ledger.push({ id: uid('TX'), ...e })
}

const notify = (d: DemoState, n: Omit<AppNotification, 'id' | 'read'>) => {
  d.notifications.unshift({ id: uid('NT'), read: false, ...n })
}

const requireUser = (d: DemoState) => {
  const u = d.users.find((x) => x.id === d.currentUserId)
  return u ?? null
}

// ---------- coupons ----------

export type CouponCheck =
  | { status: 'valid'; coupon: Coupon; discountSatang: Satang }
  | { status: 'expired' | 'not-eligible' | 'not-found'; message: string }

export const checkCoupon = (
  s: DemoState,
  code: string,
  scope: CouponScope,
  subtotal: Satang,
  now: number,
): CouponCheck => {
  const c = s.coupons.find((x) => x.code.toUpperCase() === code.trim().toUpperCase())
  if (!c) return { status: 'not-found', message: 'ไม่พบคูปองนี้' }
  if (now >= c.expiresAt) return { status: 'expired', message: 'คูปองนี้หมดอายุแล้ว' }
  if (c.scope !== scope)
    return { status: 'not-eligible', message: c.scope === 'farm' ? 'คูปองนี้ใช้ได้กับบริการฟาร์มเท่านั้น' : 'คูปองนี้ใช้ได้กับการซื้อไอดีเท่านั้น' }
  if (c.minSpendSatang && subtotal < c.minSpendSatang)
    return { status: 'not-eligible', message: `ต้องมียอดขั้นต่ำ ${formatTHB(c.minSpendSatang)}` }
  let discount = c.kind === 'percent' ? Math.floor((subtotal * c.value) / 100) : c.value
  if (c.maxDiscountSatang) discount = Math.min(discount, c.maxDiscountSatang)
  discount = Math.min(discount, subtotal)
  return { status: 'valid', coupon: c, discountSatang: discount }
}

// ---------- top-up (simulated checker) ----------

const TOPUP_FAIL_TEXT: Record<Exclude<TopUpStatus, 'checking' | 'success'>, string> = {
  'amount-mismatch': 'ยอดเงินในสลิปไม่ตรงกับจำนวนที่ระบุ',
  'duplicate-slip': 'สลิปนี้เคยถูกใช้แล้ว',
  'recipient-mismatch': 'บัญชีผู้รับในสลิปไม่ตรงกับร้าน',
  unverifiable: 'ตรวจสอบสลิปไม่ได้ กรุณาติดต่อร้าน',
  'invalid-link': 'ลิงก์อั่งเปาไม่ถูกต้อง',
  used: 'ซองอั่งเปานี้ถูกใช้แล้ว',
  expired: 'ซองอั่งเปานี้หมดอายุแล้ว',
  'provider-unavailable': 'ผู้ให้บริการไม่พร้อมใช้งานชั่วคราว',
}
export const topUpStatusText = (s: TopUpStatus) =>
  s === 'checking' ? 'กำลังตรวจสอบ' : s === 'success' ? 'เติมเงินสำเร็จ' : TOPUP_FAIL_TEXT[s]

export const SLIP_OUTCOMES: TopUpStatus[] = ['success', 'amount-mismatch', 'duplicate-slip', 'recipient-mismatch', 'unverifiable']
export const TRUEMONEY_OUTCOMES: TopUpStatus[] = ['success', 'invalid-link', 'used', 'expired', 'provider-unavailable']

export const submitTopUp =
  (method: TopUpMethod, amountSatang: Satang, sourceFingerprint: string, outcome: TopUpStatus, resolveAfterMs: number | null): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    if (!u) return fail('auth', 'กรุณาเข้าสู่ระบบก่อนเติมเงิน')
    if (!Number.isSafeInteger(amountSatang) || amountSatang <= 0) return fail('amount', 'จำนวนเงินไม่ถูกต้อง')
    const allowed = method === 'bank-slip' ? SLIP_OUTCOMES : TRUEMONEY_OUTCOMES
    const planned = allowed.includes(outcome) ? outcome : 'success'
    const id = uid('TU')
    d.topups.unshift({
      id,
      userId: u.id,
      method,
      amountSatang,
      status: 'checking',
      createdAt: now,
      sourceFingerprint,
      credited: false,
      plannedOutcome: planned,
      resolveAt: resolveAfterMs === null ? null : now + resolveAfterMs,
    })
    return { ok: true, id }
  }

/** Resolve a pending top-up. Credits at most once per top-up and per source (idempotent). */
export const resolveTopUp =
  (topupId: string, forceOutcome?: TopUpStatus): Cmd =>
  (d, now) => {
    const t = d.topups.find((x) => x.id === topupId)
    if (!t) return fail('not-found', 'ไม่พบรายการเติมเงิน')
    if (t.status !== 'checking') return { ok: true, id: t.id, message: 'already-resolved' }
    let outcome = forceOutcome ?? t.plannedOutcome
    if (outcome === 'checking') return { ok: true, id: t.id, message: 'still-checking' }
    // A source that already credited once can never credit again.
    const reused = d.topups.some((x) => x.id !== t.id && x.credited && x.sourceFingerprint === t.sourceFingerprint)
    if (outcome === 'success' && reused) outcome = t.method === 'bank-slip' ? 'duplicate-slip' : 'used'
    t.status = outcome
    t.resolvedAt = now
    if (outcome === 'success' && !t.credited) {
      t.credited = true
      post(d, { userId: t.userId, at: now, amountSatang: t.amountSatang, kind: 'topup', refId: t.id, note: t.method === 'bank-slip' ? 'เติมเงินผ่านสลิป (จำลอง)' : 'เติมเงินอั่งเปา (จำลอง)' })
    }
    notify(d, {
      userId: t.userId,
      at: now,
      kind: 'topup',
      title: outcome === 'success' ? 'เติมเงินสำเร็จ' : 'เติมเงินไม่สำเร็จ',
      body: outcome === 'success' ? `เพิ่มยอด ${formatTHB(t.amountSatang)} เข้ากระเป๋าแล้ว` : topUpStatusText(outcome),
      href: '/account/transactions',
    })
    return { ok: true, id: t.id }
  }

export const demoSetBalance =
  (userId: string, target: Satang): Cmd =>
  (d, now) => {
    if (!Number.isSafeInteger(target) || target < 0) return fail('amount', 'ยอดเงินต้องไม่ติดลบ')
    const diff = target - balanceOf(d, userId)
    if (diff !== 0) post(d, { userId, at: now, amountSatang: diff, kind: 'demo-adjust', note: 'ปรับยอดจาก Demo Controls' })
    return { ok: true }
  }

// ---------- listings, purchase ----------

export const activeReservationFor = (s: DemoState, listingId: string) =>
  s.reservations.find((r) => r.listingId === listingId && r.status === 'active')

export const cooldownFor = (s: DemoState, userId: string, listingId: string, now: number) =>
  s.reservations
    .filter((r) => r.userId === userId && r.listingId === listingId && r.status === 'forfeited' && (r.cooldownUntil ?? 0) > now)
    .sort((a, b) => (b.cooldownUntil ?? 0) - (a.cooldownUntil ?? 0))[0]

const shortfall = (d: DemoState, userId: string, need: Satang) => {
  const bal = balanceOf(d, userId)
  return bal >= need ? 0 : need - bal
}

const insufficient = (gap: Satang) =>
  fail('insufficient', `ยอดเงินไม่พอ ขาดอีก ${formatTHB(gap)}`, { shortfallSatang: gap })

const listingGone = (l: Listing | undefined) =>
  !l ? fail('not-found', 'ไม่พบสินค้านี้') : fail('unavailable', l.status === 'sold' ? 'สินค้านี้ขายแล้ว' : 'สินค้านี้ถูกจองอยู่')

/**
 * Full purchase. Revalidates availability and the quoted price, then debits, creates the
 * order, and marks the listing sold in one step (the server must do this in one DB transaction).
 */
export const purchaseListing =
  (listingId: string, quotedPrice: Satang, couponCode?: string): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    if (!u) return fail('auth', 'กรุณาเข้าสู่ระบบก่อนซื้อ')
    const l = d.listings.find((x) => x.id === listingId)
    if (!l || l.status !== 'available') return listingGone(l)
    if (l.priceSatang !== quotedPrice) return fail('price-changed', `ราคาสินค้าเปลี่ยนเป็น ${formatTHB(l.priceSatang)} กรุณาตรวจสอบอีกครั้ง`)
    let discount = 0
    if (couponCode) {
      const c = checkCoupon(d, couponCode, 'listing', l.priceSatang, now)
      if (c.status !== 'valid') return fail('coupon', c.message)
      discount = c.discountSatang
    }
    const total = l.priceSatang - discount
    const gap = shortfall(d, u.id, total)
    if (gap > 0) return insufficient(gap)
    const orderId = uid('OD')
    post(d, { userId: u.id, at: now, amountSatang: -total, kind: 'purchase', refId: orderId, note: `ซื้อ ${l.title}` })
    d.orders.unshift({ id: orderId, userId: u.id, listingId: l.id, listingTitle: l.title, priceSatang: l.priceSatang, discountSatang: discount, paidSatang: total, couponCode: discount ? couponCode?.toUpperCase() : undefined, source: 'direct', createdAt: now })
    l.status = 'sold'
    notify(d, { userId: u.id, at: now, kind: 'purchase', title: 'ซื้อสำเร็จ', body: `คำสั่งซื้อ ${orderId} พร้อมดูข้อมูลส่งมอบ`, href: `/account/orders/${orderId}` })
    return { ok: true, id: orderId }
  }

// ---------- reservations ----------

export const depositFor = (price: Satang): Satang | null =>
  (price * RESERVATION.depositPercent) % 100 === 0 ? (price * RESERVATION.depositPercent) / 100 : null

export const createReservation =
  (listingId: string, quotedPrice: Satang, acceptedForfeit: boolean): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    if (!u) return fail('auth', 'กรุณาเข้าสู่ระบบก่อนจอง')
    if (!acceptedForfeit) return fail('consent', 'กรุณายอมรับเงื่อนไขการริบเงินจองก่อนยืนยัน')
    const l = d.listings.find((x) => x.id === listingId)
    if (!l || l.status !== 'available') return listingGone(l)
    if (l.priceSatang !== quotedPrice) return fail('price-changed', `ราคาสินค้าเปลี่ยนเป็น ${formatTHB(l.priceSatang)} กรุณาตรวจสอบอีกครั้ง`)
    const cd = cooldownFor(d, u.id, l.id, now)
    if (cd) return fail('cooldown', 'คุณจองรายการนี้ซ้ำไม่ได้จนกว่าจะพ้นช่วงรอ 6 ชั่วโมง (ซื้อเต็มจำนวนได้)')
    const deposit = depositFor(l.priceSatang)
    if (deposit === null) return fail('rounding', 'ราคานี้ทำให้เงินจองมีเศษสตางค์ นโยบายการปัดเศษรอกำหนด')
    const gap = shortfall(d, u.id, deposit)
    if (gap > 0) return insufficient(gap)
    const id = uid('RS')
    const r: Reservation = {
      id,
      userId: u.id,
      listingId: l.id,
      listingTitle: l.title,
      lockedPriceSatang: l.priceSatang,
      depositSatang: deposit,
      createdAt: now,
      holdEndsAt: now + RESERVATION.holdMs,
      expiresAt: now + RESERVATION.holdMs + RESERVATION.graceMs,
      status: 'active',
      notified: {},
    }
    post(d, { userId: u.id, at: now, amountSatang: -deposit, kind: 'reservation-deposit', refId: id, note: `เงินจอง 50% ${l.title}` })
    d.reservations.unshift(r)
    l.status = 'reserved'
    notify(d, { userId: u.id, at: now, kind: 'reservation', title: 'จองสำเร็จ', body: `ล็อกราคา ${formatTHB(l.priceSatang)} ชำระส่วนที่เหลือ ${formatTHB(l.priceSatang - deposit)} ภายในเวลาที่กำหนด`, href: `/account/reservations/${id}` })
    return { ok: true, id }
  }

/** Pay only the remaining balance of the locked price. Fails once the 14-hour deadline is reached. */
export const settleReservation =
  (reservationId: string): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    if (!u) return fail('auth', 'กรุณาเข้าสู่ระบบ')
    const r = d.reservations.find((x) => x.id === reservationId)
    if (!r || r.userId !== u.id) return fail('not-found', 'ไม่พบรายการจองนี้')
    if (r.status === 'settled') return { ok: true, id: r.orderId, message: 'already-settled' }
    if (r.status !== 'active') return fail('expired', 'หมดเวลาชำระแล้ว เงินจองถูกริบตามเงื่อนไข')
    const remainder = r.lockedPriceSatang - r.depositSatang
    const gap = shortfall(d, u.id, remainder)
    if (gap > 0) return insufficient(gap)
    const l = d.listings.find((x) => x.id === r.listingId)!
    const orderId = uid('OD')
    post(d, { userId: u.id, at: now, amountSatang: -remainder, kind: 'reservation-remainder', refId: r.id, note: `ชำระยอดคงเหลือ ${r.listingTitle}` })
    d.orders.unshift({ id: orderId, userId: u.id, listingId: r.listingId, listingTitle: r.listingTitle, priceSatang: r.lockedPriceSatang, discountSatang: 0, paidSatang: r.lockedPriceSatang, source: 'reservation', reservationId: r.id, createdAt: now })
    r.status = 'settled'
    r.settledAt = now
    r.orderId = orderId
    l.status = 'sold'
    notify(d, { userId: u.id, at: now, kind: 'purchase', title: 'ชำระครบแล้ว', body: `คำสั่งซื้อ ${orderId} พร้อมดูข้อมูลส่งมอบ`, href: `/account/orders/${orderId}` })
    return { ok: true, id: orderId }
  }

// ---------- farming orders ----------

const jobEvent = (j: FarmJob, at: number, actor: 'customer' | 'shop' | 'system', text: string) => {
  j.timeline.push({ id: uid('EV'), at, actor, text })
}

export const orderFarm =
  (serviceId: string, diamondsRaw: string | number, quotedPrice: Satang, couponCode?: string): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    if (!u) return fail('auth', 'กรุณาเข้าสู่ระบบก่อนสั่งฟาร์ม')
    const svc = getFarmService(serviceId)
    if (!svc || !svc.orderable || !svc.diamond) return fail('not-orderable', svc?.pendingReason ?? 'บริการนี้ยังไม่เปิดสั่ง')
    const q = validateDiamondQuantity(diamondsRaw, svc.diamond.custom)
    if (!q.ok) return fail('quantity', QUANTITY_ERROR_TEXT(q.error))
    const p = priceForDiamonds(q.value, svc.diamond)
    if (!p.ok) return fail('price', 'ไม่สามารถคำนวณราคาสำหรับจำนวนนี้')
    if (p.satang !== quotedPrice) return fail('price-changed', 'ราคาเปลี่ยนแปลง กรุณาตรวจสอบอีกครั้ง')
    let discount = 0
    if (couponCode) {
      const c = checkCoupon(d, couponCode, 'farm', p.satang, now)
      if (c.status !== 'valid') return fail('coupon', c.message)
      discount = c.discountSatang
    }
    const total = p.satang - discount
    const gap = shortfall(d, u.id, total)
    if (gap > 0) return insufficient(gap)
    const id = uid('FJ')
    const est = estimateDiamondFarm(q.value, svc.diamond.rate)
    const job: FarmJob = {
      id,
      userId: u.id,
      serviceId: svc.id,
      serviceName: svc.name,
      diamonds: q.value,
      priceSatang: p.satang,
      discountSatang: discount,
      paidSatang: total,
      couponCode: discount ? couponCode?.toUpperCase() : undefined,
      estimateSeconds: est.seconds,
      createdAt: now,
      status: 'awaiting-details',
      access: 'waiting-call',
      timeline: [],
    }
    jobEvent(job, now, 'customer', `สั่งบริการ ${q.value.toLocaleString('th-TH')} เพชร ชำระ ${formatTHB(total)} · เวลาฟาร์มประมาณ ${formatDurationTH(est.seconds)}`)
    post(d, { userId: u.id, at: now, amountSatang: -total, kind: 'farm-order', refId: id, note: svc.name })
    d.farmJobs.unshift(job)
    notify(d, { userId: u.id, at: now, kind: 'farm', title: 'สั่งฟาร์มสำเร็จ', body: 'กรุณาส่งข้อมูลบัญชี (ข้อมูลสมมติ) เพื่อเข้าคิว', href: `/account/farm/${id}` })
    return { ok: true, id }
  }

const maskUsername = (u: string) => (u.length <= 4 ? u[0] + '***' : u.slice(0, 3) + '*'.repeat(Math.max(3, u.length - 5)) + u.slice(-2))

/**
 * The password is validated for presence only and then dropped: it is never written to state.
 * Demo usernames must start with "demo_" so testers cannot submit a real account by accident.
 */
export const submitFarmCredentials =
  (jobId: string, username: string, password: string): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    const j = d.farmJobs.find((x) => x.id === jobId)
    if (!u || !j || j.userId !== u.id) return fail('not-found', 'ไม่พบงานนี้')
    if (j.status !== 'awaiting-details') return fail('state', 'งานนี้ส่งข้อมูลแล้ว')
    const name = username.trim()
    if (!name.startsWith(DEMO_USERNAME_PREFIX) || name.length < DEMO_USERNAME_PREFIX.length + 2)
      return fail('demo-username', `โหมดสาธิต: ชื่อผู้ใช้ต้องขึ้นต้นด้วย ${DEMO_USERNAME_PREFIX} (ห้ามใช้บัญชีจริง)`)
    if (password.length === 0) return fail('password', 'กรุณากรอกรหัสผ่านสมมติ')
    j.credentials = { usernameMasked: maskUsername(name), submittedAt: now }
    j.status = 'queued'
    jobEvent(j, now, 'customer', 'ส่งข้อมูลบัญชีสมมติแล้ว (ระบบไม่บันทึกรหัสผ่าน)')
    return { ok: true, id: j.id }
  }

// ---------- standby / access workflow ----------

const ownerOnly = (d: DemoState) => (d.viewMode === 'owner' ? null : fail('role', 'เฉพาะมุมมองเจ้าของร้าน (Demo Switch)'))
const jobOf = (d: DemoState, id: string) => d.farmJobs.find((x) => x.id === id)

export const ownerCallStandby =
  (jobId: string): Cmd =>
  (d, now) => {
    const deny = ownerOnly(d)
    if (deny) return deny
    const j = jobOf(d, jobId)
    if (!j) return fail('not-found', 'ไม่พบงาน')
    if (!j.credentials) return fail('state', 'ลูกค้ายังไม่ส่งข้อมูลบัญชี')
    if (!['waiting-call', 'reschedule'].includes(j.access) || j.status === 'completed' || j.status === 'cancelled')
      return fail('state', 'เรียกสแตนด์บายได้เฉพาะสถานะรอเรียกลูกค้าหรือรอนัดใหม่')
    j.access = 'standby-called'
    j.status = 'awaiting-customer'
    j.standby = { requestId: uid('SB'), startedAt: now, deadline: now + STANDBY.readyWindowMs }
    j.verification = undefined
    jobEvent(j, now, 'shop', 'ร้านเรียกสแตนด์บาย รอลูกค้ากด “พร้อมแล้ว” ภายใน 5 นาที')
    notify(d, { userId: j.userId, at: now, kind: 'farm', title: 'ร้านเรียกสแตนด์บาย', body: 'กด “พร้อมแล้ว” ภายใน 5 นาที', href: `/account/farm/${j.id}` })
    return { ok: true }
  }

export const customerReady =
  (jobId: string, requestId: string): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    const j = jobOf(d, jobId)
    if (!u || !j || j.userId !== u.id) return fail('not-found', 'ไม่พบงาน')
    if (j.access !== 'standby-called' || j.standby?.requestId !== requestId) return fail('stale', 'คำเรียกนี้ไม่ใช้งานแล้ว')
    if (now >= j.standby.deadline) return fail('timeout', 'หมดเวลาตอบรับแล้ว')
    j.access = 'customer-ready'
    j.status = 'queued'
    jobEvent(j, now, 'customer', 'ลูกค้ากด “พร้อมแล้ว”')
    return { ok: true }
  }

export const ownerStartLogin =
  (jobId: string): Cmd =>
  (d, now) => {
    const deny = ownerOnly(d)
    if (deny) return deny
    const j = jobOf(d, jobId)
    if (!j || j.access !== 'customer-ready') return fail('state', 'ต้องรอลูกค้ากดพร้อมก่อน')
    j.access = 'logging-in'
    jobEvent(j, now, 'shop', 'ร้านเริ่มเข้าสู่ระบบ')
    return { ok: true }
  }

const VERIFY_STATES = ['logging-in', 'awaiting-code', 'awaiting-roblox-approval', 'checking-result'] as const

/** Admin chooses the method. Each request gets a new id and its own 5-minute window; older ids stop working. */
export const ownerRequestVerification =
  (jobId: string, method: VerificationMethod): Cmd =>
  (d, now) => {
    const deny = ownerOnly(d)
    if (deny) return deny
    const j = jobOf(d, jobId)
    if (!j || !(VERIFY_STATES as readonly string[]).includes(j.access)) return fail('state', 'ต้องเริ่มเข้าสู่ระบบก่อน')
    const replaced = j.verification
    j.verification = { requestId: uid('VR'), startedAt: now, deadline: now + STANDBY.verificationWindowMs, method }
    j.access = method === 'code' ? 'awaiting-code' : 'awaiting-roblox-approval'
    j.status = 'awaiting-customer'
    jobEvent(j, now, 'shop', `${replaced ? 'ส่งคำขอใหม่ (คำขอเดิมใช้ไม่ได้แล้ว): ' : ''}${method === 'code' ? 'ขอรหัสยืนยัน' : 'ขออนุมัติใน Roblox'} · มีเวลา 5 นาที`)
    notify(d, { userId: j.userId, at: now, kind: 'farm', title: method === 'code' ? 'ร้านขอรหัสยืนยัน' : 'ร้านขอให้อนุมัติใน Roblox', body: 'ดำเนินการภายใน 5 นาที', href: `/account/farm/${j.id}` })
    return { ok: true }
  }

/** The code is format-checked and discarded. It is never stored. It does not mean login succeeded. */
export const customerSubmitCode =
  (jobId: string, requestId: string, code: string): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    const j = jobOf(d, jobId)
    if (!u || !j || j.userId !== u.id) return fail('not-found', 'ไม่พบงาน')
    const v = j.verification
    if (j.access !== 'awaiting-code' || !v || v.requestId !== requestId) return fail('stale', 'คำขอนี้ไม่ใช้งานแล้ว กรุณาดูคำขอล่าสุด')
    if (now >= v.deadline) return fail('timeout', 'หมดเวลาของคำขอนี้แล้ว')
    if (!VERIFICATION_CODE.pattern.test(code.trim())) return fail('format', 'รูปแบบรหัสไม่ถูกต้อง')
    j.access = 'checking-result'
    j.status = 'queued'
    jobEvent(j, now, 'customer', 'ลูกค้าส่งรหัสยืนยันแล้ว (ไม่บันทึกรหัส) · รอร้านตรวจผล')
    return { ok: true }
  }

export const customerConfirmApproval =
  (jobId: string, requestId: string): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    const j = jobOf(d, jobId)
    if (!u || !j || j.userId !== u.id) return fail('not-found', 'ไม่พบงาน')
    const v = j.verification
    if (j.access !== 'awaiting-roblox-approval' || !v || v.requestId !== requestId) return fail('stale', 'คำขอนี้ไม่ใช้งานแล้ว')
    if (now >= v.deadline) return fail('timeout', 'หมดเวลาของคำขอนี้แล้ว')
    j.access = 'checking-result'
    j.status = 'queued'
    jobEvent(j, now, 'customer', 'ลูกค้ากด “ยืนยันแล้ว” ใน Roblox · รอร้านตรวจผล')
    return { ok: true }
  }

/** Only the admin records the real login outcome. */
export const ownerMarkAccess =
  (jobId: string): Cmd =>
  (d, now) => {
    const deny = ownerOnly(d)
    if (deny) return deny
    const j = jobOf(d, jobId)
    if (!j || !(VERIFY_STATES as readonly string[]).includes(j.access)) return fail('state', 'ยังไม่อยู่ในขั้นเข้าสู่ระบบ')
    j.access = 'access-granted'
    j.status = 'queued'
    j.verification = undefined
    jobEvent(j, now, 'shop', 'ร้านยืนยัน: เข้าใช้งานสำเร็จ')
    return { ok: true }
  }

export const ownerReschedule =
  (jobId: string): Cmd =>
  (d, now) => {
    const deny = ownerOnly(d)
    if (deny) return deny
    const j = jobOf(d, jobId)
    if (!j || j.status === 'completed' || j.status === 'cancelled' || j.status === 'in-progress') return fail('state', 'นัดใหม่ไม่ได้ในสถานะนี้')
    if (!j.credentials) return fail('state', 'ลูกค้ายังไม่ส่งข้อมูลบัญชี')
    toReschedule(d, j, now, 'shop', 'ร้านเปลี่ยนเป็นรอนัดใหม่')
    return { ok: true }
  }

const toReschedule = (d: DemoState, j: FarmJob, now: number, actor: 'shop' | 'system', text: string) => {
  j.access = 'reschedule'
  j.status = 'queued'
  j.standby = undefined
  j.verification = undefined
  jobEvent(j, now, actor, `${text} · ไม่มีการเรียกเก็บเงินเพิ่มหรือริบค่าฟาร์ม`)
  notify(d, { userId: j.userId, at: now, kind: 'farm', title: 'รอนัดใหม่', body: text, href: `/account/farm/${j.id}` })
}

export const ownerStartFarm =
  (jobId: string): Cmd =>
  (d, now) => {
    const deny = ownerOnly(d)
    if (deny) return deny
    const j = jobOf(d, jobId)
    if (!j || j.access !== 'access-granted' || j.status !== 'queued') return fail('state', 'ต้องยืนยันเข้าใช้งานสำเร็จก่อนเริ่มฟาร์ม')
    j.status = 'in-progress'
    j.measuredDiamonds = 0
    jobEvent(j, now, 'shop', 'เริ่มฟาร์ม')
    notify(d, { userId: j.userId, at: now, kind: 'farm', title: 'เริ่มฟาร์มแล้ว', body: j.serviceName, href: `/account/farm/${j.id}` })
    return { ok: true }
  }

/** Progress comes only from a measured value the shop reports. Time never advances it. */
export const ownerReportProgress =
  (jobId: string, measured: number): Cmd =>
  (d, now) => {
    const deny = ownerOnly(d)
    if (deny) return deny
    const j = jobOf(d, jobId)
    if (!j || j.status !== 'in-progress') return fail('state', 'อัปเดตได้เฉพาะงานที่กำลังดำเนินการ')
    if (!Number.isInteger(measured) || measured < 0 || measured > j.diamonds) return fail('value', `ต้องอยู่ระหว่าง 0 ถึง ${j.diamonds.toLocaleString('th-TH')}`)
    j.measuredDiamonds = measured
    jobEvent(j, now, 'shop', `อัปเดตงาน: วัดได้ ${measured.toLocaleString('th-TH')} / ${j.diamonds.toLocaleString('th-TH')} เพชร`)
    notify(d, { userId: j.userId, at: now, kind: 'farm', title: 'อัปเดตงานฟาร์ม', body: `${measured.toLocaleString('th-TH')} เพชร`, href: `/account/farm/${j.id}` })
    return { ok: true }
  }

export const ownerSetAwaitingCustomer =
  (jobId: string, waiting: boolean): Cmd =>
  (d, now) => {
    const deny = ownerOnly(d)
    if (deny) return deny
    const j = jobOf(d, jobId)
    if (!j) return fail('not-found', 'ไม่พบงาน')
    if (waiting ? j.status !== 'in-progress' : j.status !== 'awaiting-customer' || j.access !== 'access-granted') return fail('state', 'เปลี่ยนสถานะนี้ไม่ได้')
    j.status = waiting ? 'awaiting-customer' : 'in-progress'
    jobEvent(j, now, 'shop', waiting ? 'รอลูกค้าตอบกลับ (ติดต่อผ่านช่องทางของร้าน)' : 'กลับมาดำเนินการต่อ')
    return { ok: true }
  }

export const ownerComplete =
  (jobId: string): Cmd =>
  (d, now) => {
    const deny = ownerOnly(d)
    if (deny) return deny
    const j = jobOf(d, jobId)
    if (!j || j.status !== 'in-progress') return fail('state', 'ปิดงานได้เฉพาะงานที่กำลังดำเนินการ')
    j.status = 'completed'
    jobEvent(j, now, 'shop', 'งานเสร็จสิ้น')
    notify(d, { userId: j.userId, at: now, kind: 'farm', title: 'งานฟาร์มเสร็จสิ้น', body: j.serviceName, href: `/account/farm/${j.id}` })
    return { ok: true }
  }

// ---------- reviews, notifications, session ----------

export const submitReview =
  (orderId: string, rating: number, text: string): Cmd =>
  (d, now) => {
    const u = requireUser(d)
    const o = d.orders.find((x) => x.id === orderId)
    if (!u || !o || o.userId !== u.id) return fail('not-eligible', 'รีวิวได้เฉพาะผู้ซื้อที่มีคำสั่งซื้อสำเร็จ')
    if (d.reviews.some((r) => r.orderId === orderId)) return fail('duplicate', 'คุณรีวิวคำสั่งซื้อนี้แล้ว')
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail('rating', 'เลือกคะแนน 1–5')
    const t = text.trim()
    if (t.length < 5 || t.length > 500) return fail('text', 'ข้อความรีวิว 5–500 ตัวอักษร')
    d.reviews.unshift({ id: uid('RV'), userId: u.id, orderId, displayName: u.displayName, rating, text: t, at: now, sample: false })
    return { ok: true }
  }

export const markNotificationsRead =
  (ids?: string[]): Cmd =>
  (d) => {
    for (const n of d.notifications) if (n.userId === d.currentUserId && (!ids || ids.includes(n.id))) n.read = true
    return { ok: true }
  }

// ---------- sweep: time-driven transitions (server job in production) ----------

/**
 * Applies every deadline that has passed. Safe to run any number of times:
 * each transition is guarded by the current status, so it happens once.
 */
export const sweepInto = (d: DemoState, now: number): boolean => {
  let changed = false
  for (const r of d.reservations) {
    if (r.status !== 'active') continue
    if (now >= r.expiresAt) {
      r.status = 'forfeited'
      r.forfeitedAt = r.expiresAt
      r.cooldownUntil = r.expiresAt + RESERVATION.cooldownMs
      const l = d.listings.find((x) => x.id === r.listingId)
      if (l && l.status === 'reserved') l.status = 'available'
      post(d, { userId: r.userId, at: r.expiresAt, amountSatang: 0, kind: 'reservation-forfeit', refId: r.id, note: `ริบเงินจอง ${formatTHB(r.depositSatang)} (${r.listingTitle}) · หมดเวลา 14 ชั่วโมง` })
      notify(d, { userId: r.userId, at: now, kind: 'reservation', title: 'หมดเวลาจอง', body: `เงินจอง ${formatTHB(r.depositSatang)} ถูกริบตามเงื่อนไข จองรายการนี้ซ้ำได้อีกครั้งหลัง 6 ชั่วโมง`, href: `/account/reservations/${r.id}` })
      changed = true
    } else if (now >= r.holdEndsAt && !r.notified.grace) {
      r.notified.grace = true
      notify(d, { userId: r.userId, at: now, kind: 'reservation', title: 'เข้าสู่ช่วงผ่อนผัน 2 ชั่วโมง', body: `ชำระ ${formatTHB(r.lockedPriceSatang - r.depositSatang)} ก่อนหมดสิทธิ์`, href: `/account/reservations/${r.id}` })
      changed = true
    } else if (now >= r.holdEndsAt - RESERVATION.nearEndNoticeMs && now < r.holdEndsAt && !r.notified.nearHoldEnd) {
      r.notified.nearHoldEnd = true
      notify(d, { userId: r.userId, at: now, kind: 'reservation', title: 'ใกล้ครบ 12 ชั่วโมง', body: `${r.listingTitle} · ชำระยอดคงเหลือเพื่อรับสินค้า`, href: `/account/reservations/${r.id}` })
      changed = true
    }
  }
  for (const j of d.farmJobs) {
    if (j.access === 'standby-called' && j.standby && now >= j.standby.deadline) {
      toReschedule(d, j, j.standby.deadline, 'system', 'ลูกค้าไม่ได้กด “พร้อมแล้ว” ภายใน 5 นาที')
      changed = true
    } else if ((j.access === 'awaiting-code' || j.access === 'awaiting-roblox-approval') && j.verification && now >= j.verification.deadline) {
      toReschedule(d, j, j.verification.deadline, 'system', 'หมดเวลายืนยันการเข้าสู่ระบบ 5 นาที')
      changed = true
    }
  }
  for (const t of d.topups) {
    if (t.status === 'checking' && t.resolveAt !== null && now >= t.resolveAt) {
      resolveTopUp(t.id)(d, now)
      changed = true
    }
  }
  return changed
}

export const sweep = (s: DemoState, now: number): DemoState => {
  const d = structuredClone(s)
  return sweepInto(d, now) ? d : s
}

/** Derived reservation phase for display. The stored status is authoritative. */
export const reservationPhase = (r: Reservation, now: number) =>
  r.status !== 'active' ? r.status : now < r.holdEndsAt ? 'hold' : now < r.expiresAt ? 'grace' : 'expiring'
