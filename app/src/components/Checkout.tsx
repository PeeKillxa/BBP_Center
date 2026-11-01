import { Tag, Wallet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { balanceOf, checkCoupon, type CouponCheck } from '../domain/engine'
import type { CommandResult, CouponScope } from '../domain/types'
import { formatTHB, type Satang } from '../lib/money'
import { nowMs, useCurrentUser, useDemo } from '../store/store'
import { Button, Notice } from './ui'

/** Summary row helper. */
export function Row({ label, children, strong }: { label: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? 'border-t border-line pt-3 text-lg font-bold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  )
}

export function CouponInput({ scope, subtotal, value, onChange }: { scope: CouponScope; subtotal: Satang; value: CouponCheck | null; onChange: (c: CouponCheck | null, code: string) => void }) {
  const s = useDemo()
  const [code, setCode] = useState(value && value.status === 'valid' ? value.coupon.code : '')
  const apply = () => {
    if (!code.trim()) return onChange(null, '')
    onChange(checkCoupon(s, code, scope, subtotal, nowMs()), code.trim())
  }
  return (
    <div>
      <label htmlFor={`coupon-${scope}`} className="mb-1 flex items-center gap-1 text-sm font-medium"><Tag className="size-4" aria-hidden /> คูปอง (ถ้ามี)</label>
      <div className="flex gap-2">
        <input id={`coupon-${scope}`} value={code} onChange={(e) => { setCode(e.target.value); if (value) onChange(null, '') }} placeholder={scope === 'farm' ? 'เช่น FARM5' : 'เช่น DEMO10'} className="h-10 flex-1 rounded-xl border border-line bg-surface px-3 uppercase" aria-describedby={`coupon-${scope}-msg`} />
        <Button type="button" size="sm" variant="secondary" onClick={apply} className="h-10">ใช้คูปอง</Button>
      </div>
      <p id={`coupon-${scope}-msg`} aria-live="polite" className={`mt-1 text-xs ${value?.status === 'valid' ? 'text-success' : value ? 'text-danger' : 'text-muted'}`}>
        {value ? (value.status === 'valid' ? `✓ ใช้ได้: ${value.coupon.label} (ลด ${formatTHB(value.discountSatang)})` : `✗ ${value.status === 'expired' ? 'หมดอายุ' : value.status === 'not-eligible' ? 'ไม่เข้าเงื่อนไข' : 'ใช้ไม่ได้'}: ${value.message}`) : 'คูปองตัวอย่าง: DEMO10 (ไอดี), FARM5 (ฟาร์ม), OLD50 (หมดอายุ)'}
      </p>
    </div>
  )
}

/** Shows the exact shortfall and a top-up link that returns here afterwards. */
export function Shortfall({ need, resumeTo }: { need: Satang; resumeTo: string }) {
  const s = useDemo()
  const user = useCurrentUser()
  const nav = useNavigate()
  if (!user) return null
  const bal = balanceOf(s, user.id)
  if (bal >= need) return null
  return (
    <Notice tone="warning" icon={<Wallet className="size-4" aria-hidden />} title={`ยอดเงินไม่พอ ขาดอีก ${formatTHB(need - bal)}`}>
      <p>ยอดคงเหลือ {formatTHB(bal)} · ต้องใช้ {formatTHB(need)}</p>
      <Button size="sm" className="mt-2" onClick={() => nav(`/wallet?amount=${Math.ceil((need - bal) / 100)}&next=${encodeURIComponent(resumeTo)}`)}>เติมเงินแล้วกลับมาทำรายการต่อ</Button>
    </Notice>
  )
}

export const resultMessage = (r: CommandResult) => (r.ok ? '' : r.message)
