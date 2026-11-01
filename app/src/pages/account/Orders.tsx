import { Check, Copy, Eye, EyeOff, Lock, Receipt, Star } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Row } from '../../components/Checkout'
import { useToast } from '../../components/feedback'
import { Badge, Button, ButtonLink, Card, EmptyState, Notice } from '../../components/ui'
import { submitReview } from '../../domain/engine'
import { formatTHB } from '../../lib/money'
import { formatDateTime } from '../../lib/time'
import { mockDeliveryFor } from '../../mock/delivery'
import { dispatch, useCurrentUser, useDemo } from '../../store/store'
import { NotFound } from '../NotFound'
import { AccountShell } from './AccountNav'

export function Orders() {
  const s = useDemo()
  const user = useCurrentUser()
  const list = s.orders.filter((o) => o.userId === user?.id)
  return (
    <AccountShell title="รายการซื้อ">
      {list.length === 0 ? (
        <EmptyState icon={<Receipt className="size-8" aria-hidden />} title="ยังไม่มีคำสั่งซื้อ" body="ไอดีที่ซื้อหรือจองแล้วชำระครบจะแสดงที่นี่" action={<ButtonLink to="/maps">เลือกดูไอดี</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {list.map((o) => (
            <li key={o.id}>
              <Card lift>
                <Link to={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <span>
                    <span className="block font-semibold">{o.listingTitle}</span>
                    <span className="text-sm text-muted">{o.id} · {formatDateTime(o.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge tone="success">สำเร็จ</Badge>
                    {o.source === 'reservation' && <Badge tone="info">จากการจอง</Badge>}
                    <span className="font-bold tabular-nums">{formatTHB(o.paidSatang)}</span>
                  </span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  )
}

function SecretField({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast('success', `คัดลอก${label}แล้ว`)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast('error', 'คัดลอกไม่ได้ กรุณาเปิดดูแล้วคัดลอกเอง')
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 p-3">
      <span className="w-24 shrink-0 text-sm text-muted">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono" aria-label={show ? `${label}: ${value}` : `${label} ซ่อนอยู่`}>{show ? value : '••••••••••••'}</code>
      <Button size="sm" variant="ghost" onClick={() => setShow((x) => !x)} aria-pressed={show} icon={show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}>{show ? 'ซ่อน' : 'เปิดดู'}</Button>
      <Button size="sm" variant="ghost" onClick={copy} icon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}>คัดลอก</Button>
    </div>
  )
}

function ReviewForm({ orderId }: { orderId: string }) {
  const s = useDemo()
  const toast = useToast()
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const existing = s.reviews.find((r) => r.orderId === orderId)
  if (existing) return <Notice tone="success" title="รีวิวของคุณ">{'★'.repeat(existing.rating)} · {existing.text}</Notice>
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const r = dispatch(submitReview(orderId, rating, text))
    if (r.ok) toast('success', 'ขอบคุณสำหรับรีวิว')
    else setErr(r.message)
  }
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">ให้คะแนน</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-pressed={rating === n} aria-label={`${n} ดาว`} className="rounded p-1">
              <Star className={`size-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`rv-${orderId}`} className="text-sm font-medium">ข้อความรีวิว</label>
      <textarea id={`rv-${orderId}`} value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} className="w-full rounded-xl border border-line bg-surface p-3" />
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <Button type="submit" size="sm">ส่งรีวิว</Button>
    </form>
  )
}

export function OrderDetail() {
  const { id = '' } = useParams()
  const s = useDemo()
  const user = useCurrentUser()
  const o = s.orders.find((x) => x.id === id)
  if (!user) return <AccountShell title="คำสั่งซื้อ">{null}</AccountShell>
  // Non-owners get the same "not found" as a missing order: do not confirm the order exists.
  if (!o || o.userId !== user.id) return <NotFound title="ไม่พบคำสั่งซื้อนี้" />
  const d = mockDeliveryFor(o.id)
  return (
    <AccountShell title={`คำสั่งซื้อ ${o.id}`} subtitle={formatDateTime(o.createdAt)}>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-2 font-bold">รายละเอียด</h2>
          <dl>
            <Row label="สินค้า"><Link to={`/listing/${o.listingId}`} className="text-accent underline">{o.listingTitle}</Link></Row>
            <Row label="ราคาสินค้า">{formatTHB(o.priceSatang)}</Row>
            {o.discountSatang > 0 && <Row label={`ส่วนลด (${o.couponCode})`}>−{formatTHB(o.discountSatang)}</Row>}
            {o.source === 'reservation' && <Row label="ชำระผ่านการจอง">เงินจอง 50% + ยอดคงเหลือ</Row>}
            <Row label="เวลา">{formatDateTime(o.createdAt)}</Row>
            <Row label="ชำระทั้งหมด" strong>{formatTHB(o.paidSatang)}</Row>
          </dl>
        </Card>
        <Card className="space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold"><Lock className="size-4 text-accent" aria-hidden /> ข้อมูลส่งมอบ</h2>
          <Notice tone="warning">ข้อมูลจำลองเท่านั้น ใช้เข้าสู่ระบบจริงไม่ได้ · การซ่อนข้อมูลบนหน้าเว็บไม่ใช่การควบคุมสิทธิ์จริง ระบบจริงต้องตรวจเจ้าของคำสั่งซื้อบนเซิร์ฟเวอร์</Notice>
          <SecretField label="ชื่อผู้ใช้" value={d.username} />
          <SecretField label="รหัสผ่าน" value={d.password} />
          <SecretField label="อีเมลผูกบัญชี" value={d.email} />
          <p className="text-xs text-muted">{d.note}</p>
        </Card>
        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-2 font-bold">รีวิวคำสั่งซื้อนี้</h2>
          <p className="mb-3 text-sm text-muted">รีวิวได้เฉพาะผู้ซื้อที่มีคำสั่งซื้อสำเร็จ ครั้งละหนึ่งรีวิวต่อคำสั่งซื้อ</p>
          <ReviewForm orderId={o.id} />
        </Card>
      </div>
    </AccountShell>
  )
}
