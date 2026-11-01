import { Bookmark, CalendarClock, CircleX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Row, Shortfall } from '../../components/Checkout'
import { SuccessBurst, useToast } from '../../components/feedback'
import { Countdown, ReservationBadge } from '../../components/shop'
import { Button, ButtonLink, Card, EmptyState, Notice } from '../../components/ui'
import { reservationPhase, settleReservation } from '../../domain/engine'
import type { Reservation } from '../../domain/types'
import { formatTHB } from '../../lib/money'
import { formatDateTime, HOUR } from '../../lib/time'
import { uid } from '../../lib/util'
import { dispatch, useCurrentUser, useDemo, useNow } from '../../store/store'
import { NotFound } from '../NotFound'
import { AccountShell } from './AccountNav'

function Summary({ r, now }: { r: Reservation; now: number }) {
  const phase = reservationPhase(r, now)
  return (
    <dl>
      <Row label="ราคาสินค้า ณ เวลาจอง (ล็อกแล้ว)">{formatTHB(r.lockedPriceSatang)}</Row>
      <Row label="เงินจองที่ชำระแล้ว (50%)">{formatTHB(r.depositSatang)}</Row>
      <Row label="ยอดที่ต้องจ่ายเพิ่ม">{r.status === 'active' ? formatTHB(r.lockedPriceSatang - r.depositSatang) : r.status === 'settled' ? '฿0.00 (ชำระครบ)' : '— (หมดสิทธิ์)'}</Row>
      <Row label="เริ่มจอง">{formatDateTime(r.createdAt)}</Row>
      <Row label="ครบ 12 ชั่วโมง">{formatDateTime(r.holdEndsAt)}{phase === 'grace' && ' · ผ่านแล้ว'}</Row>
      <Row label="สิ้นสุดช่วงผ่อนผัน 2 ชั่วโมง">{formatDateTime(r.expiresAt)}</Row>
    </dl>
  )
}

export function Reservations() {
  const s = useDemo()
  const now = useNow()
  const user = useCurrentUser()
  const list = s.reservations.filter((r) => r.userId === user?.id)
  return (
    <AccountShell title="รายการจอง" subtitle="จองด้วยเงิน 50% · ล็อก 12 ชั่วโมง + ผ่อนผัน 2 ชั่วโมง">
      {list.length === 0 ? (
        <EmptyState icon={<Bookmark className="size-8" aria-hidden />} title="ยังไม่มีรายการจอง" action={<ButtonLink to="/maps">เลือกดูไอดี</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const phase = reservationPhase(r, now)
            return (
              <li key={r.id}>
                <Card lift>
                  <Link to={`/account/reservations/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <span>
                      <ReservationBadge status={r.status} phase={phase} />
                      <span className="mt-1 block font-semibold">{r.listingTitle}</span>
                      <span className="text-sm text-muted">{r.id} · เงินจอง {formatTHB(r.depositSatang)}</span>
                    </span>
                    {r.status === 'active' ? (
                      <span className="text-right text-sm">
                        <span className="block text-muted">{phase === 'hold' ? 'ครบ 12 ชั่วโมงใน' : 'หมดสิทธิ์ใน'}</span>
                        <Countdown ms={(phase === 'hold' ? r.holdEndsAt : r.expiresAt) - now} label="เวลาที่เหลือ" urgentBelowMs={HOUR} />
                      </span>
                    ) : r.status === 'forfeited' && r.cooldownUntil && r.cooldownUntil > now ? (
                      <span className="text-sm text-muted">จองซ้ำได้ {formatDateTime(r.cooldownUntil)}</span>
                    ) : null}
                  </Link>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </AccountShell>
  )
}

export function ReservationDetail() {
  const { id = '' } = useParams()
  const s = useDemo()
  const now = useNow()
  const user = useCurrentUser()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = useMemo(() => uid('SETTLE'), [])
  const r = s.reservations.find((x) => x.id === id)
  if (!user) return <AccountShell title="รายการจอง">{null}</AccountShell>
  if (!r || r.userId !== user.id) return <NotFound title="ไม่พบรายการจองนี้" />
  const phase = reservationPhase(r, now)
  const remainder = r.lockedPriceSatang - r.depositSatang
  const listing = s.listings.find((l) => l.id === r.listingId)

  const pay = () => {
    setBusy(true)
    setError(null)
    window.setTimeout(() => {
      const res = dispatch(settleReservation(r.id), key)
      setBusy(false)
      if (res.ok) toast('success', 'ชำระยอดคงเหลือแล้ว')
      else setError(res.message)
    }, s.demo.latencyMs)
  }

  return (
    <AccountShell title={`รายการจอง ${r.id}`} subtitle={<ReservationBadge status={r.status} phase={phase} />}>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-1 font-bold"><Link to={`/listing/${r.listingId}`} className="hover:underline">{r.listingTitle}</Link></h2>
          <Summary r={r} now={now} />
        </Card>
        <Card className="space-y-4 p-5">
          {r.status === 'active' && (
            <>
              <div className="text-center">
                <p className="text-sm text-muted">{phase === 'hold' ? 'เวลาที่เหลือก่อนครบ 12 ชั่วโมง' : 'ช่วงผ่อนผัน · เวลาที่เหลือก่อนหมดสิทธิ์'}</p>
                <p className="mt-1 text-4xl font-extrabold"><Countdown ms={(phase === 'hold' ? r.holdEndsAt : r.expiresAt) - now} label="เวลาที่เหลือ" urgentBelowMs={HOUR} /></p>
                {phase === 'hold' && <p className="mt-1 text-xs text-muted">หลังครบ 12 ชั่วโมง ระบบต่อช่วงผ่อนผันอัตโนมัติ 2 ชั่วโมง สินค้ายังไม่เปิดขายให้คนอื่น</p>}
              </div>
              <Notice tone="danger" icon={<CircleX className="size-4" aria-hidden />} title={`หากไม่ชำระภายใน ${formatDateTime(r.expiresAt)}`}>
                เงินจอง {formatTHB(r.depositSatang)} จะถูกริบ ไม่คืนเข้ากระเป๋า และสินค้ากลับมาพร้อมขาย
              </Notice>
              <Shortfall need={remainder} resumeTo={`/account/reservations/${r.id}`} />
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <Button size="lg" className="w-full" loading={busy} onClick={pay}>ชำระยอดคงเหลือ {formatTHB(remainder)}</Button>
              <p className="text-center text-xs text-muted">หักเฉพาะยอดคงเหลือ ไม่เก็บราคาเต็มซ้ำ</p>
            </>
          )}
          {r.status === 'settled' && (
            <SuccessBurst title="ชำระครบแล้ว">
              <p className="text-sm text-muted">สินค้าเปลี่ยนเป็นขายแล้ว เปิดข้อมูลส่งมอบได้ในคำสั่งซื้อ</p>
              {r.orderId && <ButtonLink to={`/account/orders/${r.orderId}`}>ดูข้อมูลส่งมอบ</ButtonLink>}
            </SuccessBurst>
          )}
          {r.status === 'forfeited' && (
            <div className="space-y-3">
              <Notice tone="danger" icon={<CircleX className="size-4" aria-hidden />} title="หมดเวลาจอง · ริบเงินจองแล้ว">
                เงินจอง {formatTHB(r.depositSatang)} ถูกริบเมื่อ {formatDateTime(r.forfeitedAt!)} และไม่นำไปหักจากการซื้อครั้งใหม่
              </Notice>
              <Notice tone="info" icon={<CalendarClock className="size-4" aria-hidden />} title={r.cooldownUntil! > now ? `จองรายการนี้ซ้ำได้อีกครั้ง ${formatDateTime(r.cooldownUntil!)}` : 'พ้นช่วงรอ 6 ชั่วโมงแล้ว จองซ้ำได้'}>
                {r.cooldownUntil! > now && <>เหลือ <Countdown ms={r.cooldownUntil! - now} label="ช่วงรอจองซ้ำ" /> · ระหว่างนี้ซื้อเต็มจำนวนได้ถ้าสินค้าพร้อมขาย</>}
              </Notice>
              {listing?.status === 'available' && <ButtonLink to={`/listing/${listing.id}`} variant="secondary" className="w-full">ดูสินค้า (ซื้อเต็มจำนวนได้)</ButtonLink>}
              <Notice tone="neutral">นโยบายกรณีร้านส่งมอบไม่ได้ ระบบขัดข้อง หรือยกเลิกก่อนหมดเวลา ยังรอร้านกำหนด</Notice>
            </div>
          )}
        </Card>
      </div>
    </AccountShell>
  )
}
