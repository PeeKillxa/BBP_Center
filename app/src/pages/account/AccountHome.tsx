import { Bookmark, Receipt, Sparkles, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { Countdown, FarmStatusBadge, ReservationBadge } from '../../components/shop'
import { ButtonLink, Card, EmptyState } from '../../components/ui'
import { balanceOf, reservationPhase } from '../../domain/engine'
import { formatTHB } from '../../lib/money'
import { HOUR } from '../../lib/time'
import { useCurrentUser, useDemo, useNow } from '../../store/store'
import { AccountShell } from './AccountNav'

export function AccountHome() {
  const s = useDemo()
  const now = useNow()
  const user = useCurrentUser()
  const uidv = user?.id ?? ''
  const active = s.reservations.filter((r) => r.userId === uidv && r.status === 'active')
  const jobs = s.farmJobs.filter((j) => j.userId === uidv && j.status !== 'completed' && j.status !== 'cancelled')
  const orders = s.orders.filter((o) => o.userId === uidv)
  const stats = [
    { label: 'ยอดเงิน', value: formatTHB(balanceOf(s, uidv)), icon: Wallet, to: '/wallet' },
    { label: 'คำสั่งซื้อ', value: String(orders.length), icon: Receipt, to: '/account/orders' },
    { label: 'กำลังจอง', value: String(active.length), icon: Bookmark, to: '/account/reservations' },
    { label: 'งานฟาร์มที่ยังไม่เสร็จ', value: String(jobs.length), icon: Sparkles, to: '/account/farm' },
  ]
  return (
    <AccountShell title={`สวัสดี ${user?.displayName ?? ''}`} subtitle="ภาพรวมบัญชี (ข้อมูลจำลอง)">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, icon: I, to }) => (
          <Card key={label} lift>
            <Link to={to} className="block p-4">
              <I className="mb-2 size-5 text-accent" aria-hidden />
              <p className="text-xs text-muted">{label}</p>
              <p className="text-xl font-bold tabular-nums">{value}</p>
            </Link>
          </Card>
        ))}
      </div>

      <section className="mt-8" aria-labelledby="ah-res">
        <h2 id="ah-res" className="mb-3 text-lg font-bold">รายการจองที่ต้องชำระ</h2>
        {active.length === 0 ? (
          <EmptyState icon={<Bookmark className="size-8" aria-hidden />} title="ไม่มีรายการจองที่ค้างชำระ" action={<ButtonLink to="/maps" variant="secondary" size="sm">เลือกดูไอดี</ButtonLink>} />
        ) : (
          <ul className="space-y-3">
            {active.map((r) => {
              const phase = reservationPhase(r, now)
              const deadline = phase === 'hold' ? r.holdEndsAt : r.expiresAt
              return (
                <li key={r.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <ReservationBadge status={r.status} phase={phase} />
                      <p className="mt-1 font-semibold">{r.listingTitle}</p>
                      <p className="text-sm text-muted">ยอดคงเหลือ {formatTHB(r.lockedPriceSatang - r.depositSatang)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Countdown ms={deadline - now} label={phase === 'hold' ? 'ครบ 12 ชั่วโมง' : 'หมดช่วงผ่อนผัน'} urgentBelowMs={HOUR} />
                      <ButtonLink to={`/account/reservations/${r.id}`} size="sm">ชำระยอดคงเหลือ</ButtonLink>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="ah-farm">
        <h2 id="ah-farm" className="mb-3 text-lg font-bold">งานฟาร์มที่กำลังติดตาม</h2>
        {jobs.length === 0 ? (
          <EmptyState icon={<Sparkles className="size-8" aria-hidden />} title="ยังไม่มีงานฟาร์มที่กำลังดำเนินการ" action={<ButtonLink to="/farm" variant="secondary" size="sm">สั่งฟาร์ม</ButtonLink>} />
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.id}>
                <Card lift>
                  <Link to={`/account/farm/${j.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <span>
                      <span className="block font-semibold">{j.serviceName} · {j.diamonds.toLocaleString('th-TH')} เพชร</span>
                      <span className="text-sm text-muted">{j.id}</span>
                    </span>
                    <FarmStatusBadge status={j.status} />
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AccountShell>
  )
}
