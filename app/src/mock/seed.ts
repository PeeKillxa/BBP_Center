/**
 * Demo seed. All names, balances, accounts, and reviews are fictional sample data.
 * Timestamps are relative to "now" so every state is visible right after reset.
 */
import { RESERVATION } from '../config/rules'
import { baht } from '../lib/money'
import { DAY_MS, HOUR, MINUTE } from '../lib/time'
import type { DemoState, Listing, MapCategory } from '../domain/types'

export const DEMO_STATE_VERSION = 1

const MAPS: MapCategory[] = [
  { id: 'anime-adventures', name: 'Anime Adventures', tagline: 'ไอดีสายหน่วยหายาก เลเวลสูง', hue: 210 },
  { id: 'anime-vanguards', name: 'Anime Vanguards', tagline: 'ไอดีสายโหมดท้าทาย ทีมพร้อมลุย', hue: 265 },
]

const L = (
  id: string,
  mapId: string,
  title: string,
  priceBaht: number,
  highlights: string[],
  attributes: [string, string][],
  status: Listing['status'],
  ageMs: number,
  now: number,
  server?: string,
): Listing => ({
  id,
  mapId,
  title,
  priceSatang: baht(priceBaht),
  highlights,
  attributes: attributes.map(([label, value]) => ({ label, value })),
  server,
  imageCount: 3 + (id.charCodeAt(id.length - 1) % 3),
  status,
  createdAt: now - ageMs,
})

const listings = (now: number): Listing[] => [
  L('aa-001', 'anime-adventures', 'ไอดีตัวอย่าง AA #001 · สายตัวลับครบ', 1290, ['ตัวลับ 3 ตัว', 'เลเวล 120', 'เพชร 48k'], [['เลเวล', '120'], ['ตัวลับ', '3 ตัว'], ['เพชร', '48,000'], ['ช่องตัวละคร', '220']], 'available', 2 * DAY_MS, now, 'Asia'),
  L('aa-002', 'anime-adventures', 'ไอดีตัวอย่าง AA #002 · พร้อมฟาร์ม', 450, ['เลเวล 85', 'ตัวหลักครบทีม'], [['เลเวล', '85'], ['ตัวลับ', '1 ตัว'], ['เพชร', '12,000']], 'reserved', 3 * DAY_MS, now),
  L('aa-003', 'anime-adventures', 'ไอดีตัวอย่าง AA #003 · สายอีเวนต์', 890, ['ของอีเวนต์ 5 ชิ้น', 'เลเวล 102'], [['เลเวล', '102'], ['ของอีเวนต์', '5 ชิ้น'], ['เพชร', '30,500']], 'reserved', 4 * DAY_MS, now, 'Global'),
  L('aa-004', 'anime-adventures', 'ไอดีตัวอย่าง AA #004 · เริ่มต้นคุ้ม', 190, ['เลเวล 40', 'เหมาะกับผู้เริ่มต้น'], [['เลเวล', '40'], ['เพชร', '3,200']], 'available', 5 * DAY_MS, now),
  L('aa-005', 'anime-adventures', 'ไอดีตัวอย่าง AA #005 · สกินหายาก', 2490, ['สกินหายาก 4 ชิ้น', 'เลเวล 150', 'ตัวลับ 5 ตัว'], [['เลเวล', '150'], ['ตัวลับ', '5 ตัว'], ['สกิน', '4 ชิ้น']], 'sold', 9 * DAY_MS, now, 'Asia'),
  L('aa-006', 'anime-adventures', 'ไอดีตัวอย่าง AA #006 · สายประหยัด', 320, ['เลเวล 60', 'เพชร 9k'], [['เลเวล', '60'], ['เพชร', '9,000']], 'available', 1 * DAY_MS, now),
  L('av-001', 'anime-vanguards', 'ไอดีตัวอย่าง AV #001 · ทีมโหมดยาก', 1590, ['ตัวระดับสูง 4 ตัว', 'แรงก์ 70'], [['แรงก์', '70'], ['ตัวระดับสูง', '4 ตัว'], ['เจม', '22,000']], 'available', 2 * DAY_MS, now),
  L('av-002', 'anime-vanguards', 'ไอดีตัวอย่าง AV #002 · สายสะสม', 760, ['ตัวลับ 2 ตัว', 'แรงก์ 52'], [['แรงก์', '52'], ['ตัวลับ', '2 ตัว']], 'reserved', 3 * DAY_MS, now),
  L('av-003', 'anime-vanguards', 'ไอดีตัวอย่าง AV #003 · เริ่มเล่นไว', 240, ['แรงก์ 30', 'ของเริ่มต้นครบ'], [['แรงก์', '30'], ['เจม', '4,500']], 'available', 6 * DAY_MS, now),
  L('av-004', 'anime-vanguards', 'ไอดีตัวอย่าง AV #004 · แรงก์สูง', 1990, ['แรงก์ 88', 'ตัวลับ 4 ตัว'], [['แรงก์', '88'], ['ตัวลับ', '4 ตัว']], 'sold', 12 * DAY_MS, now, 'Global'),
]

export const createSeed = (now: number): DemoState => {
  const H = HOUR
  const res = (id: string, userId: string, listingId: string, title: string, priceBaht: number, createdAgo: number) => {
    const createdAt = now - createdAgo
    return {
      id,
      userId,
      listingId,
      listingTitle: title,
      lockedPriceSatang: baht(priceBaht),
      depositSatang: baht(priceBaht) / 2,
      createdAt,
      holdEndsAt: createdAt + RESERVATION.holdMs,
      expiresAt: createdAt + RESERVATION.holdMs + RESERVATION.graceMs,
      status: 'active' as const,
      notified: {},
    }
  }
  const r3 = res('RS-SEED3', 'u-a', 'aa-006', 'ไอดีตัวอย่าง AA #006 · สายประหยัด', 320, 16 * H)
  const r4 = res('RS-SEED4', 'u-a', 'aa-005', 'ไอดีตัวอย่าง AA #005 · สกินหายาก', 2490, 3 * DAY_MS)
  const ev = (at: number, actor: 'customer' | 'shop' | 'system', text: string, i: number) => ({ id: `EV-SEED-${i}-${at}`, at, actor, text })

  return {
    version: DEMO_STATE_VERSION,
    clockOffsetMs: 0,
    currentUserId: null,
    viewMode: 'customer',
    users: [
      { id: 'u-a', displayName: 'ผู้ใช้ตัวอย่าง A', email: 'demo.a@example.invalid', joinedAt: now - 40 * DAY_MS, demoNote: 'มีประวัติครบทุกสถานะ' },
      { id: 'u-b', displayName: 'ผู้ใช้ตัวอย่าง B', email: 'demo.b@example.invalid', joinedAt: now - 10 * DAY_MS, demoNote: 'ยอดเงินน้อย ใช้ทดสอบยอดไม่พอ' },
      { id: 'u-c', displayName: 'ผู้ใช้ตัวอย่าง C', email: 'demo.c@example.invalid', joinedAt: now - 1 * DAY_MS, demoNote: 'สมาชิกใหม่ ไม่มีประวัติ (หน้าว่าง)' },
    ],
    maps: MAPS,
    listings: listings(now),
    reservations: [
      res('RS-SEED1', 'u-a', 'aa-002', 'ไอดีตัวอย่าง AA #002 · พร้อมฟาร์ม', 450, 2 * H),
      res('RS-SEED2', 'u-a', 'aa-003', 'ไอดีตัวอย่าง AA #003 · สายอีเวนต์', 890, 13 * H),
      { ...r3, status: 'forfeited', forfeitedAt: r3.expiresAt, cooldownUntil: r3.expiresAt + RESERVATION.cooldownMs },
      { ...r4, status: 'settled', settledAt: r4.createdAt + 5 * H, orderId: 'OD-SEED2' },
      res('RS-SEED5', 'u-b', 'av-002', 'ไอดีตัวอย่าง AV #002 · สายสะสม', 760, 1 * H),
    ],
    orders: [
      { id: 'OD-SEED1', userId: 'u-a', listingId: 'av-004', listingTitle: 'ไอดีตัวอย่าง AV #004 · แรงก์สูง', priceSatang: baht(1990), discountSatang: 0, paidSatang: baht(1990), source: 'direct', createdAt: now - 6 * DAY_MS },
      { id: 'OD-SEED2', userId: 'u-a', listingId: 'aa-005', listingTitle: r4.listingTitle, priceSatang: baht(2490), discountSatang: 0, paidSatang: baht(2490), source: 'reservation', reservationId: r4.id, createdAt: r4.createdAt + 5 * H },
    ],
    ledger: [
      { id: 'TX-S01', userId: 'u-a', at: now - 40 * DAY_MS, amountSatang: baht(8000), kind: 'demo-adjust', note: 'ยอดตั้งต้นสาธิต' },
      { id: 'TX-S02', userId: 'u-b', at: now - 10 * DAY_MS, amountSatang: baht(120), kind: 'demo-adjust', note: 'ยอดตั้งต้นสาธิต' },
      { id: 'TX-S03', userId: 'u-a', at: now - 7 * DAY_MS, amountSatang: baht(1000), kind: 'topup', refId: 'TU-SEED1', note: 'เติมเงินผ่านสลิป (จำลอง)' },
      { id: 'TX-S04', userId: 'u-a', at: now - 6 * DAY_MS, amountSatang: -baht(1990), kind: 'purchase', refId: 'OD-SEED1', note: 'ซื้อ ไอดีตัวอย่าง AV #004' },
      { id: 'TX-S05', userId: 'u-a', at: r4.createdAt, amountSatang: -baht(1245), kind: 'reservation-deposit', refId: r4.id, note: 'เงินจอง 50% ไอดีตัวอย่าง AA #005' },
      { id: 'TX-S06', userId: 'u-a', at: r4.createdAt + 5 * H, amountSatang: -baht(1245), kind: 'reservation-remainder', refId: r4.id, note: 'ชำระยอดคงเหลือ ไอดีตัวอย่าง AA #005' },
      { id: 'TX-S07', userId: 'u-a', at: r3.createdAt, amountSatang: -baht(160), kind: 'reservation-deposit', refId: r3.id, note: 'เงินจอง 50% ไอดีตัวอย่าง AA #006' },
      { id: 'TX-S08', userId: 'u-a', at: r3.expiresAt, amountSatang: 0, kind: 'reservation-forfeit', refId: r3.id, note: 'ริบเงินจอง ฿160.00 (ไอดีตัวอย่าง AA #006) · หมดเวลา 14 ชั่วโมง' },
      { id: 'TX-S09', userId: 'u-a', at: now - 13 * H, amountSatang: -baht(445), kind: 'reservation-deposit', refId: 'RS-SEED2', note: 'เงินจอง 50% ไอดีตัวอย่าง AA #003' },
      { id: 'TX-S10', userId: 'u-a', at: now - 2 * H, amountSatang: -baht(225), kind: 'reservation-deposit', refId: 'RS-SEED1', note: 'เงินจอง 50% ไอดีตัวอย่าง AA #002' },
      { id: 'TX-S11', userId: 'u-b', at: now - 1 * H, amountSatang: -baht(380), kind: 'reservation-deposit', refId: 'RS-SEED5', note: 'เงินจอง 50% ไอดีตัวอย่าง AV #002' },
      { id: 'TX-S12', userId: 'u-b', at: now - 1 * H - MINUTE, amountSatang: baht(300), kind: 'topup', refId: 'TU-SEED6', note: 'เติมเงินอั่งเปา (จำลอง)' },
      { id: 'TX-S13', userId: 'u-a', at: now - 5 * DAY_MS, amountSatang: -baht(40), kind: 'farm-order', refId: 'FJ-SEED4', note: 'ฟาร์มเพชร Anime Adventures' },
      { id: 'TX-S14', userId: 'u-a', at: now - 2 * DAY_MS, amountSatang: -baht(100), kind: 'farm-order', refId: 'FJ-SEED3', note: 'ฟาร์มเพชร Anime Adventures' },
      { id: 'TX-S15', userId: 'u-a', at: now - 1 * DAY_MS, amountSatang: -baht(60), kind: 'farm-order', refId: 'FJ-SEED2', note: 'ฟาร์มเพชร Anime Adventures' },
      { id: 'TX-S16', userId: 'u-a', at: now - 20 * MINUTE, amountSatang: -baht(20), kind: 'farm-order', refId: 'FJ-SEED1', note: 'ฟาร์มเพชร Anime Adventures' },
      { id: 'TX-S17', userId: 'u-b', at: now - 3 * DAY_MS, amountSatang: -baht(20), kind: 'farm-order', refId: 'FJ-SEED5', note: 'ฟาร์มเพชร Anime Adventures' },
      { id: 'TX-S18', userId: 'u-a', at: now - 3 * H, amountSatang: -baht(40), kind: 'farm-order', refId: 'FJ-SEED6', note: 'ฟาร์มเพชร Anime Adventures' },
    ],
    topups: [
      { id: 'TU-SEED1', userId: 'u-a', method: 'bank-slip', amountSatang: baht(1000), status: 'success', createdAt: now - 7 * DAY_MS, resolvedAt: now - 7 * DAY_MS + MINUTE, sourceFingerprint: 'seed-slip-1', credited: true, plannedOutcome: 'success', resolveAt: null },
      { id: 'TU-SEED2', userId: 'u-a', method: 'bank-slip', amountSatang: baht(500), status: 'amount-mismatch', createdAt: now - 4 * DAY_MS, resolvedAt: now - 4 * DAY_MS + MINUTE, sourceFingerprint: 'seed-slip-2', credited: false, plannedOutcome: 'amount-mismatch', resolveAt: null },
      { id: 'TU-SEED3', userId: 'u-a', method: 'truemoney', amountSatang: baht(200), status: 'expired', createdAt: now - 3 * DAY_MS, resolvedAt: now - 3 * DAY_MS + MINUTE, sourceFingerprint: 'seed-tm-1', credited: false, plannedOutcome: 'expired', resolveAt: null },
      { id: 'TU-SEED4', userId: 'u-a', method: 'bank-slip', amountSatang: baht(300), status: 'checking', createdAt: now - 10 * MINUTE, sourceFingerprint: 'seed-slip-3', credited: false, plannedOutcome: 'success', resolveAt: null },
      { id: 'TU-SEED5', userId: 'u-a', method: 'bank-slip', amountSatang: baht(1000), status: 'duplicate-slip', createdAt: now - 6 * DAY_MS, resolvedAt: now - 6 * DAY_MS + MINUTE, sourceFingerprint: 'seed-slip-1', credited: false, plannedOutcome: 'success', resolveAt: null },
      { id: 'TU-SEED6', userId: 'u-b', method: 'truemoney', amountSatang: baht(300), status: 'success', createdAt: now - 1 * H - 2 * MINUTE, resolvedAt: now - 1 * H - MINUTE, sourceFingerprint: 'seed-tm-2', credited: true, plannedOutcome: 'success', resolveAt: null },
    ],
    farmJobs: [
      {
        id: 'FJ-SEED1', userId: 'u-a', serviceId: 'aa-diamond', serviceName: 'ฟาร์มเพชร Anime Adventures',
        diamonds: 10_000, priceSatang: baht(20), discountSatang: 0, paidSatang: baht(20), estimateSeconds: 556 * 120,
        createdAt: now - 20 * MINUTE, status: 'awaiting-details', access: 'waiting-call',
        timeline: [ev(now - 20 * MINUTE, 'customer', 'สั่งบริการ 10,000 เพชร ชำระ ฿20.00', 1)],
      },
      {
        id: 'FJ-SEED6', userId: 'u-a', serviceId: 'aa-diamond', serviceName: 'ฟาร์มเพชร Anime Adventures',
        diamonds: 20_000, priceSatang: baht(40), discountSatang: 0, paidSatang: baht(40), estimateSeconds: 1112 * 120,
        createdAt: now - 3 * H, status: 'queued', access: 'waiting-call',
        credentials: { usernameMasked: 'dem*****01', submittedAt: now - 3 * H + 5 * MINUTE },
        timeline: [
          ev(now - 3 * H, 'customer', 'สั่งบริการ 20,000 เพชร ชำระ ฿40.00', 1),
          ev(now - 3 * H + 5 * MINUTE, 'customer', 'ส่งข้อมูลบัญชีสมมติแล้ว (ระบบไม่บันทึกรหัสผ่าน)', 2),
        ],
      },
      {
        id: 'FJ-SEED2', userId: 'u-a', serviceId: 'aa-diamond', serviceName: 'ฟาร์มเพชร Anime Adventures',
        diamonds: 30_000, priceSatang: baht(60), discountSatang: 0, paidSatang: baht(60), estimateSeconds: 1667 * 120,
        createdAt: now - 1 * DAY_MS, status: 'in-progress', access: 'access-granted', measuredDiamonds: 12_600,
        credentials: { usernameMasked: 'dem*****02', submittedAt: now - 1 * DAY_MS + 10 * MINUTE },
        timeline: [
          ev(now - 1 * DAY_MS, 'customer', 'สั่งบริการ 30,000 เพชร ชำระ ฿60.00', 1),
          ev(now - 23 * H, 'shop', 'ร้านยืนยัน: เข้าใช้งานสำเร็จ', 2),
          ev(now - 23 * H + MINUTE, 'shop', 'เริ่มฟาร์ม', 3),
          ev(now - 2 * H, 'shop', 'อัปเดตงาน: วัดได้ 12,600 / 30,000 เพชร', 4),
        ],
      },
      {
        id: 'FJ-SEED3', userId: 'u-a', serviceId: 'aa-diamond', serviceName: 'ฟาร์มเพชร Anime Adventures',
        diamonds: 50_000, priceSatang: baht(100), discountSatang: 0, paidSatang: baht(100), estimateSeconds: 2778 * 120,
        createdAt: now - 2 * DAY_MS, status: 'queued', access: 'reschedule',
        credentials: { usernameMasked: 'dem*****03', submittedAt: now - 2 * DAY_MS + 5 * MINUTE },
        timeline: [
          ev(now - 2 * DAY_MS, 'customer', 'สั่งบริการ 50,000 เพชร ชำระ ฿100.00', 1),
          ev(now - 2 * DAY_MS + H, 'shop', 'ร้านเรียกสแตนด์บาย รอลูกค้ากด “พร้อมแล้ว” ภายใน 5 นาที', 2),
          ev(now - 2 * DAY_MS + H + 5 * MINUTE, 'system', 'ลูกค้าไม่ได้กด “พร้อมแล้ว” ภายใน 5 นาที · ไม่มีการเรียกเก็บเงินเพิ่มหรือริบค่าฟาร์ม', 3),
        ],
      },
      {
        id: 'FJ-SEED4', userId: 'u-a', serviceId: 'aa-diamond', serviceName: 'ฟาร์มเพชร Anime Adventures',
        diamonds: 20_000, priceSatang: baht(40), discountSatang: 0, paidSatang: baht(40), estimateSeconds: 1112 * 120,
        createdAt: now - 5 * DAY_MS, status: 'completed', access: 'access-granted', measuredDiamonds: 20_000,
        credentials: { usernameMasked: 'dem*****04', submittedAt: now - 5 * DAY_MS + 5 * MINUTE },
        timeline: [
          ev(now - 5 * DAY_MS, 'customer', 'สั่งบริการ 20,000 เพชร ชำระ ฿40.00', 1),
          ev(now - 5 * DAY_MS + H, 'shop', 'เริ่มฟาร์ม', 2),
          ev(now - 3 * DAY_MS, 'shop', 'งานเสร็จสิ้น', 3),
        ],
      },
      {
        id: 'FJ-SEED5', userId: 'u-b', serviceId: 'aa-diamond', serviceName: 'ฟาร์มเพชร Anime Adventures',
        diamonds: 10_000, priceSatang: baht(20), discountSatang: 0, paidSatang: baht(20), estimateSeconds: 556 * 120,
        createdAt: now - 3 * DAY_MS, status: 'cancelled', access: 'waiting-call',
        timeline: [
          ev(now - 3 * DAY_MS, 'customer', 'สั่งบริการ 10,000 เพชร ชำระ ฿20.00', 1),
          ev(now - 3 * DAY_MS + H, 'shop', 'ยกเลิกงาน (ตัวอย่างสถานะ · นโยบายคืนเงินรอร้านกำหนด)', 2),
        ],
      },
    ],
    coupons: [
      { code: 'DEMO10', label: 'ลด 10% สำหรับไอดี (สูงสุด ฿100)', scope: 'listing', kind: 'percent', value: 10, maxDiscountSatang: baht(100), minSpendSatang: baht(300), expiresAt: now + 30 * DAY_MS },
      { code: 'FARM5', label: 'ลด ฿5 สำหรับบริการฟาร์ม', scope: 'farm', kind: 'fixed', value: baht(5), minSpendSatang: baht(20), expiresAt: now + 30 * DAY_MS },
      { code: 'OLD50', label: 'คูปองเก่า ลด ฿50', scope: 'listing', kind: 'fixed', value: baht(50), expiresAt: now - 1 * DAY_MS },
    ],
    notifications: [
      { id: 'NT-S1', userId: 'u-a', at: now - 10 * MINUTE, kind: 'topup', title: 'กำลังตรวจสลิป', body: 'รายการ ฿300.00 อยู่ระหว่างตรวจสอบ (จำลอง)', href: '/wallet', read: false },
      { id: 'NT-S2', userId: 'u-a', at: now - 1 * H, kind: 'reservation', title: 'เข้าสู่ช่วงผ่อนผัน 2 ชั่วโมง', body: 'ไอดีตัวอย่าง AA #003 · ชำระยอดคงเหลือก่อนหมดสิทธิ์', href: '/account/reservations/RS-SEED2', read: false },
      { id: 'NT-S3', userId: 'u-a', at: now - 2 * H, kind: 'farm', title: 'อัปเดตงานฟาร์ม', body: '12,600 เพชร', href: '/account/farm/FJ-SEED2', read: true },
      { id: 'NT-S4', userId: 'u-a', at: now - 6 * DAY_MS, kind: 'purchase', title: 'ซื้อสำเร็จ', body: 'คำสั่งซื้อ OD-SEED1 พร้อมดูข้อมูลส่งมอบ', href: '/account/orders/OD-SEED1', read: true },
    ],
    reviews: [
      { id: 'RV-S1', userId: 'u-x', orderId: 'sample', displayName: 'ลูกค้าตัวอย่าง', rating: 5, text: 'ตัวอย่างข้อความรีวิว: ส่งข้อมูลครบ ขั้นตอนเข้าใจง่าย', at: now - 8 * DAY_MS, sample: true },
      { id: 'RV-S2', userId: 'u-y', orderId: 'sample', displayName: 'ลูกค้าตัวอย่าง', rating: 4, text: 'ตัวอย่างข้อความรีวิว: ติดตามงานฟาร์มได้ตลอด', at: now - 12 * DAY_MS, sample: true },
      { id: 'RV-S3', userId: 'u-z', orderId: 'sample', displayName: 'ลูกค้าตัวอย่าง', rating: 5, text: 'ตัวอย่างข้อความรีวิว: หน้าเว็บใช้ง่ายบนมือถือ', at: now - 15 * DAY_MS, sample: true },
    ],
    processed: {},
    demo: { nextTopUpOutcome: 'success', simulateLoadError: false, latencyMs: 700 },
  }
}
