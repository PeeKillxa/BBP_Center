import { Gem, Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import type { DiamondPricingConfig } from '../config/farming'
import { priceForDiamonds, QUANTITY_ERROR_TEXT, validateDiamondQuantity } from '../domain/farming'
import { formatTHB } from '../lib/money'
import { cn } from '../lib/util'

export type PickMode = 'package' | 'custom'

/** Package cards + "กำหนดจำนวนเอง" tab. Emits the raw value; validation is shared with the order command. */
export function DiamondPicker({ cfg, mode, setMode, raw, setRaw }: { cfg: DiamondPricingConfig; mode: PickMode; setMode: (m: PickMode) => void; raw: string; setRaw: (v: string) => void }) {
  const id = useId()
  const v = validateDiamondQuantity(raw, cfg.custom)
  const n = (x: number) => x.toLocaleString('th-TH')
  const step = (d: number) => {
    const base = v.ok ? v.value : cfg.custom.min
    setRaw(String(Math.min(cfg.custom.max, Math.max(cfg.custom.min, base + d * cfg.custom.step))))
  }
  const quick = [10_000, 40_000, 60_000, 150_000, 200_000].filter((x) => x >= cfg.custom.min && x <= cfg.custom.max)

  return (
    <div>
      <div role="tablist" aria-label="วิธีเลือกจำนวน" className="mb-4 inline-flex rounded-xl border border-line bg-surface-2 p-1">
        {(['package', 'custom'] as const).map((m) => (
          <button key={m} role="tab" id={`${id}-tab-${m}`} aria-selected={mode === m} aria-controls={`${id}-panel`} onClick={() => setMode(m)} className={cn('rounded-lg px-4 py-2 text-sm font-medium', mode === m ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>
            {m === 'package' ? 'แพ็กเกจ' : 'กำหนดจำนวนเอง'}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${mode}`}>
        {mode === 'package' ? (
          <div role="radiogroup" aria-label="เลือกแพ็กเกจ" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cfg.packages.map((d) => {
              const p = priceForDiamonds(d, cfg)
              const sel = v.ok && v.value === d
              return (
                <button key={d} role="radio" aria-checked={sel} onClick={() => setRaw(String(d))} className={cn('card-lift rounded-2xl border p-4 text-left', sel ? 'border-accent bg-accent-soft ring-2 ring-accent/40' : 'border-line bg-surface')}>
                  <span className="flex items-center gap-1 text-lg font-extrabold tabular-nums">{n(d)} <Gem className="size-4 text-accent" aria-hidden /></span>
                  <span className="block font-semibold">{p.ok ? formatTHB(p.satang) : '—'}</span>
                  {sel && <span className="mt-1 block text-xs text-accent">✓ เลือกแล้ว</span>}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <label htmlFor={`${id}-qty`} className="text-sm font-medium">จำนวนเพชร</label>
            <div className="flex items-stretch gap-2">
              <button type="button" onClick={() => step(-1)} className="grid w-12 place-items-center rounded-xl border border-line bg-surface-2 disabled:opacity-50" aria-label={`ลด ${n(cfg.custom.step)} เพชร`} disabled={v.ok && v.value <= cfg.custom.min}><Minus className="size-4" aria-hidden /></button>
              <input id={`${id}-qty`} inputMode="numeric" value={raw} onChange={(e) => setRaw(e.target.value)} aria-invalid={!v.ok || undefined} aria-describedby={`${id}-qty-msg`} className={cn('h-12 min-w-0 flex-1 rounded-xl border bg-surface px-4 text-center text-lg font-bold tabular-nums', v.ok ? 'border-line' : 'border-danger')} />
              <button type="button" onClick={() => step(1)} className="grid w-12 place-items-center rounded-xl border border-line bg-surface-2 disabled:opacity-50" aria-label={`เพิ่ม ${n(cfg.custom.step)} เพชร`} disabled={v.ok && v.value >= cfg.custom.max}><Plus className="size-4" aria-hidden /></button>
            </div>
            <p id={`${id}-qty-msg`} role={v.ok ? undefined : 'alert'} className={cn('text-sm', v.ok ? 'text-muted' : 'text-danger')}>
              {v.ok ? `ขั้นต่ำ ${n(cfg.custom.min)} · เพิ่มทีละ ${n(cfg.custom.step)} · สูงสุด ${n(cfg.custom.max)} เพชร (เพดานจริงรอร้านกำหนด)` : QUANTITY_ERROR_TEXT(v.error)}
            </p>
            <div className="flex flex-wrap gap-2" aria-label="ตัวเลือกด่วน">
              {quick.map((d) => (
                <button key={d} type="button" onClick={() => setRaw(String(d))} className={cn('rounded-full border px-3 py-1 text-sm', v.ok && v.value === d ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent')}>{n(d / 1000)}k</button>
              ))}
            </div>
            <p className="text-xs text-muted">ราคาระหว่างจุดราคาคำนวณแบบเส้นตรง (linear interpolation) และไม่คำนวณเกินจุดราคาสูงสุดที่ร้านกำหนด</p>
          </div>
        )}
      </div>
    </div>
  )
}
