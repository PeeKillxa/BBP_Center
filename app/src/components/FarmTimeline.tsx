import { Bot, Store, User } from 'lucide-react'
import type { FarmJob } from '../domain/types'
import { formatDateTime } from '../lib/time'

const ACTOR = { customer: { label: 'ลูกค้า', icon: User }, shop: { label: 'ร้าน', icon: Store }, system: { label: 'ระบบ', icon: Bot } }

/** Timeline of status events only. Events never contain passwords or verification codes. */
export function FarmTimeline({ job }: { job: FarmJob }) {
  const items = [...job.timeline].reverse()
  return (
    <ol className="relative space-y-4 border-l border-line pl-6" aria-label="ไทม์ไลน์งาน">
      {items.map((e, i) => {
        const A = ACTOR[e.actor]
        return (
          <li key={e.id} className="relative">
            <span className={`absolute -left-[33px] grid size-6 place-items-center rounded-full border ${i === 0 ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted'}`}>
              <A.icon className="size-3.5" aria-hidden />
            </span>
            <p className="text-sm">{e.text}</p>
            <p className="text-xs text-muted">{A.label} · {formatDateTime(e.at)}</p>
          </li>
        )
      })}
    </ol>
  )
}

/** Progress bar only when a measured value exists. */
export function MeasuredProgress({ job }: { job: FarmJob }) {
  if (job.measuredDiamonds === undefined)
    return <p className="text-sm text-muted">ยังไม่มีข้อมูลความคืบหน้าที่วัดได้ (ระบบไม่คาดเดาเปอร์เซ็นต์จากเวลา)</p>
  const pct = Math.floor((job.measuredDiamonds / job.diamonds) * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>วัดได้ {job.measuredDiamonds.toLocaleString('th-TH')} / {job.diamonds.toLocaleString('th-TH')} เพชร</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={job.diamonds} aria-valuenow={job.measuredDiamonds} aria-label="ความคืบหน้าที่ร้านรายงาน">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">ตัวเลขจากการอัปเดตของร้าน ไม่ได้เพิ่มตามเวลา</p>
    </div>
  )
}
