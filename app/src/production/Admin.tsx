import { useEffect, useState, type FormEvent } from 'react'
import { Button, Card, Field, Notice, PageHeader } from '../components/ui'
import { api, type AdminData, type FarmJob, type ShopSettings } from './api'
import { useAction, useRemote, useShop } from './context'
import { SignedIn } from './Account'
import { InventoryTools } from './Inventory'
import { formatTHB, parseBahtInput } from '../lib/money'

const area = 'min-h-28 w-full rounded-xl border border-line bg-surface p-3'
export function Admin() {
  return (
    <SignedIn>
      <AdminContent />
    </SignedIn>
  )
}
function AdminContent() {
  const { session, reload: reloadShop } = useShop()
  if (!session.user?.isAdmin) return <Notice tone="danger">บัญชีนี้ไม่มีสิทธิ์จัดการร้าน</Notice>
  return <AdminAuthorized reloadShop={reloadShop} />
}
function AdminAuthorized({ reloadShop }: { reloadShop: () => Promise<void> }) {
  const { data, error, reload } = useRemote<AdminData>('/admin'),
    action = useAction()
  const [settings, setSettings] = useState<ShopSettings>({ contactUrl: '', terms: '', farmTerms: '', open: false })
  const [tab, setTab] = useState('settings'),
    [message, setMessage] = useState('')
  useEffect(() => {
    if (data) setSettings(data.settings)
  }, [data])
  const saveSettings = (event: FormEvent) => {
    event.preventDefault()
    void action.run(async () => {
      await api('/admin/settings', settings)
      await reload()
      await reloadShop()
      setMessage('บันทึกข้อมูลร้านแล้ว')
    })
  }
  return (
    <>
      <PageHeader title="จัดการร้าน BBP Center" />
      <nav className="mb-5 flex flex-wrap gap-2">
        {[
          ['settings', 'ตั้งค่าร้าน'],
          ['listings', 'สินค้า'],
          ['farm', 'งานฟาร์ม'],
          ['payments', 'ตรวจยอดรับเงิน'],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? 'primary' : 'secondary'}
            onClick={() => {
              setTab(value)
              setMessage('')
            }}
          >
            {label}
          </Button>
        ))}
      </nav>
      {(error || action.error) && (
        <p role="alert" className="mb-4 text-danger">
          {error || action.error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-4 text-success">
          {message}
        </p>
      )}
      {tab === 'settings' && (
        <Card className="max-w-3xl p-6">
          <form onSubmit={saveSettings} className="space-y-4">
            <Field
              label="ลิงก์ติดต่อร้าน (HTTPS)"
              required
              type="url"
              value={settings.contactUrl}
              onChange={(e) => setSettings({ ...settings, contactUrl: e.target.value })}
            />
            <label className="block space-y-2">
              เงื่อนไขร้าน
              <textarea
                required
                className={area}
                value={settings.terms}
                onChange={(e) => setSettings({ ...settings, terms: e.target.value })}
              />
            </label>
            <label className="block space-y-2">
              เงื่อนไขบริการฟาร์ม
              <textarea
                className={area}
                value={settings.farmTerms}
                onChange={(e) => setSettings({ ...settings, farmTerms: e.target.value })}
              />
              <p className="text-xs text-muted">
                ระบุขั้นตอนประสานงาน ยกเลิกและคืนเงินก่อนเปิดรับงาน ถ้าเว้นว่าง ระบบจะปิดการสั่งฟาร์ม
              </p>
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={settings.open}
                onChange={(e) => setSettings({ ...settings, open: e.target.checked })}
              />
              เปิดรับคำสั่งซื้อและเติมเงิน
            </label>
            <Button type="submit" loading={action.busy}>
              บันทึกการตั้งค่า
            </Button>
          </form>
        </Card>
      )}
      {tab === 'listings' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <InventoryTools onSaved={reload} />
          <div className="space-y-3">
            {!data?.listings.length && <Notice>ยังไม่มีสินค้า เพิ่มข้อมูลและภาพจริงทางแบบฟอร์ม</Notice>}
            {data?.listings.map((item) => (
              <Card key={item.id} className="space-y-2 p-4">
                <h2 className="font-bold">{item.title}</h2>
                <InventoryTools template={item} onSaved={reload} />
                <p>
                  {formatTHB(item.priceSatang)} ·{' '}
                  {
                    ({ available: 'พร้อมขาย', reserved: 'จองแล้ว', sold: 'ขายแล้ว', archived: 'หยุดขาย' } as Record<string, string>)[
                      item.status
                    ]
                  }
                </p>
                {item.status === 'available' && <Button variant="secondary" size="sm" loading={action.busy} onClick={() => void action.run(async () => { await api('/admin/listings/archive', { id: item.id }); await reload(); await reloadShop() })}>หยุดขายสินค้านี้</Button>}
              </Card>
            ))}
          </div>
        </div>
      )}
      {tab === 'farm' && (
        <div className="space-y-4">
          {!data?.farmJobs.length && <Notice>ยังไม่มีคำสั่งฟาร์ม</Notice>}
          {data?.farmJobs.map((job) => (
            <FarmEditor key={job.id} job={job} reload={reload} />
          ))}
        </div>
      )}
      {tab === 'payments' && (
        <div className="space-y-4">
          <Notice tone="warning">
            ดำเนินการเฉพาะเมื่อคุณตรวจสอบแล้วว่าเงินเข้ากระเป๋าร้านจริง
            ยอดที่บันทึกจะถูกเพิ่มให้ลูกค้าและมีประวัติตรวจสอบย้อนหลัง
          </Notice>
          {!data?.pendingPayments.length && <p>ไม่มีรายการรอตรวจสอบ</p>}
          {data?.pendingPayments.map((item) => (
            <PaymentEditor key={item.id} id={item.id} email={item.email} reload={reload} />
          ))}
        </div>
      )}
    </>
  )
}
function FarmEditor({ job, reload }: { job: FarmJob; reload: () => Promise<void> }) {
  const [status, setStatus] = useState(job.status),
    [measured, setMeasured] = useState(job.measuredDiamonds?.toString() ?? ''),
    [note, setNote] = useState(''),
    action = useAction()
  return (
    <Card className="space-y-3 p-5">
      <h2 className="font-bold">
        {job.diamonds.toLocaleString('th-TH')} เพชร · {job.email}
      </h2>
      <p className="break-all text-xs text-muted">เลขงาน {job.id}</p>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          void action.run(async () => {
            await api('/admin/farm', {
              id: job.id,
              status,
              measuredDiamonds: measured === '' ? null : Number(measured),
              note,
            })
            setNote('')
            await reload()
          })
        }}
      >
        <label>
          สถานะ
          <select
            className="h-11 w-full rounded-xl border border-line bg-surface px-3"
            value={status}
            disabled={job.status === 'completed'}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="queued">รอคิว</option>
            <option value="in-progress">กำลังดำเนินการ</option>
            <option value="awaiting-customer">รอลูกค้าตอบกลับ</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>
        </label>
        <Field
          label="จำนวนเพชรที่วัดได้"
          type="number"
          min="0"
          max={job.diamonds}
          value={measured}
          onChange={(e) => setMeasured(e.target.value)}
          disabled={job.status === 'completed'}
        />
        <Field
          label="ข้อความถึงลูกค้า"
          hint="ข้อความนี้แสดงให้ลูกค้าเห็น ห้ามใส่รหัสผ่านหรือรหัสยืนยัน"
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={job.status === 'completed'}
        />
        <Button type="submit" loading={action.busy} disabled={job.status === 'completed'}>
          บันทึกความคืบหน้า
        </Button>
      </form>
      {action.error && (
        <p role="alert" className="text-danger">
          {action.error}
        </p>
      )}
    </Card>
  )
}
function PaymentEditor({ id, email, reload }: { id: string; email: string; reload: () => Promise<void> }) {
  const [amount, setAmount] = useState(''),
    [receipt, setReceipt] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    action = useAction()
  return (
    <Card className="space-y-3 p-5">
      <p>{email}</p>
      <p className="break-all text-xs">เลขรายการ {id}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void action.run(async () => {
            await api('/admin/payments/reconcile', { id, amountSatang: parseBahtInput(amount), receipt, confirmed })
            await reload()
          })
        }}
        className="space-y-3"
      >
        <Field
          label="ยอดที่รับเงินจริง (บาท)"
          required
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Field label="เลขอ้างอิงหลักฐานรับเงิน" required value={receipt} onChange={(e) => setReceipt(e.target.value)} />
        <label className="flex gap-2">
          <input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          ยืนยันว่าตรวจสอบเงินเข้าร้านแล้ว
        </label>
        <Button type="submit" loading={action.busy} disabled={!confirmed}>
          บันทึกยอดที่รับจริง
        </Button>
      </form>
      {action.error && (
        <p role="alert" className="text-danger">
          {action.error}
        </p>
      )}
    </Card>
  )
}
