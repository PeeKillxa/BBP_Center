import { motion } from 'motion/react'
import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { Link } from 'react-router'
import { cn } from '../lib/util'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-surface-2 text-ink border border-line hover:border-accent',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-bg',
}
const SIZE = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5', lg: 'h-12 px-6 text-lg' }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: keyof typeof SIZE
  loading?: boolean
  icon?: ReactNode
}

/** Press feedback via scale; disabled buttons should be paired with a visible reason. */
export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium select-none transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...(rest as object)}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </motion.button>
  )
}

export function ButtonLink({ to, variant = 'primary', size = 'md', className, children, icon }: { to: string; variant?: Variant; size?: keyof typeof SIZE; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <Link to={to} className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 active:scale-[0.97]', VARIANT[variant], SIZE[size], className)}>
      {icon}
      {children}
    </Link>
  )
}

export function Card({ className, children, lift, as: As = 'div' }: { className?: string; children: ReactNode; lift?: boolean; as?: 'div' | 'section' | 'article' }) {
  return <As className={cn('rounded-2xl border border-line bg-surface', lift && 'card-lift', className)}>{children}</As>
}

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'
const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  info: 'bg-primary/10 text-primary border-primary/30 dark:text-sky-300',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/40',
  danger: 'bg-danger/10 text-danger border-danger/30',
  accent: 'bg-accent-soft text-accent border-accent/30',
}

/** Status pill: always text + optional icon, never color alone. */
export function Badge({ tone = 'neutral', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', TONE[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

export function Notice({ tone = 'info', icon, title, children, className }: { tone?: Tone; icon?: ReactNode; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div role="note" className={cn('flex gap-3 rounded-xl border p-3 text-sm', TONE[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 text-ink">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-muted">{children}</div>}
      </div>
    </div>
  )
}

export function Field({ label, hint, error, className, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string | null }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn('h-11 rounded-xl border bg-surface px-3 text-ink placeholder:text-muted/70', error ? 'border-danger' : 'border-line focus:border-accent')}
        {...input}
      />
      {error ? <p id={`${id}-err`} className="text-sm text-danger" role="alert">{error}</p> : hint ? <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} aria-hidden />
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <span className="text-muted">{icon}</span>
      <p className="text-lg font-semibold">{title}</p>
      {body && <p className="max-w-md text-sm text-muted">{body}</p>}
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}
