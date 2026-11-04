import { useRef, useState, type FormEvent } from 'react'
import { Plus, Upload } from 'lucide-react'
import { Button, Card, Field } from '../components/ui'
import { api, type Listing } from './api'
import { useAction, useShop } from './context'
import { parseBahtInput } from '../lib/money'
import { idempotencyKey } from '../lib/idempotency'

const area = 'min-h-28 w-full rounded-xl border border-line bg-surface p-3'

export function InventoryTools({ mapId, template, onSaved }: { mapId?: string; template?: Listing; onSaved?: () => Promise<void> }) {
  const { session, reload } = useShop()
  const [panel, setPanel] = useState<'category' | 'listing' | null>(null)
  const [name, setName] = useState(''), [message, setMessage] = useState('')
  const category = useAction()
  if (!session.user?.isAdmin) return null
  const done = async (count: number) => {
    setPanel(null)
    setMessage(`เพิ่มสต็อกแล้ว ${count} บัญชี`)
    await reload()
    await onSaved?.()
  }
  return <section className="my-5 space-y-3" aria-label="จัดการสินค้าสำหรับแอดมิน">
    <div className="flex flex-wrap gap-2">
      {!template && <Button variant="secondary" size="sm" icon={<Plus size={16} aria-hidden />} aria-expanded={panel === 'category'} onClick={() => { setPanel(panel === 'category' ? null : 'category'); setMessage('') }}>เพิ่มหมวดหมู่</Button>}
      <Button size="sm" icon={<Plus size={16} aria-hidden />} aria-expanded={panel === 'listing'} onClick={() => { setPanel(panel === 'listing' ? null : 'listing'); setMessage('') }}>{template ? 'เติมสต็อก' : 'เพิ่มสินค้า / ไอดี'}</Button>
    </div>
    {message && <p role="status" className="text-success">{message}</p>}
    {panel === 'category' && <Card className="max-w-xl p-5">
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void category.run(async () => { await api('/admin/categories', { name }); setName(''); setPanel(null); setMessage('เพิ่มหมวดหมู่แล้ว'); await reload() }) }}>
        <Field label="ชื่อหมวดหมู่" required maxLength={80} value={name} onChange={e => setName(e.target.value)} />
        <div className="flex gap-2"><Button type="submit" loading={category.busy}>บันทึกหมวดหมู่</Button><Button type="button" variant="ghost" disabled={category.busy} onClick={() => setPanel(null)}>ยกเลิก</Button></div>
        {category.error && <p role="alert" className="text-danger">{category.error}</p>}
      </form>
    </Card>}
    {panel === 'listing' && <Card className="max-w-3xl p-5"><ListingForm mapId={mapId} template={template} onSaved={done} onCancel={() => setPanel(null)} /></Card>}
  </section>
}

export function ListingForm({ mapId, template, onSaved, onCancel }: { mapId?: string; template?: Listing; onSaved: (count: number) => Promise<void>; onCancel?: () => void }) {
  const { catalog } = useShop()
  const action = useAction(), upload = useAction()
  const [draft, setDraft] = useState({ title: '', mapId: mapId && mapId !== 'all' ? mapId : catalog?.maps[0]?.id ?? '', price: '', description: '', attributes: '', transferTerms: '', warranty: '' })
  const [images, setImages] = useState<string[]>([]), [imageUrl, setImageUrl] = useState('')
  const [bulk, setBulk] = useState(Boolean(template)), [delivery, setDelivery] = useState('')
  // Preserve the key for an identical retry even if the server response was lost.
  const pending = useRef<{ payload: string; key: string } | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void action.run(async () => {
      const deliveries = bulk ? delivery.split(/\r?\n/).map(line => line.trim()).filter(Boolean) : [delivery.trim()]
      if (!deliveries.length || deliveries.length > 100) throw new Error('ใส่ข้อมูล 1–100 บัญชีต่อครั้ง')
      const priceSatang = parseBahtInput(draft.price)
      if (!template && (priceSatang === null || images.length === 0)) throw new Error('ใส่ราคาและรูปสินค้าอย่างน้อย 1 รูป')
      const attributes = draft.attributes.split('\n').filter(line => line.trim()).map(line => { const [label, ...values] = line.split(':'); return { label: label.trim(), value: values.join(':').trim() } })
      const input = template ? { templateId: template.id, deliveries } : { ...draft, priceSatang, images, attributes, deliveries }
      const payload = JSON.stringify(input)
      if (pending.current?.payload !== payload) pending.current = { payload, key: idempotencyKey() }
      const result = await api<{ count: number }>('/admin/stock', input, pending.current.key)
      setDelivery('')
      pending.current = null
      setSavedCount(result.count)
      await onSaved(result.count)
    })
  }
  if (savedCount !== null) return <p role="status" className="text-success">เพิ่มสต็อกแล้ว {savedCount} บัญชี</p>
  return <form onSubmit={submit} className="space-y-4">
    <h2 className="text-xl font-bold">{template ? `เติมสต็อก: ${template.title}` : 'เพิ่มสินค้า'}</h2>
    <fieldset disabled={action.busy || upload.busy} className="space-y-4">
      {!template && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อสินค้า" required maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          <label className="space-y-2">หมวดหมู่<select aria-label="หมวดหมู่" required className="h-11 w-full rounded-xl border border-line bg-surface px-3" value={draft.mapId} onChange={e => setDraft({ ...draft, mapId: e.target.value })}>{catalog?.maps.map(map => <option key={map.id} value={map.id}>{map.name}</option>)}</select></label>
          <Field label="ราคา / บัญชี (บาท)" required inputMode="decimal" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} />
        </div>
        <div className="space-y-3 rounded-xl border border-line p-4">
          <label className="block space-y-2"><span className="flex items-center gap-2 font-medium"><Upload size={18} aria-hidden />อัปโหลดรูปสินค้า</span>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" onChange={event => {
              const files = Array.from(event.target.files ?? []); event.target.value = ''
              void upload.run(async () => {
                if (images.length + files.length > 8) throw new Error('เพิ่มรูปได้สูงสุด 8 รูป')
                for (const file of files) {
                  if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('ใช้รูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB')
                  const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('อ่านรูปไม่สำเร็จ')); reader.readAsDataURL(file) })
                  const result = await api<{ url: string }>('/admin/images', { data })
                  setImages(previous => [...previous, result.url])
                }
              })
            }} />
          </label>
          <p className="text-xs text-muted">JPG, PNG, WebP ไม่เกิน 5 MB ต่อรูป · สูงสุด 8 รูป · รูปแรกเป็นหน้าปก</p>
          {upload.busy && <p role="status">กำลังอัปโหลดรูป…</p>}
          {images.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((src, index) => <div key={`${src}-${index}`} className="space-y-1"><img src={src} alt={`ภาพสินค้า ${index + 1}`} className="aspect-video w-full rounded-lg object-cover" /><Button type="button" size="sm" variant="ghost" aria-label={`นำภาพ ${index + 1} ออก`} onClick={() => setImages(images.filter((_, i) => i !== index))}>นำออก</Button></div>)}</div>}
          <details><summary className="cursor-pointer text-sm text-muted">หรือใช้ลิงก์รูป HTTPS</summary><div className="mt-2 flex flex-wrap items-end gap-2"><Field label="ลิงก์รูป" type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} /><Button type="button" variant="secondary" disabled={images.length >= 8 || !/^https:\/\//.test(imageUrl)} onClick={() => { setImages([...images, imageUrl.trim()]); setImageUrl('') }}>เพิ่มรูป</Button></div></details>
        </div>
        {([['description', 'รายละเอียดสินค้า'], ['attributes', 'คุณสมบัติ (ชื่อ:ค่า หนึ่งรายการต่อบรรทัด)'], ['transferTerms', 'เงื่อนไขการโอน'], ['warranty', 'เงื่อนไขการรับประกัน']] as const).map(([key, label]) => <label className="block space-y-2" key={key}>{label}<textarea className={area} maxLength={5000} required={key !== 'attributes'} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
      </>}
      {template && <p className="text-sm text-muted">ใช้รูป ราคา และรายละเอียดเดิม เพิ่มเฉพาะข้อมูลส่งมอบของบัญชีใหม่</p>}
      <label className="flex items-start gap-2"><input type="checkbox" checked={bulk} onChange={e => setBulk(e.target.checked)} className="mt-1" />หลายบัญชีที่มีของเหมือนกัน (ไอดีไก่ตัน)</label>
      <label className="block space-y-2"><span>{bulk ? 'ข้อมูลส่งมอบ: 1 บัญชีต่อบรรทัด' : 'ข้อมูลส่งมอบของบัญชี'}</span><textarea className={area} required autoComplete="off" spellCheck={false} value={delivery} onChange={e => setDelivery(e.target.value)} placeholder={bulk ? 'ชื่อผู้ใช้:รหัสผ่าน\nชื่อผู้ใช้:รหัสผ่าน' : 'ไอดี รหัสผ่าน และคำแนะนำสำหรับผู้ซื้อ'} /></label>
      <p className="text-xs text-muted">{bulk ? 'สูงสุด 100 บัญชีต่อครั้ง แสดงรวมเป็นสินค้าเดียวและขายแยกครั้งละบัญชี ' : ''}ข้อมูลนี้เปิดให้เฉพาะผู้ซื้อที่ชำระครบ</p>
      <div className="flex flex-wrap gap-2"><Button type="submit" loading={action.busy} disabled={upload.busy}>บันทึก {bulk ? delivery.split(/\r?\n/).filter(line => line.trim()).length : 1} บัญชี</Button>{onCancel && <Button type="button" variant="ghost" onClick={onCancel}>ยกเลิก</Button>}</div>
    </fieldset>
    {(action.error || upload.error) && <p role="alert" className="text-danger">{action.error || upload.error}</p>}
  </form>
}

export function groupListings(listings: Listing[]) {
  const groups = new Map<string, Listing & { stock: number }>()
  const priority: Record<string, number> = { available: 3, reserved: 2, sold: 1 }
  for (const listing of listings) {
    const key = listing.groupId ?? listing.id, current = groups.get(key)
    const stock = (current?.stock ?? 0) + (listing.status === 'available' ? 1 : 0)
    groups.set(key, { ...(current && (priority[current.status] ?? 0) >= (priority[listing.status] ?? 0) ? current : listing), stock })
  }
  return [...groups.values()]
}
