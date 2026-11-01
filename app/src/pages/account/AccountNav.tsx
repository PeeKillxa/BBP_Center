import { Bell, Bookmark, History, LayoutDashboard, Receipt, Sparkles, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { RequireAuth } from '../../components/auth'
import { PageHeader } from '../../components/ui'
import { cn } from '../../lib/util'

const ITEMS = [
  { to: '/account', label: 'ภาพรวม', icon: LayoutDashboard, end: true },
  { to: '/account/orders', label: 'คำสั่งซื้อ', icon: Receipt },
  { to: '/account/reservations', label: 'รายการจอง', icon: Bookmark },
  { to: '/account/farm', label: 'งานฟาร์ม', icon: Sparkles },
  { to: '/account/transactions', label: 'ประวัติธุรกรรม', icon: History },
  { to: '/account/notifications', label: 'แจ้งเตือน', icon: Bell },
  { to: '/account/profile', label: 'โปรไฟล์', icon: User },
]

/** Shared shell for every account page: auth guard + section nav. */
export function AccountShell({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="เมนูบัญชี" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex gap-1 lg:sticky lg:top-24 lg:flex-col">
            {ITEMS.map(({ to, label, icon: I, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap', isActive ? 'bg-accent-soft font-semibold text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
                  <I className="size-4" aria-hidden /> {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <PageHeader title={title} subtitle={subtitle} actions={actions} />
          {children}
        </div>
      </div>
    </RequireAuth>
  )
}
