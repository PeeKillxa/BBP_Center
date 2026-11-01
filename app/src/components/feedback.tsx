import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../lib/util'

// ---------- Modal (focus trap, Escape, restores focus) ----------

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, button, [href], select, textarea')
      first?.focus()
    }, 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
        if (!f.length) return
        const [a, z] = [f[0], f[f.length - 1]]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-2xl sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ duration: 0.32, ease: [0.05, 0.7, 0.1, 1] }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold">{title}</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="ปิด">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------- Toasts (aria-live) ----------

type Toast = { id: number; tone: 'success' | 'error' | 'info'; text: string }
const ToastCtx = createContext<(tone: Toast['tone'], text: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((tone: Toast['tone'], text: string) => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x.slice(-2), { id, tone, text }])
    window.setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
              className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-xl"
            >
              {t.tone === 'success' ? <CircleCheck className="size-5 shrink-0 text-success" aria-hidden /> : t.tone === 'error' ? <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden /> : <Info className="size-5 shrink-0 text-accent" aria-hidden />}
              <span>
                <span className="sr-only">{t.tone === 'success' ? 'สำเร็จ: ' : t.tone === 'error' ? 'ข้อผิดพลาด: ' : 'แจ้งเตือน: '}</span>
                {t.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

// ---------- Success animation ----------

export function SuccessBurst({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
      <motion.svg viewBox="0 0 52 52" className="size-20" initial="hidden" animate="show">
        <motion.circle cx="26" cy="26" r="24" fill="none" stroke="var(--success)" strokeWidth="3" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.45 } } }} />
        <motion.path d="M15 27 l7 7 l15 -16" fill="none" stroke="var(--success)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { delay: 0.35, duration: 0.3 } } }} />
      </motion.svg>
      <p className="text-xl font-bold">{title}</p>
      {children}
    </div>
  )
}
