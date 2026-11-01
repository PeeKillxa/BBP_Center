import { Bookmark, ChevronLeft, ChevronRight, Expand, Lock, ShieldCheck, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { loginHref } from '../components/auth'
import { CouponInput, Row, Shortfall } from '../components/Checkout'
import { Modal, SuccessBurst, useToast } from '../components/feedback'
import { ListingArt, ListingCard, ListingStatusBadge, Price } from '../components/shop'
import { Button, ButtonLink, Card, Notice } from '../components/ui'
import { RESERVATION } from '../config/rules'
import { activeReservationFor, cooldownFor, depositFor, purchaseListing, createReservation, type CouponCheck } from '../domain/engine'
import { formatTHB } from '../lib/money'
import { formatDateTime } from '../lib/time'
import { uid } from '../lib/util'
import { dispatch, nowMs, useCurrentUser, useDemo, useNow } from '../store/store'
import { NotFound } from './NotFound'

function Gallery({ count, hue, title }: { count: number; hue: number; title: string }) {
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState(false)
  const go = (d: number) => setI((x) => (x + d + count) % count)
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line">
        <ListingArt hue={hue} index={i} label={title} />
        <button onClick={() => setZoom(true)} className="absolute top-2 right-2 rounded-lg bg-black/50 p-2 text-white" aria-label="ขยายภาพ"><Expand className="size-4" aria-hidden /></button>
        <button onClick={() => go(-1)} className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white" aria-label="ภาพก่อนหน้า"><ChevronLeft className="size-5" aria-hidden /></button>
        <button onClick={() => go(1)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white" aria-label="ภาพถัดไป"><ChevronRight className="size-5" aria-hidden /></button>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2" role="group" aria-label="เลือกภาพ">
        {Array.from({ length: count }, (_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`ภาพที่ ${k + 1}`} aria-current={k === i || undefined} className={`overflow-hidden rounded-lg border-2 ${k === i ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100'}`}>
            <ListingArt hue={hue} index={k} label={`${title} ภาพย่อ ${k + 1}`} />
          </button>
        ))}
      </div>
      <Modal open={zoom} onClose={() => setZoom(false)} title={`${title} · ภาพ ${i + 1}/${count}`} wide>
        <div className="overflow-hidden rounded-xl"><ListingArt hue={hue} index={i} label={title} /></div>
        <div className="mt-3 flex justify-between">
          <Button variant="secondary" size="sm" onClick={() => go(-1)} icon={<ChevronLeft className="size-4" aria-hidden />}>ก่อนหน้า</Button>
          <Button variant="secondary" size="sm" onClick={() => go(1)}>ถัดไป <ChevronRight className="size-4" aria-hidden /></Button>
        </div>
      </Modal>
    </div>
  )
}

export function ListingDetail() {
  const { id = '' } = useParams()
  const s = useDemo()
  const now = useNow()
  const user = useCurrentUser()
  const loc = useLocation()
  const nav = useNavigate()
  const toast = useToast()
  const [mode, setMode] = useState<null | 'buy' | 'reserve'>(null)
  const [coupon, setCoupon] = useState<{ check: CouponCheck | null; code: string }>({ check: null, code: '' })
  const [accept, setAccept] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ kind: 'buy' | 'reserve'; id: string } | null>(null)
  // One idempotency key per opened confirmation: double clicks and retries cannot double-charge.
  const attemptKey = useMemo(() => (mode ? uid('ATT') : ''), [mode])

  const l = s.listings.find((x) => x.id === id)
  if (!l) return <NotFound title="ไม่พบไอดีนี้" />
  const map = s.maps.find((m) => m.id === l.mapId)
  const related = s.listings.filter((x) => x.mapId === l.mapId && x.id !== l.id && x.status === 'available').slice(0, 4)
  const mine = activeReservationFor(s, l.id)
  const isMine = !!user && mine?.userId === user.id
  const cd = user ? cooldownFor(s, user.id, l.id, now) : undefined
  const deposit = depositFor(l.priceSatang)
  const discount = coupon.check?.status === 'valid' ? coupon.check.discountSatang : 0
  const total = mode === 'reserve' ? (deposit ?? 0) : l.priceSatang - discount

  const open = (m: 'buy' | 'reserve') => {
    if (!user) return nav(loginHref(loc.pathname))
    setError(null)
    setAccept(false)
    setCoupon({ check: null, code: '' })
    setDone(null)
    setMode(m)
  }

  const confirm = () => {
    setBusy(true)
    setError(null)
    window.setTimeout(() => {
      const r =
        mode === 'buy'
          ? dispatch(purchaseListing(l.id, l.priceSatang, coupon.check?.status === 'valid' ? coupon.code : undefined), attemptKey)
          : dispatch(createReservation(l.id, l.priceSatang, accept), attemptKey)
      setBusy(false)
      if (r.ok && r.id) {
        setDone({ kind: mode!, id: r.id })
        toast('success', mode === 'buy' ? 'ซื้อสำเร็จ' : 'จองสำเร็จ')
      } else if (!r.ok) setError(r.message)
    }, s.demo.latencyMs)
  }

  const unavailableReason = l.status === 'sold' ? 'สินค้านี้ขายแล้ว' : l.status === 'reserved' ? (isMine ? 'คุณจองรายการนี้อยู่' : 'สินค้านี้ถูกจองอยู่ เปิดขายอีกครั้งหากผู้จองไม่ชำระภายในเวลา') : null

  return (
    <>
      <nav aria-label="breadcrumb" className="mb-4 text-sm text-muted">
        <Link to="/maps" className="hover:text-ink">หมวดหมู่แมพ</Link> / <Link to={`/maps/${l.mapId}`} className="hover:text-ink">{map?.name}</Link> / <span className="text-ink">{l.title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <Gallery count={l.imageCount} hue={map?.hue ?? 210} title={l.title} />
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2"><ListingStatusBadge status={l.status} /><span className="text-sm text-accent">{map?.name}</span></div>
            <h1 className="text-2xl font-bold sm:text-3xl">{l.title}</h1>
            <Price satang={l.priceSatang} className="mt-2 block text-3xl" />
          </div>
          <Card className="p-4">
            <h2 className="mb-2 font-semibold">ข้อมูลไอดี</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">แมพ</dt><dd>{map?.name}</dd>
              {l.server && (<><dt className="text-muted">เซิร์ฟเวอร์</dt><dd>{l.server}</dd></>)}
              {l.attributes.map((a) => (<div key={a.label} className="contents"><dt className="text-muted">{a.label}</dt><dd>{a.value}</dd></div>))}
            </dl>
            <ul className="mt-3 flex flex-wrap gap-1.5">{l.highlights.map((h) => <li key={h} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs">{h}</li>)}</ul>
          </Card>

          {unavailableReason ? (
            <Notice tone={isMine ? 'info' : 'neutral'} icon={<Lock className="size-4" aria-hidden />} title={unavailableReason}>
              {isMine && mine && <ButtonLink to={`/account/reservations/${mine.id}`} size="sm" className="mt-2">ไปชำระยอดคงเหลือ</ButtonLink>}
            </Notice>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="lg" icon={<ShoppingBag className="size-5" aria-hidden />} onClick={() => open('buy')}>ซื้อเต็มจำนวน</Button>
                <Button size="lg" variant="secondary" icon={<Bookmark className="size-5" aria-hidden />} onClick={() => open('reserve')} disabled={!!cd || deposit === null} aria-describedby="reserve-reason">
                  จองด้วยเงิน 50%{deposit !== null && ` (${formatTHB(deposit)})`}
                </Button>
              </div>
              <p id="reserve-reason" className="text-xs text-muted">
                {cd ? `คุณจองรายการนี้ซ้ำได้อีกครั้ง ${formatDateTime(cd.cooldownUntil!)} · ซื้อเต็มจำนวนได้ทันที` : deposit === null ? 'ราคานี้ทำให้เงินจองมีเศษสตางค์ นโยบายการปัดเศษรอกำหนด' : 'จองล็อกสินค้า 12 ชั่วโมง + ผ่อนผัน 2 ชั่วโมง · ไม่ชำระครบภายในเวลา เงินจองถูกริบ'}
                {!user && ' · ต้องเข้าสู่ระบบก่อนซื้อหรือจอง'}
              </p>
            </div>
          )}

          <Card className="p-4 text-sm">
            <h2 className="mb-1 font-semibold">เงื่อนไขการโอน</h2>
            <p className="text-muted">ข้อมูลส่งมอบเปิดดูได้เฉพาะในหน้าคำสั่งซื้อของผู้ซื้อหลังชำระครบ ไม่แสดงในหน้าสินค้า รายละเอียดขั้นตอนการโอนบัญชีรอร้านกำหนด</p>
            <h2 className="mt-3 mb-1 flex items-center gap-1 font-semibold"><ShieldCheck className="size-4 text-accent" aria-hidden /> การรับประกัน</h2>
            <p className="text-muted">ร้านกำลังจัดทำรายละเอียด</p>
          </Card>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="rel">
          <h2 id="rel" className="mb-4 text-xl font-bold">สินค้าที่เกี่ยวข้อง</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((x) => <ListingCard key={x.id} listing={x} map={map} />)}</div>
        </section>
      )}

      <Modal open={!!mode} onClose={() => !busy && setMode(null)} title={done ? 'ทำรายการสำเร็จ' : mode === 'buy' ? 'สรุปคำสั่งซื้อ' : 'ยืนยันการจอง'}>
        {done ? (
          <SuccessBurst title={done.kind === 'buy' ? 'ซื้อสำเร็จ' : 'จองสำเร็จ'}>
            <p className="text-sm text-muted">{done.kind === 'buy' ? `คำสั่งซื้อ ${done.id}` : `รายการจอง ${done.id} · ชำระยอดคงเหลือ ${formatTHB(l.priceSatang - (deposit ?? 0))}`}</p>
            <ButtonLink to={done.kind === 'buy' ? `/account/orders/${done.id}` : `/account/reservations/${done.id}`}>{done.kind === 'buy' ? 'ดูคำสั่งซื้อและข้อมูลส่งมอบ' : 'ดูรายการจอง'}</ButtonLink>
          </SuccessBurst>
        ) : (
          <div className="space-y-4">
            <dl>
              <Row label="สินค้า">{l.title}</Row>
              <Row label="ราคาสินค้า">{formatTHB(l.priceSatang)}</Row>
              {mode === 'buy' && discount > 0 && <Row label="ส่วนลดคูปอง">−{formatTHB(discount)}</Row>}
              {mode === 'reserve' && (
                <>
                  <Row label="เงินจอง 50% (หักตอนนี้)">{formatTHB(deposit ?? 0)}</Row>
                  <Row label="ยอดคงเหลือที่ต้องชำระภายหลัง">{formatTHB(l.priceSatang - (deposit ?? 0))}</Row>
                  <Row label="ครบ 12 ชั่วโมง">{formatDateTime(nowMs() + RESERVATION.holdMs)}</Row>
                  <Row label="สิ้นสุดช่วงผ่อนผัน (หมดสิทธิ์)">{formatDateTime(nowMs() + RESERVATION.holdMs + RESERVATION.graceMs)}</Row>
                </>
              )}
              <Row label={mode === 'buy' ? 'หักจากกระเป๋าเงิน' : 'หักเงินจองจากกระเป๋าเงิน'} strong>{formatTHB(total)}</Row>
            </dl>
            {mode === 'buy' && <CouponInput scope="listing" subtotal={l.priceSatang} value={coupon.check} onChange={(check, code) => setCoupon({ check, code })} />}
            {mode === 'reserve' && (
              <>
                <Notice tone="neutral">ใช้คูปองกับรายการจองไม่ได้ในต้นแบบ (นโยบายคูปองกับการจองรอร้านกำหนด)</Notice>
                <label className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/5 p-3 text-sm">
                  <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--danger)]" />
                  <span>
                    ฉันยอมรับว่าหากไม่ชำระยอดคงเหลือภายใน <b>{formatDateTime(nowMs() + RESERVATION.holdMs + RESERVATION.graceMs)}</b> เงินจอง <b>{formatTHB(deposit ?? 0)}</b> จะถูกริบทั้งหมด ไม่คืนเข้ากระเป๋า และไม่นำไปหักจากการซื้อครั้งใหม่
                  </span>
                </label>
              </>
            )}
            <Shortfall need={total} resumeTo={loc.pathname} />
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button className="w-full" size="lg" loading={busy} onClick={confirm} disabled={mode === 'reserve' && !accept} aria-describedby={mode === 'reserve' && !accept ? 'need-accept' : undefined}>
              {busy ? 'กำลังตรวจสอบสินค้าและหักยอด…' : mode === 'buy' ? `ยืนยันหักยอด ${formatTHB(total)}` : `ยืนยันจอง หักเงินจอง ${formatTHB(total)}`}
            </Button>
            {mode === 'reserve' && !accept && <p id="need-accept" className="text-center text-xs text-muted">ติ๊กยอมรับเงื่อนไขการริบเงินจองก่อนยืนยัน</p>}
            <p className="text-center text-xs text-muted">ระบบตรวจสถานะสินค้าและราคาอีกครั้งก่อนหักยอด · เงินจำลองเท่านั้น</p>
          </div>
        )}
      </Modal>
    </>
  )
}
