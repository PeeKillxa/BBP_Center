import { Compass } from 'lucide-react'
import { ButtonLink, EmptyState } from '../components/ui'

export function NotFound({ title = 'ไม่พบหน้านี้' }: { title?: string }) {
  return <EmptyState icon={<Compass className="size-10" aria-hidden />} title={title} body="ลิงก์อาจไม่ถูกต้อง หรือรายการนี้ไม่มีอยู่ในข้อมูลสาธิต" action={<ButtonLink to="/">กลับหน้าแรก</ButtonLink>} />
}
