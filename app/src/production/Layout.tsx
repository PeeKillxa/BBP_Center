import { Moon, Sun, Monitor, House, Gem, Sprout, Wallet, UserRound, LogOut } from 'lucide-react'
import { MotionConfig } from 'motion/react'
import { StoreExperience } from '../components/StoreExperience'
import { useLayoutEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '../components/Logo'
import { Button, Notice } from '../components/ui'
import { setTheme, useTheme } from '../store/theme'
import { api } from './api'
import { useAction, useShop } from './context'

export function Layout() {
  const page = useRef<HTMLDivElement>(null)
  const { session, catalog, error, reload } = useShop()
  const { pathname } = useLocation(),
    theme = useTheme(),
    action = useAction()
  useLayoutEffect(() => {
    // Commit the new route and reset scroll before paint. Keeping one outlet
    // avoids rendering the next route inside an outgoing presence tree.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches || !page.current?.animate) return
    const animation = page.current.animate(
      [
        { opacity: 0.7, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    )
    const stopOnReducedMotion = () => { if (preference.matches) animation.cancel() }
    preference.addEventListener('change', stopOnReducedMotion)
    return () => {
      animation.cancel()
      preference.removeEventListener('change', stopOnReducedMotion)
    }
  }, [pathname])
  const nav = [
    { to: '/', text: 'หน้าแรก', icon: House },
    { to: '/maps', text: 'ไอดีเกม', icon: Gem },
    { to: '/farm', text: 'บริการฟาร์ม', icon: Sprout },
    { to: '/wallet', text: 'กระเป๋า', icon: Wallet },
    { to: '/account', text: 'บัญชี', icon: UserRound },
  ]
  const themes = [
    { value: 'light', icon: Sun, label: 'ธีมสว่าง' },
    { value: 'dark', icon: Moon, label: 'ธีมมืด' },
    { value: 'system', icon: Monitor, label: 'ตามระบบ' },
  ] as const
  const activeTheme = themes.find((item) => item.value === theme) ?? themes[1]
  const nextTheme = themes[(themes.findIndex((item) => item.value === theme) + 1) % themes.length]
  return (
    <MotionConfig reducedMotion="user">
      <div className="site-atmosphere" aria-hidden="true">
        <span className="site-orb site-orb-one" />
        <span className="site-orb site-orb-two" />
        <span className="site-noise" />
      </div>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 z-50 rounded-xl bg-primary p-3 text-white"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <header className="site-header sticky top-0 z-40 border-b border-line/80 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/" aria-label="BBP Center หน้าแรก">
            <Logo size={40} className="[&>span]:hidden sm:[&>span]:inline" />
          </Link>
          <nav className="ml-5 hidden gap-1 lg:flex" aria-label="เมนูหลัก">
            {nav.slice(1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'is-active text-accent' : 'text-muted'}`}
              >
                {item.text}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <StoreExperience />
            <button
              type="button"
              className="inline-flex rounded-lg bg-accent-soft p-2 text-accent sm:hidden"
              aria-label={`${activeTheme.label} — แตะเพื่อเปลี่ยนเป็น${nextTheme.label}`}
              onClick={() => setTheme(nextTheme.value)}
            >
              <activeTheme.icon className="size-4" />
            </button>
            {themes.map((item) => (
              <button
                key={item.value}
                className={`hidden rounded-lg p-2 sm:inline-flex ${theme === item.value ? 'bg-accent-soft text-accent' : 'text-muted'}`}
                aria-label={item.label}
                aria-pressed={theme === item.value}
                onClick={() => setTheme(item.value)}
              >
                <item.icon className="size-4" />
              </button>
            ))}
            {!session.user ? (
              <Link to="/login" className="inline-flex items-center justify-center rounded-xl bg-primary p-2 text-sm whitespace-nowrap text-white sm:px-3">
                <UserRound className="size-4 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">เข้าสู่ระบบ</span>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="px-2 sm:px-3"
                loading={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api('/auth/logout', {})
                    await reload()
                  })
                }
              >
                <LogOut className="size-4 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="relative mx-auto min-h-[65vh] max-w-7xl px-4 pt-6 pb-24">
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
        <div ref={page} data-page-transition>
          <Outlet />
        </div>
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
              `mobile-nav-link flex flex-col items-center gap-1 py-3 text-xs ${isActive ? 'is-active text-accent' : 'text-muted'}`
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
