import { Clock, Gem, Hourglass, Info, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { loginHref } from '../components/auth'
import { CouponInput, Row, Shortfall } from '../components/Checkout'
import { DiamondPicker, type PickMode } from '../components/DiamondPicker'
import { Modal, SuccessBurst, useToast } from '../components/feedback'
import { SampleTag } from '../components/shop'
import { Badge, Button, ButtonLink, Card, Notice, PageHeader } from '../components/ui'
import { getFarmService, SERVICE_KIND_LABEL } from '../config/farming'
import { orderFarm, type CouponCheck } from '../domain/engine'
import { estimateDiamondFarm, priceForDiamonds, validateDiamondQuantity } from '../domain/farming'
import { formatTHB } from '../lib/money'
import { formatDurationTH } from '../lib/time'
import { uid } from '../lib/util'
import { dispatch, useCurrentUser, useDemo } from '../store/store'
import { NotFound } from './NotFound'

export function FarmService() {
  const { serviceId = '' } = useParams()
  const [params] = useSearchParams()
  const svc = getFarmService(serviceId)
  const s = useDemo()
  const user = useCurrentUser()
  const nav = useNavigate()
  const loc = useLocation()
  const toast = useToast()
  const initial = params.get('d') ?? String(svc?.diamond?.packages[0] ?? '')
  const [mode, setMode] = useState<PickMode>(svc?.diamond?.packages.includes(Number(initial)) ? 'package' : 'custom')
  const [raw, setRaw] = useState(initial)
  const [open, setOpen] = useState(false)
  const [coupon, setCoupon] = useState<{ check: CouponCheck | null; code: string }>({ check: null, code: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const key = useMemo(() => (open ? uid('FARM') : ''), [open])

  if (!svc) return <NotFound title="ไม่พบบริการนี้" />
  const map = s.maps.find((m) => m.id === svc.mapId)

  if (!svc.orderable || !svc.diamond)
    return (
      <>
        <PageHeader title={svc.name} subtitle={map?.name} />
        <Card className="max-w-2xl space-y-3 p-6">
          <Badge tone="neutral" icon={<Clock className="size-3.5" aria-hidden />}>{svc.pendingReason}</Badge>
          <p>ราคา ระยะเวลา โอกาสสำเร็จ และเงื่อนไขของบริการ{SERVICE_KIND_LABEL[svc.kind]}ยังรอร้านกำหนดรายละเอียด จึงยังสั่งซื้อไม่ได้</p>
          <p className="text-sm text-muted">ต้นแบบนี้ไม่แต่งระยะเวลารับประกันหรือโอกาสสำเร็จขึ้นเอง และไม่ใช้สูตรเวลาของฟาร์มเพชรกับบริการนี้</p>
          <Button disabled aria-describedby="svc-pending">สั่งบริการนี้</Button>
          <p id="svc-pending" className="text-xs text-muted">ปุ่มปิดใช้: รอร้านกำหนดรายละเอียด</p>
        </Card>
      </>
    )

  const cfg = svc.diamond
  const v = validateDiamondQuantity(raw, cfg.custom)
  const price = v.ok ? priceForDiamonds(v.value, cfg) : null
  const est = v.ok ? estimateDiamondFarm(v.value, cfg.rate) : null
  const discount = coupon.check?.status === 'valid' ? coupon.check.discountSatang : 0
  const subtotal = price?.ok ? price.satang : 0
  const total = subtotal - discount

  const start = () => {
    if (!user) return nav(loginHref(loc.pathname + `?d=${v.ok ? v.value : ''}`))
    setError(null)
    setDone(null)
    setCoupon({ check: null, code: '' })
    setOpen(true)
  }
  const confirm = () => {
    if (!v.ok || !price?.ok) return
    setBusy(true)
    window.setTimeout(() => {
      const r = dispatch(orderFarm(svc.id, v.value, price.satang, coupon.check?.status === 'valid' ? coupon.code : undefined), key)
      setBusy(false)
      if (r.ok && r.id) {
        setDone(r.id)
        toast('success', 'สั่งฟาร์มสำเร็จ')
      } else if (!r.ok) setError(r.message)
    }, s.demo.latencyMs)
  }

  return (
    <>
      <nav aria-label="breadcrumb" className="mb-2 text-sm text-muted"><Link to="/farm" className="hover:text-ink">บริการฟาร์ม</Link> / <span className="text-ink">{svc.name}</span></nav>
      <PageHeader title={svc.name} subtitle={<span className="inline-flex flex-wrap items-center gap-2">{map?.name} <SampleTag>ราคาเป็นข้อเสนอสำหรับต้นแบบ · ยังรอเจ้าของร้านยืนยัน</SampleTag></span>} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <DiamondPicker cfg={cfg} mode={mode} setMode={setMode} raw={raw} setRaw={setRaw} />
        </Card>
        <Card className="h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">สรุปก่อนชำระ</h2>
          <dl aria-live="polite">
            <Row label="บริการ">{SERVICE_KIND_LABEL[svc.kind]}</Row>
            <Row label="จำนวนเพชร">{v.ok ? <span className="inline-flex items-center gap-1">{v.value.toLocaleString('th-TH')} <Gem className="size-4 text-accent" aria-hidden /></span> : '—'}</Row>
            <Row label="จำนวนรอบ (ประมาณ)">{est ? est.rounds.toLocaleString('th-TH') : '—'}</Row>
            <Row label={<span className="inline-flex items-center gap-1"><Hourglass className="size-4" aria-hidden /> เวลาฟาร์มประมาณ</span>}>{est ? formatDurationTH(est.seconds) : '—'}</Row>
            <Row label="เวลารอคิว">แยกต่างหาก · แจ้งในหน้าติดตามงาน</Row>
            <Row label="ราคา" strong>{price?.ok ? formatTHB(price.satang) : '—'}</Row>
          </dl>
          <Notice tone="info" icon={<Info className="size-4" aria-hidden />}>
            <ul className="list-disc space-y-1 pl-4">
              <li>คิดจาก {cfg.rate.diamondsPerRound} เพชรต่อรอบ รอบละ {cfg.rate.secondsPerRound / 60} นาที (รวมเวลา rejoin)</li>
              <li>เป็นเวลาประมาณ ไม่รวมเวลารอคิว เวลารอยืนยันการเข้าสู่ระบบ และเหตุขัดข้อง ไม่ใช่เวลารับประกันส่งงาน</li>
              <li>หลังชำระ ระบบจะให้กรอกข้อมูลบัญชี (ข้อมูลสมมติในต้นแบบ) แล้วร้านจะเรียกสแตนด์บาย</li>
            </ul>
          </Notice>
          <Button size="lg" className="w-full" icon={<Sparkles className="size-5" aria-hidden />} onClick={start} disabled={!v.ok || !price?.ok} aria-describedby="farm-cta-hint">
            สั่งฟาร์ม {price?.ok ? formatTHB(price.satang) : ''}
          </Button>
          <p id="farm-cta-hint" className="text-center text-xs text-muted">{!v.ok ? 'แก้ไขจำนวนเพชรให้ถูกต้องก่อน' : !user ? 'ต้องเข้าสู่ระบบก่อนสั่งฟาร์ม' : 'หักจากกระเป๋าเงิน (เงินจำลอง)'}</p>
        </Card>
      </div>

      <Modal open={open} onClose={() => !busy && setOpen(false)} title={done ? 'สั่งฟาร์มสำเร็จ' : 'ยืนยันสั่งฟาร์ม'}>
        {done ? (
          <SuccessBurst title="ชำระเรียบร้อย">
            <p className="text-sm text-muted">งาน {done} · ขั้นต่อไป: กรอกข้อมูลบัญชีสมมติเพื่อเข้าคิว</p>
            <ButtonLink to={`/account/farm/${done}`}>ไปหน้าติดตามงาน</ButtonLink>
          </SuccessBurst>
        ) : (
          <div className="space-y-4">
            <dl>
              <Row label="บริการ">{svc.name}</Row>
              <Row label="จำนวนเพชร">{v.ok ? v.value.toLocaleString('th-TH') : '—'}</Row>
              <Row label="เวลาฟาร์มประมาณ">{est ? formatDurationTH(est.seconds) : '—'}</Row>
              <Row label="ราคา">{formatTHB(subtotal)}</Row>
              {discount > 0 && <Row label="ส่วนลดคูปอง">−{formatTHB(discount)}</Row>}
              <Row label="หักจากกระเป๋าเงิน" strong>{formatTHB(total)}</Row>
            </dl>
            <CouponInput scope="farm" subtotal={subtotal} value={coupon.check} onChange={(check, code) => setCoupon({ check, code })} />
            <Shortfall need={total} resumeTo={`${loc.pathname}?d=${v.ok ? v.value : ''}`} />
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button size="lg" className="w-full" loading={busy} onClick={confirm}>{busy ? 'กำลังหักยอด…' : `ยืนยันหักยอด ${formatTHB(total)}`}</Button>
          </div>
        )}
      </Modal>
    </>
  )
}
