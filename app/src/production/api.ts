export type User = { id: string; email: string; isAdmin: boolean }
export type Listing = {
  id: string
  mapId: string
  title: string
  priceSatang: number
  description: string
  images: string[]
  attributes: { label: string; value: string }[]
  transferTerms: string
  warranty: string
  status: string
}
export type ShopSettings = { open: boolean; contactUrl: string; terms: string; farmTerms: string }
export type Quote = { diamonds: number; priceSatang: number; estimateSeconds: number }
export type Catalog = {
  serverTime: number
  maps: { id: string; name: string }[]
  listings: Listing[]
  settings: ShopSettings
  reservationTerms: string
  packages: Quote[]
}
export type Order = { id: string; listingId: string; title: string; priceSatang: number; createdAt: number }
export type Reservation = {
  id: string
  title: string
  priceSatang: number
  depositSatang: number
  expiresAt: number
  holdEndsAt: number
  cooldownUntil: number
  status: string
  orderId: string | null
}
export type FarmJob = {
  id: string
  email?: string
  diamonds: number
  priceSatang: number
  estimateSeconds: number
  status: string
  measuredDiamonds: number | null
  timeline: { at: number; text: string }[]
  createdAt: number
}
export type Account = {
  orders: Order[]
  reservations: Reservation[]
  farmJobs: FarmJob[]
  transactions: { id: string; amountSatang: number; kind: string; reference: string; createdAt: number }[]
}
export type WalletData = {
  balanceSatang: number
  topups: { id: string; status: string; amountSatang: number; createdAt: number }[]
}
export type AdminData = {
  settings: ShopSettings
  listings: Listing[]
  farmJobs: FarmJob[]
  pendingPayments: { id: string; email: string; createdAt: number }[]
}

const MESSAGES: Record<string, string> = {
  'authentication-required': 'กรุณาเข้าสู่ระบบก่อนทำรายการ',
  forbidden: 'บัญชีนี้ไม่มีสิทธิ์เข้าถึงหลังบ้าน',
  'insufficient-balance': 'ยอดเงินไม่พอ กรุณาเติมเงินแล้วทำรายการอีกครั้ง',
  'listing-unavailable': 'สินค้านี้ไม่พร้อมขายแล้ว',
  'price-changed': 'ราคาเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่',
  'shop-closed': 'ร้านยังไม่เปิดรับคำสั่งซื้อ',
  'invalid-credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสผ่าน 12–128 ตัวอักษร)',
  'registration-unavailable': 'สมัครด้วยอีเมลนี้ไม่ได้ ลองเข้าสู่ระบบ',
  'reservation-terms-required': 'กรุณายอมรับเงื่อนไขการจอง',
  'reservation-cooldown': 'ยังอยู่ในช่วงรอจองสินค้าเดิม 6 ชั่วโมง',
  'reservation-unavailable': 'รายการจองหมดอายุหรือชำระแล้ว',
  'invalid-quantity': 'จำนวนเพชรต้องอยู่ระหว่าง 10,000–250,000 และเพิ่มทีละ 10,000',
  'farm-terms-required': 'กรุณายอมรับเงื่อนไขบริการ',
  'invalid-voucher': 'ลิงก์หรือรหัสซองไม่ถูกต้อง',
  'voucher-already-submitted': 'ซองนี้ถูกส่งแล้ว กรุณาตรวจประวัติหรือติดต่อร้าน',
  'not-configured': 'ช่องทางนี้ยังไม่เปิดใช้งาน',
  'rate-limited': 'ทำรายการถี่เกินไป กรุณารอสักครู่',
  'not-found': 'ไม่พบรายการนี้',
  'invalid-listing': 'ตรวจรูปภาพ ราคา และรายละเอียดสินค้าให้ครบ',
  'invalid-settings': 'กรุณาตรวจข้อมูลร้าน',
  'shop-details-required': 'ใส่ช่องทางติดต่อและเงื่อนไขร้านก่อนเปิดรับคำสั่งซื้อ',
  'completion-measurement-required': 'ต้องระบุจำนวนเพชรที่วัดได้ครบก่อนปิดงาน',
  'invalid-progress': 'จำนวนเพชรที่วัดได้ไม่ถูกต้อง',
  'job-unavailable': 'งานนี้ปิดแล้วหรือไม่พบรายการ',
  'invalid-job-update': 'กรุณากรอกสถานะและข้อความอัปเดต',
  'invalid-payment-review': 'ระบุยอด หลักฐานรับเงิน และยืนยันการตรวจสอบให้ครบ',
  'receipt-already-used': 'หลักฐานนี้ถูกใช้แล้ว',
  'topup-unavailable': 'รายการนี้ไม่อยู่ระหว่างรอตรวจสอบ',
  'idempotency-conflict': 'รายการนี้เปลี่ยนแปลง กรุณาโหลดหน้าใหม่',
  'oauth-account-exists': 'มีบัญชีอีเมลนี้แล้ว ให้เข้าบัญชีเดิมและกดเชื่อมบัญชี Google/Discord',
  'oauth-invalid-state': 'คำขอเข้าสู่ระบบหมดอายุ กรุณาลองใหม่',
  'oauth-denied': 'ยกเลิกการเข้าสู่ระบบแล้ว',
  'oauth-email-unverified': 'กรุณายืนยันอีเมลกับผู้ให้บริการก่อน',
  'oauth-already-linked': 'ช่องทางนี้เชื่อมกับบัญชีอื่นแล้ว',
  'oauth-link-expired': 'กรุณาเข้าสู่ระบบใหม่ก่อนเชื่อมบัญชี',
  'oauth-failed': 'เข้าสู่ระบบกับผู้ให้บริการไม่สำเร็จ',
}
export const messageFor = (code: string) => MESSAGES[code] ?? 'ทำรายการไม่สำเร็จ กรุณาลองใหม่หรือติดต่อร้าน'
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(messageFor(code))
  }
}
export async function api<T = void>(path: string, data?: object, key?: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: data ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    })
  } catch {
    throw new Error('เชื่อมต่อร้านไม่ได้ กรุณาตรวจประวัติก่อนส่งรายการซ้ำ')
  }
  const result = await response.json().catch(() => null)
  if (!response.ok || result === null) throw new ApiError(result?.error ?? 'server-error', response.status)
  return result as T
}
