import { MessageCircle } from 'lucide-react'
import { CONTACT } from '../config/rules'

/** LINE / Discord links come from config. While null, buttons are disabled with a visible reason. */
export function ContactButtons() {
  const items = [
    { label: 'LINE', href: CONTACT.line },
    { label: 'Discord', href: CONTACT.discord },
  ]
  return (
    <div className="space-y-2">
      {items.map((i) =>
        i.href ? (
          <a key={i.label} href={i.href} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 font-medium hover:bg-accent-soft">
            <MessageCircle className="size-4" aria-hidden /> ติดต่อผ่าน {i.label}
          </a>
        ) : (
          <button key={i.label} disabled aria-describedby="contact-pending" className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-line font-medium text-muted">
            <MessageCircle className="size-4" aria-hidden /> {i.label} · รอร้านกำหนดช่องทาง
          </button>
        ),
      )}
      <p id="contact-pending" className="text-xs text-muted">ช่องทางติดต่อจริงรอเจ้าของร้านกำหนด ต้นแบบนี้ไม่สร้างลิงก์ปลอม</p>
    </div>
  )
}
