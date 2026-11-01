import { Bell, Bookmark, Receipt, Sparkles, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { Button, Card, EmptyState } from '../../components/ui'
import { markNotificationsRead } from '../../domain/engine'
import { formatDateTime } from '../../lib/time'
import { cn } from '../../lib/util'
import { dispatch, useCurrentUser, useDemo } from '../../store/store'
import { AccountShell } from './AccountNav'

const ICON = { topup: Wallet, purchase: Receipt, reservation: Bookmark, farm: Sparkles }

export function Notifications() {
  const s = useDemo()
  const user = useCurrentUser()
  const list = s.notifications.filter((n) => n.userId === user?.id)
  const unread = list.filter((n) => !n.read).length
  return (
    <AccountShell title="แจ้งเตือน" subtitle={unread ? `ยังไม่อ่าน ${unread} รายการ` : 'อ่านครบแล้ว'} actions={unread > 0 && <Button size="sm" variant="secondary" onClick={() => dispatch(markNotificationsRead())}>อ่านทั้งหมด</Button>}>
      {list.length === 0 ? <EmptyState icon={<Bell className="size-8" aria-hidden />} title="ยังไม่มีแจ้งเตือน" /> : (
        <Card className="divide-y divide-line">
          {list.map((n) => {
            const I = ICON[n.kind]
            const body = (
              <div className="flex gap-3 p-4">
                <I className={cn('mt-0.5 size-5 shrink-0', n.read ? 'text-muted' : 'text-accent')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn(!n.read && 'font-semibold')}>{!n.read && <span className="sr-only">ยังไม่อ่าน: </span>}{n.title}</p>
                  <p className="text-sm text-muted">{n.body}</p>
                  <p className="text-xs text-muted">{formatDateTime(n.at)}</p>
                </div>
                {!n.read && <span className="mt-1 rounded-full bg-accent px-2 text-[10px] leading-5 font-bold text-bg">ใหม่</span>}
              </div>
            )
            return n.href ? <Link key={n.id} to={n.href} onClick={() => dispatch(markNotificationsRead([n.id]))} className="block hover:bg-surface-2">{body}</Link> : <div key={n.id}>{body}</div>
          })}
        </Card>
      )}
    </AccountShell>
  )
}
