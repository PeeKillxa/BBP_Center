import { ChevronDown, CircleHelp, FileText, ShieldCheck } from 'lucide-react'
import { ContactButtons } from '../components/ContactButtons'
import { Card, Notice, PageHeader } from '../components/ui'

const QA = [
  ['ต้องสมัครสมาชิกก่อนดูสินค้าไหม', 'ไม่ต้อง ดูสินค้าและบริการได้ทันที แต่ต้องเข้าสู่ระบบก่อนเติมเงิน ซื้อ จอง หรือสั่งฟาร์ม'],
  ['ยอดเงินในกระเป๋าเป็นหน่วยอะไร', 'เป็นเงินบาท ไม่ใช่เครดิตที่มีอัตราแลกเปลี่ยน'],
  ['การจองทำงานอย่างไร', 'ชำระเงินจอง 50% เพื่อล็อกสินค้าและราคา 12 ชั่วโมง และมีช่วงผ่อนผันอัตโนมัติอีก 2 ชั่วโมง ชำระยอดคงเหลือทันเวลาจึงได้รับสินค้า'],
  ['ถ้าชำระยอดคงเหลือไม่ทันจะเกิดอะไรขึ้น', 'ครบ 14 ชั่วโมงแล้วยังไม่ชำระ เงินจองจะถูกริบทั้งหมด ไม่คืนเข้ากระเป๋า สินค้ากลับมาพร้อมขาย และคุณจองรายการเดิมซ้ำไม่ได้ 6 ชั่วโมง แต่ยังซื้อเต็มจำนวนได้ถ้าสินค้าพร้อมขาย'],
  ['เวลาฟาร์มที่แสดงคืออะไร', 'เป็นเวลาฟาร์มประมาณสำหรับฟาร์มเพชร Anime Adventures เท่านั้น ไม่รวมเวลารอคิว เวลารอยืนยันการเข้าสู่ระบบ และเหตุขัดข้อง และไม่ใช่เวลารับประกันส่งงาน'],
  ['ร้านจะขอข้อมูลอะไรบ้างสำหรับงานฟาร์ม', 'ในต้นแบบใช้ข้อมูลสมมติเท่านั้น ร้านจะไม่ขอ backup codes, session cookies หรือให้ปิด 2FA วิธีส่งข้อมูลในระบบจริงยังรอร้านกำหนด'],
]

export function FAQ() {
  return (
    <div className="space-y-2">
      {QA.map(([q, a]) => (
        <details key={q} className="group rounded-xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium">
            {q}
            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="px-4 pb-4 text-sm text-muted">{a}</p>
        </details>
      ))}
    </div>
  )
}

const PENDING = [
  'ขั้นตอนและระยะเวลาการโอนบัญชีหลังซื้อ',
  'รายละเอียดการรับประกันไอดี',
  'นโยบายคืนเงินและยกเลิกคำสั่งซื้อหรืองานฟาร์ม',
  'กรณีร้านส่งมอบไม่ได้ หรือระบบขัดข้องระหว่างจอง',
]

export function Help() {
  return (
    <>
      <PageHeader title="ช่วยเหลือ เงื่อนไขการโอน และการรับประกัน" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="hp-faq">
            <h2 id="hp-faq" className="mb-3 flex items-center gap-2 text-xl font-bold"><CircleHelp className="size-5 text-accent" aria-hidden /> คำถามที่พบบ่อย</h2>
            <FAQ />
          </section>
          <section aria-labelledby="hp-tr">
            <h2 id="hp-tr" className="mb-3 flex items-center gap-2 text-xl font-bold"><FileText className="size-5 text-accent" aria-hidden /> เงื่อนไขการโอนบัญชี</h2>
            <Card className="p-5"><p className="text-muted">รอเจ้าของร้านใส่ข้อความ</p></Card>
          </section>
          <section aria-labelledby="hp-wr">
            <h2 id="hp-wr" className="mb-3 flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-5 text-accent" aria-hidden /> การรับประกัน</h2>
            <Card className="p-5"><p className="text-muted">ร้านกำลังจัดทำรายละเอียด</p></Card>
          </section>
          <Notice tone="warning" title="นโยบายที่ยังรอร้านกำหนด">
            <ul className="mt-1 list-disc pl-5">{PENDING.map((p) => <li key={p}>{p}</li>)}</ul>
          </Notice>
        </div>
        <Card className="h-fit space-y-3 p-5">
          <h2 className="font-bold">ติดต่อร้าน</h2>
          <ContactButtons />
          <p className="text-xs text-muted">BBP Center ไม่ใช่ร้านทางการและไม่ได้รับการรับรองจาก Roblox</p>
        </Card>
      </div>
    </>
  )
}
