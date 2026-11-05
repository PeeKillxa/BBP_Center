import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Volume2, VolumeX, X, CheckCircle2 } from 'lucide-react'

let audio: AudioContext | undefined
let lastSound = 0
export function StoreExperience() {
  const [enabled, setEnabled] = useState(false)
  const [toast, setToast] = useState('')
  const reduced = useReducedMotion()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem('bbp-sound') === 'on')
    } catch {
      /* optional preference */
    }
  }, [])
  useEffect(() => {
    const sound = (kind: string) => {
      if (!enabled || !audio || audio.state !== 'running' || performance.now() - lastSound < 75) return
      lastSound = performance.now()
      const notes = kind === 'success' ? [523, 659, 784] : kind === 'menu' ? [440, 660] : [720]
      notes.forEach((frequency, index) => {
        const oscillator = audio!.createOscillator(),
          gain = audio!.createGain(),
          at = audio!.currentTime + index * 0.065
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(0.035, at + 0.006)
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.08)
        oscillator.connect(gain)
        gain.connect(audio!.destination)
        oscillator.start(at)
        oscillator.stop(at + 0.09)
        oscillator.onended = () => {
          oscillator.disconnect()
          gain.disconnect()
        }
      })
    }
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button,a,summary') : null
      if (
        !target ||
        target.hasAttribute('disabled') ||
        target.getAttribute('aria-disabled') === 'true' ||
        target.hasAttribute('data-sound-toggle')
      )
        return
      if (enabled) {
        try {
          audio ??= new AudioContext()
          void audio
            .resume()
            .then(() =>
              sound(
                target.getAttribute('data-sound') === 'menu' ||
                  target.hasAttribute('aria-expanded') ||
                  target.tagName === 'SUMMARY'
                  ? 'menu'
                  : 'click',
              ),
            )
            .catch(() => {})
        } catch {
          /* audio is optional */
        }
      }
    }
    const success = (event: Event) => {
      const message = (event as CustomEvent<string>).detail
      if (!message) return
      setToast(message)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setToast(''), 5000)
      sound('success')
    }
    document.addEventListener('click', click)
    window.addEventListener('bbp-success', success)
    return () => {
      document.removeEventListener('click', click)
      window.removeEventListener('bbp-success', success)
    }
  }, [enabled])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <>
      <button
        type="button"
        data-sound-toggle
        aria-label={enabled ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
        title={enabled ? 'ปิดเสียง' : 'เปิดเสียง (ปิดเป็นค่าเริ่มต้น)'}
        aria-pressed={enabled}
        className="rounded-lg p-2 text-muted hover:bg-surface-2"
        onClick={() => {
          const next = !enabled
          setEnabled(next)
          try {
            localStorage.setItem('bbp-sound', next ? 'on' : 'off')
            if (next) {
              audio ??= new AudioContext()
              void audio.resume().catch(() => {})
            } else void audio?.suspend().catch(() => {})
          } catch {
            /* optional preference */
          }
        }}
      >
        {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {toast && (
              <motion.div
                className="store-toast"
                role="status"
                initial={{ opacity: 0, y: reduced ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : 8 }}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="shrink-0 text-success" size={20} />
                  <span className="flex-1 text-sm">{toast}</span>
                  <button aria-label="ปิดแจ้งเตือน" onClick={() => setToast('')}>
                    <X size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}

export function ConfirmPanel({ open, children, onClose }: { open: boolean; children: ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>{open && <ConfirmationDialog onClose={onClose}>{children}</ConfirmationDialog>}</AnimatePresence>
  )
}

function ConfirmationDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = ref.current
    dialog?.showModal()
    return () => {
      dialog?.close()
      previous?.focus()
    }
  }, [])
  return (
    <motion.dialog
      initial={{ opacity: 0, y: reduced ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : 6 }}
      transition={{ duration: 0.16 }}
      ref={ref}
      aria-label="ยืนยันการเปลี่ยนแปลง"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="store-dialog"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">ยืนยันการเปลี่ยนแปลง</h2>
        <button type="button" aria-label="ปิดหน้าต่าง" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </motion.dialog>
  )
}
