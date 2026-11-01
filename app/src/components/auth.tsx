import { LogIn } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useCurrentUser } from '../store/store'
import { ButtonLink, Card } from './ui'

export const loginHref = (from: string) => `/login?next=${encodeURIComponent(from)}`

/** Guard for pages that need a signed-in demo user. Demo only: real access control is server-side. */
export function RequireAuth({ children, reason = 'เข้าสู่ระบบเพื่อดูหน้านี้' }: { children: ReactNode; reason?: string }) {
  const user = useCurrentUser()
  const loc = useLocation()
  if (user) return <>{children}</>
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <LogIn className="mx-auto mb-3 size-10 text-accent" aria-hidden />
      <p className="text-lg font-semibold">{reason}</p>
      <p className="mt-1 text-sm text-muted">ดูสินค้าได้โดยไม่ต้องเข้าสู่ระบบ แต่การเติมเงิน ซื้อ จอง และสั่งฟาร์มต้องเข้าสู่ระบบก่อน</p>
      <ButtonLink to={loginHref(loc.pathname + loc.search)} className="mt-5">เข้าสู่ระบบ / สมัครสมาชิก</ButtonLink>
    </Card>
  )
}
