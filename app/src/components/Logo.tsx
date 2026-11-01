import { cn } from '../lib/util'

/**
 * Shop logo from public/brand/bbp-center-logo.png, copied unchanged from the owner's file
 * "โลโก้เกมเมอร์ BBP Center นีออนสีน้ำเงิน - Edited.png" (1254×1254 RGBA, circular, transparent corners).
 * Rendered square with object-contain so proportions never change.
 */
export function Logo({ size = 40, withText = true, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img src="/brand/bbp-center-logo.png" alt={withText ? '' : 'BBP Center'} width={size} height={size} className="shrink-0 rounded-lg object-contain" style={{ width: size, height: size }} />
      {withText && <span className="text-lg font-extrabold tracking-tight">BBP Center</span>}
    </span>
  )
}
