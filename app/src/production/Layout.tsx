import { Moon, Sun, Monitor, House, Gem, Sprout, Wallet, UserRound } from 'lucide-react'
import { MotionConfig } from 'motion/react'
import { StoreExperience } from '../components/StoreExperience'
import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '../components/Logo'
import { Button, Notice } from '../components/ui'
import { setTheme, useTheme } from '../store/theme'
import { api } from './api'
import { useAction, useShop } from './context'

export function Layout() {
  const main = useRef<HTMLElement>(null)
  const { session, catalog, error, reload } = useShop()
  const { pathname } = useLocation(),
    theme = useTheme(),
    action = useAction()
  useEffect(() => {
    window.scrollTo(0, 0)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const animation = main.current?.animate([{ opacity: .5, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' })
      return () => animation?.cancel()
    }
  }, [pathname])
  const nav = [
    { to: '/', text: 'หน้าแรก', icon: House },
    { to: '/maps', text: 'ไอดีเกม', icon: Gem },
    { to: '/farm', text: 'บริการฟาร์ม', icon: Sprout },
    { to: '/wallet', text: 'กระเป๋า', icon: Wallet },
    { to: '/account', text: 'บัญชี', icon: UserRound },
  ]
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 z-50 rounded-xl bg-primary p-3 text-white"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/" aria-label="BBP Center หน้าแรก">
            <Logo size={40} className="[&>span]:hidden sm:[&>span]:inline" />
          </Link>
          <nav className="ml-5 hidden gap-1 lg:flex" aria-label="เมนูหลัก">
            {nav.slice(1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'text-accent' : 'text-muted')}
              >
                {item.text}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <StoreExperience />
            {(
              [
                { value: 'light', icon: Sun, label: 'ธีมสว่าง' },
                { value: 'dark', icon: Moon, label: 'ธีมมืด' },
                { value: 'system', icon: Monitor, label: 'ตามระบบ' },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                className={`rounded-lg p-2 ${theme === item.value ? 'bg-accent-soft text-accent' : 'text-muted'}`}
                aria-label={item.label}
                aria-pressed={theme === item.value}
                onClick={() => setTheme(item.value)}
              >
                <item.icon className="size-4" />
              </button>
            ))}
            {!session.user ? (
              <Link to="/login" className="rounded-xl bg-primary px-3 py-2 text-sm text-white">
                เข้าสู่ระบบ
              </Link>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                loading={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api('/auth/logout', {})
                    await reload()
                  })
                }
              >
                ออกจากระบบ
              </Button>
            )}
          </div>
        </div>
      </header>
      <main ref={main} id="main" className="mx-auto min-h-[65vh] max-w-7xl px-4 pt-6 pb-24">
        {(error || action.error) && (
          <p role="alert" className="mb-4 text-danger">
            {error || action.error}
          </p>
        )}
        {catalog && !catalog.settings.open && (
          <Notice className="mb-5" tone="info">
            ขณะนี้ยังไม่เปิดรับคำสั่งซื้อ
          </Notice>
        )}
        <Outlet />
      </main>
      <footer className="border-t border-line px-4 py-8 pb-28 text-sm text-muted lg:pb-8">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4">
          <span>BBP Center · ร้านผู้ขายรายเดียว ไม่มีความเกี่ยวข้องหรือการรับรองจาก Roblox</span>
          <Link to="/help" className="text-accent">
            ติดต่อและเงื่อนไขบริการ
          </Link>
        </div>
      </footer>
      <nav
        aria-label="เมนูมือถือ"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 text-xs ${isActive ? 'text-accent' : 'text-muted'}`
            }
          >
            <item.icon className="size-5" />
            {item.text}
          </NavLink>
        ))}
      </nav>
    </MotionConfig>
  )
}
