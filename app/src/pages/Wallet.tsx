import { ArrowRight, Gift, History, QrCode, TriangleAlert, Upload, Wallet as WalletIcon } from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { RequireAuth } from '../components/auth'
import { SuccessBurst } from '../components/feedback'
import { TopUpBadge } from '../components/shop'
import { Button, Card, Field, Notice, PageHeader } from '../components/ui'
import { balanceOf, submitTopUp } from '../domain/engine'
import type { TopUpMethod } from '../domain/types'
import { formatTHB, parseBahtInput } from '../lib/money'
import { formatDateTime } from '../lib/time'
import { cn, fingerprint, uid } from '../lib/util'
import { safeNext } from '../lib/navigation'
import { dispatch, useCurrentUser, useDemo } from '../store/store'

const MIN_TOPUP = 100 // satang; demo validation only
const MAX_TOPUP = 5_000_000

/** Demo QR: a decorative pattern that encodes nothing and cannot be paid. */
function FakeQR() {
  const cells = useMemo(() => Array.from({ length: 21 * 21 }, (_, i) => (i * 7919) % 11 < 5), [])
  return (
    <div className="relative mx-auto w-48">
      <div className="grid aspect-square grid-cols-[repeat(21,1fr)] gap-px rounded-xl bg-white p-3 opacity-40" aria-hidden>
        {cells.map((on, i) => <span key={i} className={on ? 'bg-slate-900' : ''} />)}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <span className="rotate-[-12deg] rounded-lg border-2 border-danger bg-surface px-3 py-1 text-center text-sm font-extrabold text-danger">ตัวอย่าง<br />ห้ามสแกนจ่าย</span>
      </div>
    </div>
  )
}

function TopUpForm({ method }: { method: TopUpMethod }) {
  const s = useDemo()
  const [params] = useSearchParams()
  const [amount, setAmount] = useState(params.get('amount') ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // A new idempotency key only when the input changes: repeated clicks on one input submit once.
  const key = useMemo(() => uid('TOPUP'), [amount, file, link, method])

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (f: File | undefined | null) => {
    if (!f) return
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return setErr((e) => ({ ...e, file: 'รองรับไฟล์ภาพ PNG, JPG หรือ WEBP' }))
    if (f.size > 5 * 1024 * 1024) return setErr((e) => ({ ...e, file: 'ไฟล์ต้องไม่เกิน 5 MB' }))
    setErr((e) => ({ ...e, file: '' }))
    setFile(f)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    const amt = parseBahtInput(amount)
    if (method === 'bank-slip') {
      if (amt === null) next.amount = 'กรอกจำนวนเงินเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง'
      else if (amt < MIN_TOPUP || amt > MAX_TOPUP) next.amount = `จำนวนเงิน ${formatTHB(MIN_TOPUP)} – ${formatTHB(MAX_TOPUP)}`
      if (!file) next.file = 'แนบไฟล์สลิป'
    } else if (!/^https:\/\/gift\.truemoney\.com\/campaign\/?\?v=[A-Za-z0-9]{8,}$/.test(link.trim())) {
      next.link = 'รูปแบบลิงก์ไม่ถูกต้อง ตัวอย่าง: https://gift.truemoney.com/campaign/?v=DEMO1234abcd'
    }
    setErr(next)
    if (Object.values(next).some(Boolean)) return
    setBusy(true)
    // Demo: TrueMoney amount is unknown until checked; the simulator uses a fixed sample amount.
    const credit = method === 'bank-slip' ? amt! : 10_000
    const source = method === 'bank-slip' ? `${file!.name}|${file!.size}|${file!.lastModified}` : link.trim()
    const outcome = s.demo.nextTopUpOutcome
    const r = dispatch(submitTopUp(method, credit, fingerprint(source), outcome, outcome === 'checking' ? null : 1500 + s.demo.latencyMs), key)
    setBusy(false)
    if (r.ok && r.id) setSubmittedId(r.id)
    else if (!r.ok) setErr({ form: r.message })
  }

  const t = submittedId ? s.topups.find((x) => x.id === submittedId) : null
  const nextHref = params.get('next')

  if (t)
    return (
      <div className="space-y-4" aria-live="polite">
        {t.status === 'success' ? (
          <SuccessBurst title="เติมเงินสำเร็จ"><p className="text-muted">เพิ่มยอด {formatTHB(t.amountSatang)} (เงินจำลอง)</p></SuccessBurst>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <TopUpBadge status={t.status} />
            <p className="text-sm text-muted">{t.status === 'checking' ? 'กำลังจำลองการตรวจสอบ… ยอดเงินจะเพิ่มเมื่อผลตรวจสำเร็จเท่านั้น' : 'ไม่มีการเพิ่มยอดเงิน'}</p>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {t.status === 'success' && nextHref && <NextLink href={nextHref} />}
          <Button variant="secondary" onClick={() => { setSubmittedId(null); setFile(null); setLink('') }}>ทำรายการใหม่</Button>
        </div>
      </div>
    )

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Notice tone="danger" icon={<TriangleAlert className="size-4" aria-hidden />} title="โหมดสาธิต ห้ามโอนเงินจริง">
        {method === 'bank-slip' ? 'QR และบัญชีด้านล่างเป็นตัวอย่าง ใช้ชำระเงินจริงไม่ได้ ระบบไม่ส่งสลิปไปตรวจที่ใด' : 'ห้ามวางลิงก์อั่งเปาจริง ต้นแบบไม่เรียกบริการรับอั่งเปา'}
      </Notice>
      {method === 'bank-slip' ? (
        <>
          <Field label="จำนวนเงิน (บาท)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} error={err.amount} hint="ต้องตรงกับยอดในสลิป" />
          <Card className="p-4 text-center">
            <FakeQR />
            <p className="mt-2 text-sm text-muted">บัญชีรับเงิน: <b>รอร้านกำหนด</b> (ไม่มีเลขบัญชีในต้นแบบ)</p>
          </Card>
          <div>
            <p id="slip-label" className="mb-1 text-sm font-medium">ไฟล์สลิป</p>
            <label onDragOver={(e: DragEvent) => e.preventDefault()} onDrop={(e: DragEvent) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }} className={cn('flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center', err.file ? 'border-danger' : 'border-line hover:border-accent')}>
              {preview ? <img src={preview} alt="ตัวอย่างสลิปที่เลือก" className="max-h-56 rounded-lg object-contain" /> : <Upload className="size-8 text-muted" aria-hidden />}
              <span className="text-sm">{file ? `${file.name} · เปลี่ยนไฟล์` : 'เลือกไฟล์ หรือวางไฟล์ที่นี่'}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-labelledby="slip-label" aria-invalid={!!err.file || undefined} onChange={(e: ChangeEvent<HTMLInputElement>) => pick(e.target.files?.[0])} />
            </label>
            {err.file && <p role="alert" className="mt-1 text-sm text-danger">{err.file}</p>}
            <p className="mt-1 text-xs text-muted">ไฟล์อยู่ในเบราว์เซอร์เท่านั้นและไม่ถูกบันทึก</p>
          </div>
        </>
      ) : (
        <Field label="ลิงก์อั่งเปา TrueMoney" value={link} onChange={(e) => setLink(e.target.value)} error={err.link} placeholder="https://gift.truemoney.com/campaign/?v=DEMO1234abcd" hint="ใช้ลิงก์ตัวอย่างเท่านั้น · ยอดจำลองครั้งละ ฿100.00" autoComplete="off" />
      )}
      {err.form && <p role="alert" className="text-sm text-danger">{err.form}</p>}
      <Button type="submit" size="lg" className="w-full" loading={busy}>{method === 'bank-slip' ? 'ส่งสลิปตรวจสอบ (จำลอง)' : 'ตรวจสอบอั่งเปา (จำลอง)'}</Button>
      <p className="text-center text-xs text-muted">ผลตรวจครั้งถัดไปปรับได้ใน Demo Controls · ตอนนี้: {s.demo.nextTopUpOutcome}</p>
    </form>
  )
}

function NextLink({ href }: { href: string }) {
  const nav = useNavigate()
  const safe = safeNext(href, '/')
  return <Button onClick={() => nav(safe)} icon={<ArrowRight className="size-4" aria-hidden />}>กลับไปทำรายการต่อ</Button>
}

export function WalletPage() {
  const s = useDemo()
  const user = useCurrentUser()
  const [method, setMethod] = useState<TopUpMethod>('bank-slip')
  return (
    <RequireAuth reason="เข้าสู่ระบบเพื่อเติมเงิน">
      <PageHeader title="กระเป๋าเงินและเติมเงิน" />
      <p className="mb-4 text-sm"><Link className="text-accent underline" to="/wallet/live">เปิดกระเป๋าเงินจริง / รับซอง TrueMoney</Link></p>
      {user && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            <Card className="relative overflow-hidden p-6">
              <div className="hero-gradient absolute inset-0 opacity-60" aria-hidden />
              <div className="relative">
                <p className="flex items-center gap-2 text-sm text-muted"><WalletIcon className="size-4" aria-hidden /> ยอดเงินคงเหลือ (เงินจำลอง)</p>
                <p className="mt-1 text-4xl font-extrabold tabular-nums">{formatTHB(balanceOf(s, user.id))}</p>
                <p className="mt-1 text-xs text-muted">หน่วยเงินบาท ไม่มีอัตราแลกเปลี่ยน</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">รายการเติมเงินล่าสุด</h2>
                <Link to="/account/transactions" className="inline-flex items-center gap-1 text-sm text-accent"><History className="size-4" aria-hidden /> ประวัติทั้งหมด</Link>
              </div>
              <ul className="divide-y divide-line text-sm">
                {s.topups.filter((t) => t.userId === user.id).slice(0, 6).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{t.method === 'bank-slip' ? 'สลิป' : 'อั่งเปา'} · {formatTHB(t.amountSatang)}<span className="block text-xs text-muted">{formatDateTime(t.createdAt)}</span></span>
                    <TopUpBadge status={t.status} />
                  </li>
                ))}
                {!s.topups.some((t) => t.userId === user.id) && <li className="py-4 text-center text-muted">ยังไม่มีรายการเติมเงิน</li>}
              </ul>
            </Card>
          </div>
          <Card className="p-5">
            <div role="tablist" aria-label="ช่องทางเติมเงิน" className="mb-5 grid grid-cols-2 gap-2">
              {([['bank-slip', 'โอนธนาคาร / QR', QrCode], ['truemoney', 'อั่งเปา TrueMoney', Gift]] as const).map(([m, label, I]) => (
                <button key={m} role="tab" aria-selected={method === m} onClick={() => setMethod(m)} className={cn('flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium', method === m ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent')}>
                  <I className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
            <div role="tabpanel"><TopUpForm key={method} method={method} /></div>
          </Card>
        </div>
      )}
    </RequireAuth>
  )
}
