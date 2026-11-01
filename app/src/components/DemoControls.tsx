import { FlaskConical, RotateCcw, UserCog } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { balanceOf, demoSetBalance, resolveTopUp, SLIP_OUTCOMES, topUpStatusText, TRUEMONEY_OUTCOMES } from '../domain/engine'
import type { TopUpStatus } from '../domain/types'
import { formatTHB, parseBahtInput } from '../lib/money'
import { formatDateTime, HOUR, MINUTE } from '../lib/time'
import { advanceClock, dispatch, nowMs, resetDemo, setState, useDemo, useNow } from '../store/store'
import { useToast } from './feedback'
import { Modal } from './feedback'
import { Button } from './ui'

const OUTCOMES = [...new Set<TopUpStatus>([...SLIP_OUTCOMES, ...TRUEMONEY_OUTCOMES])]

/** Prototype-only panel. Not part of the real product; remove when the backend exists. */
export function DemoControls() {
  const [open, setOpen] = useState(false)
  const s = useDemo()
  const now = useNow()
  const toast = useToast()
  const nav = useNavigate()
  const [bal, setBal] = useState('')
  const user = s.users.find((u) => u.id === s.currentUserId)
  const pending = s.topups.filter((t) => t.status === 'checking' && t.userId === s.currentUserId)

  const applyBalance = () => {
    if (!user) return toast('error', 'เลือกผู้ใช้ตัวอย่างก่อน')
    const v = parseBahtInput(bal)
    if (v === null) return toast('error', 'กรอกจำนวนเงินเป็นตัวเลข เช่น 500 หรือ 99.50')
    const r = dispatch(demoSetBalance(user.id, v))
    if (r.ok) {
      toast('success', `ตั้งยอดเงินจำลองเป็น ${formatTHB(v)}`)
      setBal('')
    } else toast('error', r.message)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-[4.5rem] left-3 z-50 inline-flex items-center gap-1.5 rounded-full border border-warning/50 bg-surface px-3 py-2 text-xs font-bold text-warning shadow-lg md:bottom-4 md:left-4" aria-haspopup="dialog">
        <FlaskConical className="size-4" aria-hidden /> Demo Controls
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Demo Controls (เฉพาะต้นแบบ)">
        <div className="space-y-5 text-sm">
          <p className="rounded-lg bg-warning/10 p-2 text-warning">แผงนี้ใช้ทดสอบต้นแบบเท่านั้น ข้อมูลทั้งหมดเป็นข้อมูลจำลอง ไม่เกี่ยวกับเงินหรือบัญชีจริง</p>

          <section aria-labelledby="dc-user">
            <h3 id="dc-user" className="mb-2 font-semibold">ผู้ใช้ตัวอย่าง</h3>
            <div className="grid gap-2">
              {s.users.map((u) => (
                <button key={u.id} onClick={() => setState((x) => ({ ...x, currentUserId: u.id }))} aria-pressed={u.id === s.currentUserId} className={`flex items-center justify-between rounded-xl border p-3 text-left ${u.id === s.currentUserId ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent'}`}>
                  <span>
                    <span className="block font-medium">{u.displayName}{u.id === s.currentUserId && ' (กำลังใช้)'}</span>
                    <span className="text-xs text-muted">{u.demoNote}</span>
                  </span>
                  <span className="tabular-nums">{formatTHB(balanceOf(s, u.id))}</span>
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setState((x) => ({ ...x, currentUserId: null, viewMode: 'customer' }))}>ออกจากระบบ (ผู้เยี่ยมชม)</Button>
            </div>
          </section>

          <section aria-labelledby="dc-role">
            <h3 id="dc-role" className="mb-2 flex items-center gap-1 font-semibold"><UserCog className="size-4" aria-hidden /> Demo Switch มุมมอง</h3>
            <div className="flex gap-2">
              {(['customer', 'owner'] as const).map((m) => (
                <Button key={m} size="sm" variant={s.viewMode === m ? 'primary' : 'secondary'} aria-pressed={s.viewMode === m} onClick={() => { setState((x) => ({ ...x, viewMode: m })); if (m === 'owner') { setOpen(false); nav('/owner/farm') } }}>
                  {m === 'customer' ? 'ลูกค้า' : 'เจ้าของร้าน'}
                </Button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">ไม่ใช่ระบบสิทธิ์จริง ระบบจริงต้องตรวจสิทธิ์บนเซิร์ฟเวอร์</p>
          </section>

          <section aria-labelledby="dc-bal">
            <h3 id="dc-bal" className="mb-2 font-semibold">ปรับยอดเงินจำลอง</h3>
            <div className="flex gap-2">
              <label htmlFor="dc-bal-in" className="sr-only">ยอดเงินใหม่ (บาท)</label>
              <input id="dc-bal-in" inputMode="decimal" value={bal} onChange={(e) => setBal(e.target.value)} placeholder={user ? `ปัจจุบัน ${formatTHB(balanceOf(s, user.id))}` : 'เลือกผู้ใช้ก่อน'} className="h-10 flex-1 rounded-xl border border-line bg-surface px-3" disabled={!user} />
              <Button size="sm" onClick={applyBalance} disabled={!user}>ตั้งยอด</Button>
            </div>
          </section>

          <section aria-labelledby="dc-top">
            <h3 id="dc-top" className="mb-2 font-semibold">ผลตรวจเติมเงินครั้งถัดไป</h3>
            <label htmlFor="dc-outcome" className="sr-only">ผลตรวจครั้งถัดไป</label>
            <select id="dc-outcome" value={s.demo.nextTopUpOutcome} onChange={(e) => setState((x) => ({ ...x, demo: { ...x.demo, nextTopUpOutcome: e.target.value as TopUpStatus } }))} className="h-10 w-full rounded-xl border border-line bg-surface px-3">
              <option value="checking">ค้างสถานะกำลังตรวจ (ตัดสินผลเองด้านล่าง)</option>
              {OUTCOMES.map((o) => <option key={o} value={o}>{topUpStatusText(o)}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted">ผลที่ไม่ตรงกับช่องทาง (เช่น "ลิงก์ไม่ถูกต้อง" กับสลิป) จะใช้ "สำเร็จ" แทน</p>
            {pending.length > 0 && (
              <div className="mt-3 space-y-2">
                {pending.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2">
                    <span className="flex-1">{t.id} · {formatTHB(t.amountSatang)}</span>
                    <Button size="sm" onClick={() => dispatch(resolveTopUp(t.id, 'success'))}>สำเร็จ</Button>
                    <Button size="sm" variant="secondary" onClick={() => dispatch(resolveTopUp(t.id, t.method === 'bank-slip' ? 'unverifiable' : 'provider-unavailable'))}>ล้มเหลว</Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="dc-clock">
            <h3 id="dc-clock" className="mb-1 font-semibold">นาฬิกาทดสอบ</h3>
            <p className="mb-2 text-xs text-muted">เวลาสาธิต: {formatDateTime(now)} {s.clockOffsetMs > 0 && `(เดินหน้า ${Math.round(s.clockOffsetMs / MINUTE).toLocaleString('th-TH')} นาที)`}</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['+1 นาที', MINUTE],
                ['+5 นาที', 5 * MINUTE],
                ['+1 ชม.', HOUR],
                ['+2 ชม.', 2 * HOUR],
                ['+6 ชม.', 6 * HOUR],
                ['+12 ชม.', 12 * HOUR],
              ].map(([label, ms]) => (
                <Button key={label as string} size="sm" variant="secondary" onClick={() => { advanceClock(ms as number); toast('info', `เดินเวลา ${label}`) }}>{label}</Button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">ใช้ทดสอบจองหมดเวลา ช่วงผ่อนผัน cooldown และเวลาสแตนด์บาย ระบบจริงต้องใช้เวลาเซิร์ฟเวอร์</p>
          </section>

          <section aria-labelledby="dc-err" className="flex items-center justify-between gap-3">
            <div>
              <h3 id="dc-err" className="font-semibold">จำลองโหลดข้อมูลผิดพลาด</h3>
              <p className="text-xs text-muted">หน้ารายการไอดีจะแสดงสถานะโหลดไม่สำเร็จ</p>
            </div>
            <input type="checkbox" aria-labelledby="dc-err" className="size-5 accent-[var(--primary)]" checked={s.demo.simulateLoadError} onChange={(e) => setState((x) => ({ ...x, demo: { ...x.demo, simulateLoadError: e.target.checked } }))} />
          </section>

          <Button variant="danger" className="w-full" icon={<RotateCcw className="size-4" aria-hidden />} onClick={() => { if (window.confirm('รีเซ็ตข้อมูลสาธิตทั้งหมดกลับเป็นค่าเริ่มต้น?')) { resetDemo(); toast('success', `รีเซ็ตข้อมูลแล้ว (${formatDateTime(nowMs())})`) } }}>
            รีเซ็ตข้อมูลสาธิต
          </Button>
        </div>
      </Modal>
    </>
  )
}
