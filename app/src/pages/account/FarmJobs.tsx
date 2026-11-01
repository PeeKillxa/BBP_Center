import { BellRing, CircleCheck, KeyRound, ShieldAlert, Smartphone, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Row } from '../../components/Checkout'
import { useToast } from '../../components/feedback'
import { FarmTimeline, MeasuredProgress } from '../../components/FarmTimeline'
import { ACCESS_TEXT, Countdown, FarmStatusBadge } from '../../components/shop'
import { Badge, Button, ButtonLink, Card, EmptyState, Field, Notice } from '../../components/ui'
import { DEMO_USERNAME_PREFIX, VERIFICATION_CODE } from '../../config/rules'
import { customerConfirmApproval, customerReady, customerSubmitCode, submitFarmCredentials } from '../../domain/engine'
import type { FarmJob } from '../../domain/types'
import { formatTHB } from '../../lib/money'
import { formatDateTime, formatDurationTH, MINUTE } from '../../lib/time'
import { dispatch, useCurrentUser, useDemo, useNow } from '../../store/store'
import { NotFound } from '../NotFound'
import { AccountShell } from './AccountNav'

export function FarmJobs() {
  const s = useDemo()
  const user = useCurrentUser()
  const list = s.farmJobs.filter((j) => j.userId === user?.id)
  return (
    <AccountShell title="ติดตามงานฟาร์ม">
      {list.length === 0 ? (
        <EmptyState icon={<Sparkles className="size-8" aria-hidden />} title="ยังไม่มีงานฟาร์ม" action={<ButtonLink to="/farm">สั่งฟาร์ม</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {list.map((j) => (
            <li key={j.id}>
              <Card lift>
                <Link to={`/account/farm/${j.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <span>
                    <span className="block font-semibold">{j.serviceName} · {j.diamonds.toLocaleString('th-TH')} เพชร</span>
                    <span className="text-sm text-muted">{j.id} · {formatDateTime(j.createdAt)}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <FarmStatusBadge status={j.status} />
                    {j.status !== 'completed' && j.status !== 'cancelled' && j.credentials && <Badge tone="neutral">{ACCESS_TEXT[j.access]}</Badge>}
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

/** Mock credential form. Values live only in component state and are cleared after submit. */
function CredentialForm({ job }: { job: FarmJob }) {
  const toast = useToast()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const r = dispatch(submitFarmCredentials(job.id, u, p))
    setP('')
    if (r.ok) {
      setU('')
      toast('success', 'ส่งข้อมูลแล้ว เข้าคิวรอร้านเรียกสแตนด์บาย')
    } else setErr(r.message)
  }
  return (
    <form onSubmit={submit} className="space-y-3" noValidate autoComplete="off">
      <Notice tone="danger" icon={<ShieldAlert className="size-4" aria-hidden />} title="ห้ามกรอกข้อมูลบัญชี Roblox จริง">
        ต้นแบบนี้ใช้ข้อมูลสมมติเท่านั้น ชื่อผู้ใช้ต้องขึ้นต้นด้วย <code>{DEMO_USERNAME_PREFIX}</code> · ระบบไม่บันทึกรหัสผ่านใน localStorage, URL, analytics, console หรือ log · ร้านจะไม่ขอ backup codes, session cookies หรือให้ปิด 2FA
      </Notice>
      <Field label="Roblox username (สมมติ)" value={u} onChange={(e) => { setU(e.target.value); setErr(null) }} placeholder={`${DEMO_USERNAME_PREFIX}tester`} autoComplete="off" spellCheck={false} />
      <Field label="Password (สมมติ)" type="password" value={p} onChange={(e) => { setP(e.target.value); setErr(null) }} autoComplete="new-password" hint="กรอกค่าสมมติใดก็ได้ ระบบตรวจว่าไม่ว่างแล้วทิ้งทันที" />
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <Button type="submit" className="w-full">ส่งข้อมูลบัญชีสมมติ</Button>
      <p className="text-xs text-muted">ช่องทางส่งรายละเอียดบัญชีสำหรับระบบจริงยังรอร้านกำหนด</p>
    </form>
  )
}

function AccessStep({ job, now }: { job: FarmJob; now: number }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const act = (r: ReturnType<typeof dispatch>, ok: string) => (r.ok ? (toast('success', ok), setErr(null)) : setErr(r.message))

  if (job.access === 'standby-called' && job.standby)
    return (
      <div className="space-y-3 text-center" role="alert">
        <BellRing className="mx-auto size-10 text-accent" aria-hidden />
        <p className="text-lg font-bold">ร้านเรียกสแตนด์บาย</p>
        <p className="text-sm text-muted">กด “พร้อมแล้ว” ภายในเวลาที่เหลือ ระบบจะไม่ถือว่าคุณเห็นแจ้งเตือนจนกว่าจะกดปุ่มนี้</p>
        <p className="text-3xl font-extrabold"><Countdown ms={job.standby.deadline - now} label="เวลาตอบรับสแตนด์บาย" urgentBelowMs={MINUTE} /></p>
        <Button size="lg" className="w-full" onClick={() => act(dispatch(customerReady(job.id, job.standby!.requestId)), 'แจ้งร้านว่าพร้อมแล้ว')}>พร้อมแล้ว</Button>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      </div>
    )
  if (job.access === 'awaiting-code' && job.verification)
    return (
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const r = dispatch(customerSubmitCode(job.id, job.verification!.requestId, code)); setCode(''); act(r, 'ส่งรหัสแล้ว รอร้านตรวจผล') }} noValidate autoComplete="off">
        <p className="flex items-center gap-2 font-bold"><KeyRound className="size-5 text-accent" aria-hidden /> ร้านขอรหัสยืนยัน</p>
        <p className="text-sm">เวลาที่เหลือ: <Countdown ms={job.verification.deadline - now} label="เวลากรอกรหัส" urgentBelowMs={MINUTE} /></p>
        <Field label="รหัสยืนยัน (สมมติ)" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" hint={`${VERIFICATION_CODE.hint} · รหัสจริงอาจหมดอายุก่อนเวลาบนเว็บ`} />
        <p className="text-xs text-muted">ช่องนี้ใช้กับคำขอล่าสุดเท่านั้น ส่งรหัสแล้วยังไม่ถือว่าเข้าสู่ระบบสำเร็จ ร้านจะยืนยันผลเอง · ระบบไม่บันทึกรหัส</p>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        <Button type="submit" className="w-full">ส่งรหัสยืนยัน</Button>
      </form>
    )
  if (job.access === 'awaiting-roblox-approval' && job.verification)
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 font-bold"><Smartphone className="size-5 text-accent" aria-hidden /> ร้านขอให้อนุมัติการเข้าสู่ระบบใน Roblox</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>เปิดแอปหรือเว็บ Roblox บนอุปกรณ์ของคุณ</li>
          <li>ตรวจคำขอเข้าสู่ระบบที่แสดง แล้วกดอนุมัติ (ในต้นแบบไม่มีคำขอจริง)</li>
          <li>กลับมากด “ยืนยันแล้ว” ด้านล่าง</li>
        </ol>
        <p className="text-sm">เวลาที่เหลือ: <Countdown ms={job.verification.deadline - now} label="เวลาอนุมัติ" urgentBelowMs={MINUTE} /></p>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        <Button className="w-full" onClick={() => act(dispatch(customerConfirmApproval(job.id, job.verification!.requestId)), 'แจ้งร้านแล้ว รอร้านตรวจผล')}>ยืนยันแล้ว</Button>
        <p className="text-xs text-muted">การกดยืนยันไม่เท่ากับเข้าสู่ระบบสำเร็จ ร้านจะเป็นผู้ยืนยันผล</p>
      </div>
    )
  const text: Partial<Record<FarmJob['access'], string>> = {
    'waiting-call': 'รอร้านเรียกสแตนด์บาย เมื่อถึงคิวจะมีแจ้งเตือนและปุ่ม “พร้อมแล้ว”',
    'customer-ready': 'คุณกดพร้อมแล้ว รอร้านเริ่มเข้าสู่ระบบ',
    'logging-in': 'ร้านกำลังเข้าสู่ระบบ อาจขอรหัสยืนยันหรือการอนุมัติใน Roblox',
    'checking-result': 'ร้านกำลังตรวจผลการเข้าสู่ระบบ',
    'access-granted': 'ร้านยืนยันเข้าใช้งานสำเร็จแล้ว',
    reschedule: 'รอนัดใหม่ ร้านจะเรียกสแตนด์บายอีกครั้ง ไม่มีการเรียกเก็บเงินเพิ่มหรือริบค่าฟาร์ม',
  }
  return <p className="text-sm text-muted">{text[job.access]}</p>
}

export function FarmJobDetail() {
  const { id = '' } = useParams()
  const s = useDemo()
  const now = useNow()
  const user = useCurrentUser()
  const j = s.farmJobs.find((x) => x.id === id)
  if (!user) return <AccountShell title="งานฟาร์ม">{null}</AccountShell>
  if (!j || j.userId !== user.id) return <NotFound title="ไม่พบงานนี้" />
  const closed = j.status === 'completed' || j.status === 'cancelled'
  return (
    <AccountShell title={`งานฟาร์ม ${j.id}`} subtitle={<span className="inline-flex flex-wrap gap-2"><FarmStatusBadge status={j.status} />{!closed && j.credentials && <Badge tone="neutral">{ACCESS_TEXT[j.access]}</Badge>}</span>}>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <dl>
              <Row label="บริการ">{j.serviceName}</Row>
              <Row label="จำนวนเพชร">{j.diamonds.toLocaleString('th-TH')}</Row>
              <Row label="เวลาฟาร์มประมาณ">{formatDurationTH(j.estimateSeconds)}</Row>
              <Row label="เวลารอคิว">ไม่รวมในเวลาประมาณ</Row>
              {j.credentials && <Row label="บัญชี (สมมติ)">{j.credentials.usernameMasked}</Row>}
              {j.discountSatang > 0 && <Row label={`ส่วนลด (${j.couponCode})`}>−{formatTHB(j.discountSatang)}</Row>}
              <Row label="ชำระแล้ว" strong>{formatTHB(j.paidSatang)}</Row>
            </dl>
          </Card>
          {!closed && (
            <Card className="p-5" aria-live="polite">
              <h2 className="mb-3 font-bold">ขั้นตอนเข้าใช้งาน</h2>
              {j.status === 'awaiting-details' ? <CredentialForm job={j} /> : <AccessStep job={j} now={now} />}
            </Card>
          )}
          <Card className="p-5">
            <h2 className="mb-3 font-bold">ความคืบหน้า</h2>
            {j.status === 'completed' ? <p className="flex items-center gap-2 text-success"><CircleCheck className="size-5" aria-hidden /> งานเสร็จสิ้น</p> : <MeasuredProgress job={j} />}
          </Card>
        </div>
        <Card className="p-5">
          <h2 className="mb-4 font-bold">ไทม์ไลน์</h2>
          <FarmTimeline job={j} />
        </Card>
      </div>
    </AccountShell>
  )
}
