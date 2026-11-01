import { BellRing, CircleCheck, KeyRound, LogIn, Pause, Play, RotateCcw, Smartphone, Store, UserCog } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../components/feedback'
import { FarmTimeline, MeasuredProgress } from '../components/FarmTimeline'
import { ACCESS_TEXT, Countdown, FarmStatusBadge } from '../components/shop'
import { Badge, Button, Card, EmptyState, Notice, PageHeader } from '../components/ui'
import * as E from '../domain/engine'
import type { FarmJob } from '../domain/types'
import { formatTHB } from '../lib/money'
import { formatDateTime, formatDurationTH, MINUTE } from '../lib/time'
import { cn } from '../lib/util'
import { dispatch, setState, useDemo, useNow } from '../store/store'

const VERIFY = ['logging-in', 'awaiting-code', 'awaiting-roblox-approval', 'checking-result']

function Controls({ job, now }: { job: FarmJob; now: number }) {
  const toast = useToast()
  const [measured, setMeasured] = useState('')
  const run = (cmd: E.Cmd, ok: string) => {
    const r = dispatch(cmd)
    toast(r.ok ? 'success' : 'error', r.ok ? ok : r.message)
  }
  const a = job.access
  const st = job.status
  const closed = st === 'completed' || st === 'cancelled'
  if (closed) return <p className="text-sm text-muted">งานปิดแล้ว</p>

  const btn = (label: string, icon: React.ReactNode, enabled: boolean, reason: string, cmd: E.Cmd, ok: string, variant: 'primary' | 'secondary' = 'secondary') => (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant={variant} icon={icon} disabled={!enabled} title={enabled ? undefined : reason} onClick={() => run(cmd, ok)}>{label}</Button>
      {!enabled && <span className="text-[11px] text-muted">{reason}</span>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-muted uppercase">1 · สแตนด์บาย</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {btn('เรียกสแตนด์บาย', <BellRing className="size-4" aria-hidden />, !!job.credentials && (a === 'waiting-call' || a === 'reschedule'), !job.credentials ? 'ลูกค้ายังไม่ส่งข้อมูลบัญชี' : 'เรียกได้เมื่อรอเรียกลูกค้า/รอนัดใหม่', E.ownerCallStandby(job.id), 'เรียกสแตนด์บายแล้ว · เริ่ม 5 นาที', 'primary')}
          {btn('เริ่มเข้าสู่ระบบ', <LogIn className="size-4" aria-hidden />, a === 'customer-ready', 'รอลูกค้ากด “พร้อมแล้ว”', E.ownerStartLogin(job.id), 'เริ่มเข้าสู่ระบบ')}
        </div>
        {a === 'standby-called' && job.standby && <p className="mt-2 text-sm">รอลูกค้าตอบรับ: <Countdown ms={job.standby.deadline - now} label="เวลาสแตนด์บาย" urgentBelowMs={MINUTE} /> · ยังไม่ถือว่าลูกค้าเห็นแจ้งเตือน</p>}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted uppercase">2 · ยืนยันการเข้าสู่ระบบ (แอดมินเลือกวิธี)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {btn('ขอรหัสยืนยัน', <KeyRound className="size-4" aria-hidden />, VERIFY.includes(a), 'ต้องเริ่มเข้าสู่ระบบก่อน', E.ownerRequestVerification(job.id, 'code'), 'ส่งคำขอรหัสแล้ว · รอบเวลาใหม่ 5 นาที')}
          {btn('ขออนุมัติใน Roblox', <Smartphone className="size-4" aria-hidden />, VERIFY.includes(a), 'ต้องเริ่มเข้าสู่ระบบก่อน', E.ownerRequestVerification(job.id, 'roblox-approval'), 'ส่งคำขออนุมัติแล้ว · รอบเวลาใหม่ 5 นาที')}
          {btn('เข้าใช้งานสำเร็จ', <CircleCheck className="size-4" aria-hidden />, VERIFY.includes(a), 'ยังไม่อยู่ในขั้นเข้าสู่ระบบ', E.ownerMarkAccess(job.id), 'บันทึกเข้าใช้งานสำเร็จ', 'primary')}
          {btn('นัดใหม่', <RotateCcw className="size-4" aria-hidden />, !!job.credentials && st !== 'in-progress' && a !== 'reschedule', 'นัดใหม่ไม่ได้ในสถานะนี้', E.ownerReschedule(job.id), 'เปลี่ยนเป็นรอนัดใหม่')}
        </div>
        {job.verification && (
          <p className="mt-2 text-sm">
            คำขอ {job.verification.requestId} ({job.verification.method === 'code' ? 'รหัส' : 'อนุมัติใน Roblox'}): <Countdown ms={job.verification.deadline - now} label="เวลายืนยัน" urgentBelowMs={MINUTE} /> · กด “ขอ…” อีกครั้ง = ลองใหม่ (คำขอเดิมใช้ไม่ได้)
          </p>
        )}
        {a === 'checking-result' && <Notice tone="info" className="mt-2">ลูกค้าส่งรหัส/ยืนยันแล้ว ตรวจผลจริงแล้วกด “เข้าใช้งานสำเร็จ” หรือ “ลองใหม่/นัดใหม่” · ระบบไม่เปลี่ยนเป็นสำเร็จเอง</Notice>}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted uppercase">3 · งานฟาร์ม</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {btn('เริ่มฟาร์ม', <Play className="size-4" aria-hidden />, a === 'access-granted' && st === 'queued', 'ต้องยืนยันเข้าใช้งานสำเร็จก่อน', E.ownerStartFarm(job.id), 'เริ่มฟาร์มแล้ว', 'primary')}
          {st === 'awaiting-customer' && a === 'access-granted'
            ? btn('กลับมาดำเนินการ', <Play className="size-4" aria-hidden />, true, '', E.ownerSetAwaitingCustomer(job.id, false), 'กลับมาดำเนินการ')
            : btn('รอลูกค้าตอบกลับ', <Pause className="size-4" aria-hidden />, st === 'in-progress', 'ใช้ได้ระหว่างดำเนินการ', E.ownerSetAwaitingCustomer(job.id, true), 'เปลี่ยนเป็นรอลูกค้าตอบกลับ')}
          {btn('เสร็จสิ้น', <CircleCheck className="size-4" aria-hidden />, st === 'in-progress', 'ใช้ได้ระหว่างดำเนินการ', E.ownerComplete(job.id), 'ปิดงานแล้ว')}
        </div>
        <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); run(E.ownerReportProgress(job.id, Number(measured)), 'อัปเดตงานแล้ว'); setMeasured('') }}>
          <div className="flex flex-col gap-1">
            <label htmlFor={`m-${job.id}`} className="text-xs text-muted">อัปเดตงาน: จำนวนเพชรที่วัดได้</label>
            <input id={`m-${job.id}`} inputMode="numeric" value={measured} onChange={(e) => setMeasured(e.target.value)} className="h-9 w-40 rounded-lg border border-line bg-surface px-2" disabled={st !== 'in-progress'} />
          </div>
          <Button size="sm" type="submit" variant="secondary" disabled={st !== 'in-progress' || measured === ''}>อัปเดตงาน</Button>
        </form>
      </div>
    </div>
  )
}

export function OwnerFarm() {
  const s = useDemo()
  const now = useNow()
  const [sel, setSel] = useState<string | null>(null)
  if (s.viewMode !== 'owner')
    return (
      <EmptyState
        icon={<Store className="size-10" aria-hidden />}
        title="หน้าควบคุมงานฟาร์ม (มุมมองเจ้าของร้าน)"
        body="เปิดผ่าน Demo Switch เท่านั้น ไม่ใช่ระบบสิทธิ์จริง"
        action={<Button icon={<UserCog className="size-4" aria-hidden />} onClick={() => setState((x) => ({ ...x, viewMode: 'owner' }))}>สลับเป็นมุมมองเจ้าของร้าน (สาธิต)</Button>}
      />
    )
  const jobs = s.farmJobs
  const job = jobs.find((j) => j.id === sel) ?? jobs[0]
  const customer = (id: string) => s.users.find((u) => u.id === id)?.displayName ?? id
  return (
    <>
      <PageHeader
        title="ควบคุมงานฟาร์ม (แบบย่อ)"
        subtitle="สำหรับสาธิตขั้นตอนสแตนด์บายและการเข้าใช้งานเท่านั้น"
        actions={<Button variant="secondary" size="sm" onClick={() => setState((x) => ({ ...x, viewMode: 'customer' }))}>กลับมุมมองลูกค้า</Button>}
      />
      <Notice tone="warning" className="mb-6" title="Demo Switch ไม่ใช่ระบบสิทธิ์จริง">ระบบจริงต้องตรวจสิทธิ์แอดมินบนเซิร์ฟเวอร์ และจำกัดการดูข้อมูลบัญชีลูกค้าตามงานที่ได้รับมอบหมาย หน้านี้ไม่แสดงรหัสผ่านหรือรหัสยืนยัน</Notice>
      {jobs.length === 0 ? <EmptyState icon={<Store className="size-8" aria-hidden />} title="ยังไม่มีงาน" /> : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <ul className="space-y-2" aria-label="รายการงาน">
            {jobs.map((j) => (
              <li key={j.id}>
                <button onClick={() => setSel(j.id)} aria-current={job?.id === j.id || undefined} className={cn('w-full rounded-xl border p-3 text-left', job?.id === j.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent')}>
                  <span className="flex items-center justify-between gap-2"><span className="font-semibold">{j.id}</span><FarmStatusBadge status={j.status} /></span>
                  <span className="block text-sm text-muted">{customer(j.userId)} · {j.diamonds.toLocaleString('th-TH')} เพชร</span>
                  {j.status !== 'completed' && j.status !== 'cancelled' && <span className="mt-1 block text-xs">{ACCESS_TEXT[j.access]}</span>}
                </button>
              </li>
            ))}
          </ul>
          {job && (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <Card className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{job.id}</h2>
                  <FarmStatusBadge status={job.status} />
                  <Badge tone={job.access === 'customer-ready' ? 'success' : 'neutral'}>ลูกค้า: {ACCESS_TEXT[job.access]}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted">ลูกค้า</dt><dd>{customer(job.userId)}</dd>
                  <dt className="text-muted">แพ็กเกจ</dt><dd>{job.serviceName} · {job.diamonds.toLocaleString('th-TH')} เพชร</dd>
                  <dt className="text-muted">ชำระแล้ว</dt><dd>{formatTHB(job.paidSatang)}</dd>
                  <dt className="text-muted">เวลาฟาร์มประมาณ</dt><dd>{formatDurationTH(job.estimateSeconds)}</dd>
                  <dt className="text-muted">บัญชี (สมมติ)</dt><dd>{job.credentials ? `${job.credentials.usernameMasked} · ส่งเมื่อ ${formatDateTime(job.credentials.submittedAt)}` : 'ยังไม่ส่ง'}</dd>
                </dl>
                <MeasuredProgress job={job} />
                <Controls job={job} now={now} />
              </Card>
              <Card className="p-5">
                <h3 className="mb-4 font-bold">ไทม์ไลน์กิจกรรม</h3>
                <FarmTimeline job={job} />
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  )
}
