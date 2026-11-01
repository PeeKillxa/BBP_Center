import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { Bell, CircleHelp, FlaskConical, House, LayoutGrid, LogIn, Monitor, Moon, Search, Sparkles, Sun, User, Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { balanceOf } from '../domain/engine'
import { formatTHB } from '../lib/money'
import { cn } from '../lib/util'
import { useCurrentUser, useDemo } from '../store/store'
import { setTheme, useTheme, type ThemeChoice } from '../store/theme'
import { DemoControls } from './DemoControls'
import { Logo } from './Logo'

const NAV = [
  { to: '/maps', label: 'ไอดีเกม' },
  { to: '/farm', label: 'บริการฟาร์ม' },
  { to: '/help', label: 'ช่วยเหลือ' },
]

function ThemeSwitch() {
  const t = useTheme()
  const opts: { v: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { v: 'light', label: 'ธีมสว่าง', icon: Sun },
    { v: 'dark', label: 'ธีมมืด', icon: Moon },
    { v: 'system', label: 'ตามระบบ', icon: Monitor },
  ]
  return (
    <div role="radiogroup" aria-label="เลือกธีม" className="flex rounded-xl border border-line bg-surface-2 p-0.5">
      {opts.map(({ v, label, icon: I }) => (
        <button key={v} role="radio" aria-checked={t === v} aria-label={label} title={label} onClick={() => setTheme(v)} className={cn('rounded-lg p-1.5 transition-colors', t === v ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-ink')}>
          <I className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  )
}

function SearchBox({ className }: { className?: string }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    nav(`/maps/all?q=${encodeURIComponent(q.trim())}`)
  }
  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <label htmlFor="global-search" className="sr-only">ค้นหาไอดี</label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input id="global-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาไอดี เช่น ตัวลับ, เลเวล" className="h-10 w-full rounded-xl border border-line bg-surface-2 pr-3 pl-9 text-sm placeholder:text-muted/80 focus:border-accent" />
    </form>
  )
}

function AccountArea() {
  const s = useDemo()
  const user = useCurrentUser()
  const loc = useLocation()
  if (!user)
    return (
      <Link to={`/login?next=${encodeURIComponent(loc.pathname)}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
        <LogIn className="size-4" aria-hidden /> เข้าสู่ระบบ
      </Link>
    )
  const unread = s.notifications.filter((n) => n.userId === user.id && !n.read).length
  return (
    <div className="flex items-center gap-2">
      <Link to="/wallet" className="inline-flex h-10 items-center gap-2 rounded-xl border border-accent/40 bg-accent-soft px-3 text-sm font-bold text-ink" aria-label={`ยอดเงิน ${formatTHB(balanceOf(s, user.id))} ไปหน้ากระเป๋าเงิน`}>
        <Wallet className="size-4 text-accent" aria-hidden />
        <span className="tabular-nums">{formatTHB(balanceOf(s, user.id))}</span>
      </Link>
      <Link to="/account/notifications" className="relative hidden rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-ink sm:inline-flex" aria-label={`แจ้งเตือน ${unread ? `ยังไม่อ่าน ${unread} รายการ` : ''}`}>
        <Bell className="size-5" aria-hidden />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white dark:text-bg">{unread}</span>}
      </Link>
      <Link to="/account" className="hidden items-center gap-2 rounded-xl p-2 text-sm hover:bg-surface-2 md:inline-flex">
        <User className="size-5" aria-hidden />
        <span className="max-w-28 truncate">{user.displayName}</span>
      </Link>
    </div>
  )
}

const MOBILE = [
  { to: '/', label: 'หน้าแรก', icon: House, end: true },
  { to: '/maps', label: 'ไอดี', icon: LayoutGrid },
  { to: '/farm', label: 'ฟาร์ม', icon: Sparkles },
  { to: '/wallet', label: 'กระเป๋า', icon: Wallet },
  { to: '/account', label: 'บัญชี', icon: User },
]

export function Layout() {
  const loc = useLocation()
  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="sr-only z-[80] rounded-lg bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">ข้ามไปยังเนื้อหา</a>
      <div className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-1.5 text-center text-xs font-medium text-warning">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        <span>ต้นแบบโหมดสาธิต · ข้อมูลทั้งหมดเป็นข้อมูลจำลอง ไม่มีการตัดเงินจริง ห้ามโอนเงินหรือกรอกบัญชีจริง</span>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link to="/" aria-label="BBP Center หน้าแรก" className="shrink-0">
            <Logo size={36} withText={true} className="[&>span]:hidden sm:[&>span]:inline" />
          </Link>
          <nav aria-label="เมนูหลัก" className="ml-2 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-accent' : 'text-muted hover:text-ink')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <SearchBox className="mx-auto hidden w-full max-w-sm md:block" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitch />
            <AccountArea />
          </div>
        </div>
        <div className="px-4 pb-2 md:hidden">
          <SearchBox />
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main id="main" key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }} transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }} className="mx-auto min-h-[60vh] max-w-7xl px-4 pt-6 pb-36 md:pb-20">
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-line pb-24 md:pb-0">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
          <Logo size={28} />
          <p className="max-w-xl">BBP Center เป็นร้านผู้ขายรายเดียว ไม่ใช่ร้านทางการและไม่ได้รับการรับรองจาก Roblox Corporation หรือผู้พัฒนาเกมที่เกี่ยวข้อง</p>
          <Link to="/help" className="inline-flex items-center gap-1 hover:text-ink"><CircleHelp className="size-4" aria-hidden /> ช่วยเหลือและเงื่อนไข</Link>
        </div>
      </footer>

      <nav aria-label="เมนูมือถือ" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {MOBILE.map(({ to, label, icon: I, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-accent' : 'text-muted')}>
                <I className="size-5" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <DemoControls />
    </MotionConfig>
  )
}
