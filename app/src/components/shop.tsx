import { BadgeCheck, Ban, Bookmark, CircleCheck, CircleX, Clock, Gem, Hourglass, Loader, Sparkles, Timer } from 'lucide-react'
import { Link } from 'react-router'
import type { AccessStatus, FarmJobStatus, Listing, ListingStatus, MapCategory, ReservationStatus, TopUpStatus } from '../domain/types'
import { topUpStatusText } from '../domain/engine'
import { formatTHB } from '../lib/money'
import { formatCountdown } from '../lib/time'
import { cn } from '../lib/util'
import { Badge, Card } from './ui'

/**
 * Placeholder art. No third-party or game images are bundled (asset rights unknown).
 * TODO(owner): replace with the shop's own screenshots; keep the aspect-ratio box to avoid layout shift.
 */
export function ListingArt({ hue, index = 0, label, className }: { hue: number; index?: number; label: string; className?: string }) {
  const h2 = (hue + 40 + index * 25) % 360
  return (
    <div
      role="img"
      aria-label={`ภาพตัวอย่าง (placeholder) ${label}`}
      className={cn('relative aspect-[16/10] w-full overflow-hidden', className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 22%), hsl(${h2} 75% 38%))` }}
    >
      <svg viewBox="0 0 160 100" className="absolute inset-0 size-full opacity-40" aria-hidden>
        <circle cx={30 + index * 20} cy="30" r="28" fill={`hsl(${h2} 90% 70% / .35)`} />
        <path d="M0 80 Q40 55 80 72 T160 62 V100 H0Z" fill={`hsl(${hue} 80% 12% / .55)`} />
        <path d="M110 18 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2z" fill="hsl(190 95% 75% / .55)" />
      </svg>
      <span className="absolute bottom-2 left-2 rounded-md bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white">ภาพตัวอย่าง {index + 1}</span>
    </div>
  )
}

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  if (status === 'available') return <Badge tone="success" icon={<CircleCheck className="size-3.5" aria-hidden />}>พร้อมขาย</Badge>
  if (status === 'reserved') return <Badge tone="warning" icon={<Bookmark className="size-3.5" aria-hidden />}>จอง</Badge>
  return <Badge tone="neutral" icon={<Ban className="size-3.5" aria-hidden />}>ขายแล้ว</Badge>
}

export function ReservationBadge({ status, phase }: { status: ReservationStatus; phase?: string }) {
  if (status === 'settled') return <Badge tone="success" icon={<CircleCheck className="size-3.5" aria-hidden />}>ชำระครบแล้ว</Badge>
  if (status === 'forfeited') return <Badge tone="danger" icon={<CircleX className="size-3.5" aria-hidden />}>หมดเวลา · ริบเงินจอง</Badge>
  if (phase === 'grace') return <Badge tone="warning" icon={<Hourglass className="size-3.5" aria-hidden />}>ช่วงผ่อนผัน</Badge>
  return <Badge tone="info" icon={<Timer className="size-3.5" aria-hidden />}>กำลังจอง</Badge>
}

export const TOPUP_TONE = (s: TopUpStatus): 'success' | 'info' | 'danger' => (s === 'success' ? 'success' : s === 'checking' ? 'info' : 'danger')
export function TopUpBadge({ status }: { status: TopUpStatus }) {
  return (
    <Badge tone={TOPUP_TONE(status)} icon={status === 'success' ? <CircleCheck className="size-3.5" aria-hidden /> : status === 'checking' ? <Loader className="size-3.5 animate-spin" aria-hidden /> : <CircleX className="size-3.5" aria-hidden />}>
      {topUpStatusText(status)}
    </Badge>
  )
}

export const FARM_STATUS_TEXT: Record<FarmJobStatus, string> = {
  'awaiting-details': 'รอรายละเอียด',
  queued: 'รอคิว',
  'in-progress': 'กำลังดำเนินการ',
  'awaiting-customer': 'รอลูกค้าตอบกลับ',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}
export const ACCESS_TEXT: Record<AccessStatus, string> = {
  'waiting-call': 'รอเรียกลูกค้า',
  'standby-called': 'เรียกสแตนด์บาย',
  'customer-ready': 'ลูกค้าพร้อม',
  'logging-in': 'กำลังเข้าสู่ระบบ',
  'awaiting-code': 'รอรหัสยืนยัน',
  'awaiting-roblox-approval': 'รออนุมัติใน Roblox',
  'checking-result': 'กำลังตรวจผล',
  'access-granted': 'เข้าใช้งานสำเร็จ',
  reschedule: 'รอนัดใหม่',
}
export function FarmStatusBadge({ status }: { status: FarmJobStatus }) {
  const tone = status === 'completed' ? 'success' : status === 'cancelled' ? 'neutral' : status === 'in-progress' ? 'accent' : status === 'awaiting-customer' ? 'warning' : 'info'
  const icon = status === 'completed' ? <BadgeCheck className="size-3.5" aria-hidden /> : status === 'cancelled' ? <Ban className="size-3.5" aria-hidden /> : status === 'in-progress' ? <Sparkles className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />
  return <Badge tone={tone} icon={icon}>{FARM_STATUS_TEXT[status]}</Badge>
}

export function Countdown({ ms, label, urgentBelowMs = 0 }: { ms: number; label: string; urgentBelowMs?: number }) {
  const urgent = ms > 0 && ms < urgentBelowMs
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono tabular-nums', urgent && 'text-danger')} aria-label={`${label} เหลือ ${formatCountdown(ms)}`}>
      <Timer className="size-4" aria-hidden />
      {formatCountdown(ms)}
    </span>
  )
}

export function Price({ satang, className }: { satang: number; className?: string }) {
  return <span className={cn('font-bold tabular-nums', className)}>{formatTHB(satang)}</span>
}

export function ListingCard({ listing, map }: { listing: Listing; map?: MapCategory }) {
  return (
    <Card as="article" lift className="group overflow-hidden">
      <Link to={`/listing/${listing.id}`} className="flex h-full flex-col focus-visible:outline-offset-[-2px]">
        <div className="relative">
          <ListingArt hue={map?.hue ?? 210} label={listing.title} />
          <div className="absolute top-2 right-2">
            <ListingStatusBadge status={listing.status} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-xs font-medium text-accent">{map?.name}</p>
          <h3 className="line-clamp-2 font-semibold leading-snug">{listing.title}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {listing.highlights.slice(0, 3).map((h) => (
              <li key={h} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">
                <Gem className="size-3" aria-hidden /> {h}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-end justify-between pt-2">
            <Price satang={listing.priceSatang} className="text-lg" />
            <span className="text-sm text-accent opacity-80 group-hover:opacity-100">ดูรายละเอียด →</span>
          </div>
        </div>
      </Link>
    </Card>
  )
}

export function SampleTag({ children = 'ข้อมูลตัวอย่าง' }: { children?: string }) {
  return <Badge tone="warning">{children}</Badge>
}
