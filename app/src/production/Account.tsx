import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { Card, Button, ButtonLink, Field, Notice, PageHeader } from '../components/ui'
import { OAuthButtons } from '../components/OAuthButtons'
import { formatTHB } from '../lib/money'
import { formatDateTime } from '../lib/time'
import { api, messageFor, type Account as AccountData, type WalletData } from './api'
import { useAction, useRemote, useShop } from './context'

export function SignedIn({ children }: { children: ReactNode }) {
  const { session, loading } = useShop()
  if (loading) return <p role="status">กำลังตรวจสอบบัญชี…</p>
  return session.user ? (
    children
  ) : (
    <Card className="mx-auto max-w-md space-y-4 p-6 text-center">
      <h1 className="text-xl font-bold">เข้าสู่ระบบเพื่อทำรายการ</h1>
      <ButtonLink to="/login">เข้าสู่ระบบ / สมัครสมาชิก</ButtonLink>
    </Card>
  )
}
export function Auth() {
  const { pathname, search } = useLocation(),
    nav = useNavigate(),
    { session, reload } = useShop(),
    action = useAction()
  const register = pathname === '/register'
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('')
  const oauthError = new URLSearchParams(search).get('oauth_error')
  if (session.user) return <Navigate to="/account" replace />
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void action.run(async () => {
      await api(register ? '/auth/register' : '/auth/login', { email, password })
      setPassword('')
      await reload()
      nav('/account')
    })
  }
  return (
    <Card className="mx-auto max-w-md space-y-5 p-6">
      <PageHeader title={register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'} />
      <OAuthButtons />
      <p className="text-center text-sm text-muted">หรือใช้อีเมลและรหัสผ่าน</p>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="อีเมล"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Field
          label="รหัสผ่าน"
          required
          type="password"
          minLength={12}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={register ? 'new-password' : 'current-password'}
          hint="12–128 ตัวอักษร"
        />
        <Button type="submit" loading={action.busy} className="w-full">
          {register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
        </Button>
      </form>
      {(action.error || oauthError) && (
        <p role="alert" className="text-danger">
          {action.error || messageFor(oauthError!)}
        </p>
      )}
      <p className="text-center text-sm">
        <Link className="text-accent underline" to={register ? '/login' : '/register'}>
          {register ? 'มีบัญชีแล้ว เข้าสู่ระบบ' : 'ยังไม่มีบัญชี สมัครสมาชิก'}
        </Link>
      </p>
      <p className="text-xs text-muted">
        หากมีปัญหาเข้าสู่ระบบ ให้ติดต่อร้านผ่าน
        <Link to="/help" className="text-accent underline">
          หน้าช่วยเหลือ
        </Link>
      </p>
    </Card>
  )
}

export function Wallet() {
  return (
    <SignedIn>
      <WalletContent />
    </SignedIn>
  )
}
function WalletContent() {
  const { data, error, reload } = useRemote<WalletData>('/wallet'),
    { catalog } = useShop(),
    action = useAction()
  const [voucher, setVoucher] = useState(''),
    [accepted, setAccepted] = useState(false),
    [message, setMessage] = useState('')
  const { data: health } = useRemote<{ enabled: boolean }>('/health')
  const key = useMemo(() => crypto.randomUUID(), [voucher])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!accepted) return
    void action.run(async () => {
      const result = await api<WalletData & { topup: { status: string; amountSatang: number } }>(
        '/topups/truemoney',
        { voucher: voucher.trim() },
        key,
      )
      setMessage(
        result.topup.status === 'success'
          ? `รับซองสำเร็จ ${formatTHB(result.topup.amountSatang)}`
          : 'รายการกำลังตรวจสอบ กรุณาแจ้งเลขรายการกับร้านและตรวจประวัติก่อนส่งซ้ำ',
      )
      setVoucher('')
      setAccepted(false)
      await reload()
    })
  }
  return (
    <>
      <PageHeader title="กระเป๋าเงินและเติมเงิน" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Card className="p-6">
            <p className="text-muted">ยอดเงินคงเหลือ</p>
            <p className="mt-2 text-4xl font-bold">{data ? formatTHB(data.balanceSatang) : '—'}</p>
            <Button variant="ghost" className="mt-3" onClick={() => void reload()}>
              โหลดประวัติล่าสุด
            </Button>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">ประวัติการเติมเงิน</h2>
            {!data?.topups.length && <p className="text-muted">ยังไม่มีรายการเติมเงิน</p>}
            {data?.topups.map((item) => (
              <div key={item.id} className="space-y-1 border-b border-line py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <b>{formatTHB(item.amountSatang)}</b>
                  <span>
                    {item.status === 'success'
                      ? 'สำเร็จ'
                      : item.status === 'processing'
                        ? 'กำลังตรวจสอบ'
                        : 'รอตรวจสอบกับร้าน'}
                  </span>
                </div>
                <p>{formatDateTime(item.createdAt)}</p>
                <p className="break-all text-xs text-muted">เลขรายการ {item.id}</p>
              </div>
            ))}
          </Card>
        </div>
        <Card className="h-fit space-y-4 p-5">
          <h2 className="text-xl font-bold">เติมเงินด้วยอั่งเปา TrueMoney</h2>
          {!health?.enabled ? (
            <Notice>ช่องทางเติมเงินยังไม่เปิดให้บริการ</Notice>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field
                label="ลิงก์อั่งเปา TrueMoney"
                type="url"
                required
                autoComplete="off"
                value={voucher}
                onChange={(e) => {
                  setVoucher(e.target.value)
                  setAccepted(false)
                }}
              />
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-5 shrink-0"
                  required
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                ฉันยืนยันให้ร้านรับซองนี้เพื่อเติมเข้ากระเป๋าเงิน BBP Center
              </label>
              <Button className="w-full" type="submit" loading={action.busy} disabled={!accepted}>
                ยืนยันรับซองและเติมเงิน
              </Button>
            </form>
          )}
          {catalog?.settings.contactUrl && (
            <a
              href={catalog.settings.contactUrl}
              className="block text-accent underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ติดต่อร้านเกี่ยวกับการเติมเงิน
            </a>
          )}
          {message && <p role="status">{message}</p>}
          {(action.error || error) && (
            <p role="alert" className="text-danger">
              {action.error || error}
            </p>
          )}
          <Link to="/help" className="block text-sm text-accent underline">
            อ่านเงื่อนไขบริการ
          </Link>
        </Card>
      </div>
    </>
  )
}

const JOB_STATUS: Record<string, string> = {
  queued: 'รอคิว',
  'in-progress': 'กำลังดำเนินการ',
  'awaiting-customer': 'รอลูกค้าตอบกลับ',
  completed: 'เสร็จสิ้น',
}
export function Account() {
  return (
    <SignedIn>
      <AccountContent />
    </SignedIn>
  )
}
function AccountContent() {
  const { session, catalog } = useShop(),
    { data, error, reload } = useRemote<AccountData>('/account'),
    { data: wallet } = useRemote<WalletData>('/wallet')
  const { pathname, search } = useLocation(),
    { id } = useParams(),
    action = useAction(),
    nav = useNavigate()
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const settleKeys = useRef<Record<string, string>>({})
  const [now, setNow] = useState(Date.now())
  const serverOffset = useRef(0)
  // Countdown display only; expiry and stock release are enforced by the server.
  useEffect(() => {
    serverOffset.current = catalog ? catalog.serverTime - Date.now() : 0
    setNow(Date.now() + serverOffset.current)
    const timer = window.setInterval(() => setNow(Date.now() + serverOffset.current), 1000)
    return () => window.clearInterval(timer)
  }, [catalog])
  const section = pathname.split('/')[2] ?? 'overview'
  const tabs = [
    ['', 'ภาพรวม'],
    ['orders', 'คำสั่งซื้อ'],
    ['reservations', 'การจอง'],
    ['farm', 'งานฟาร์ม'],
    ['transactions', 'ธุรกรรม'],
    ['profile', 'โปรไฟล์'],
  ]
  const oauthError = new URLSearchParams(search).get('oauth_error')
  const orders = (data?.orders ?? []).filter((item) => !id || item.id === id)
  const reservations = (data?.reservations ?? []).filter((item) => !id || item.id === id)
  const jobs = (data?.farmJobs ?? []).filter((item) => !id || item.id === id)
  return (
    <>
      <PageHeader
        title="บัญชีของฉัน"
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setNow(Date.now() + serverOffset.current)
              void reload()
            }}
          >
            โหลดข้อมูลล่าสุด
          </Button>
        }
      />
      <nav aria-label="เมนูบัญชี" className="mb-6 flex flex-wrap gap-3">
        {tabs.map(([path, text]) => (
          <Link
            key={path}
            to={`/account${path ? `/${path}` : ''}`}
            className="rounded-xl border border-line px-3 py-2 text-sm text-accent"
          >
            {text}
          </Link>
        ))}
      </nav>
      {(error || action.error || oauthError) && (
        <p role="alert" className="mb-4 text-danger">
          {error || action.error || messageFor(oauthError!)}
        </p>
      )}
      {section === 'overview' && (
        <div className="space-y-5">
          <Card className="p-6">
            <p className="break-all">{session.user?.email}</p>
            <p className="mt-3 text-3xl font-bold">{wallet ? formatTHB(wallet.balanceSatang) : '—'}</p>
            <ButtonLink to="/wallet" className="mt-4">
              เติมเงิน / ดูกระเป๋าเงิน
            </ButtonLink>
          </Card>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['คำสั่งซื้อ', data?.orders.length ?? 0],
              ['รายการจอง', data?.reservations.filter((item) => item.status === 'active').length ?? 0],
              ['งานฟาร์ม', data?.farmJobs.filter((item) => item.status !== 'completed').length ?? 0],
            ].map(([label, value]) => (
              <Card key={label} className="p-5">
                <p>{label}</p>
                <b className="text-2xl">{value}</b>
              </Card>
            ))}
          </div>
          {session.user?.isAdmin && <ButtonLink to="/owner">จัดการร้าน</ButtonLink>}
        </div>
      )}
      {section === 'orders' && (
        <div className="space-y-4">
          {!orders.length && <Notice>ไม่พบคำสั่งซื้อ</Notice>}
          {orders.map((order) => (
            <Card key={order.id} className="space-y-3 p-5">
              <h2 className="font-bold">{order.title}</h2>
              <p>
                {formatTHB(order.priceSatang)} · {formatDateTime(order.createdAt)}
              </p>
              <p className="break-all text-xs text-muted">เลขคำสั่งซื้อ {order.id}</p>
              {revealed[order.id] ? (
                <>
                  <pre className="whitespace-pre-wrap break-all rounded-xl bg-surface-2 p-4 font-sans">
                    {revealed[order.id]}
                  </pre>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void action.run(async () => {
                        await navigator.clipboard.writeText(revealed[order.id])
                      })
                    }
                  >
                    คัดลอกข้อมูลส่งมอบ
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setRevealed((current) => {
                        const next = { ...current }
                        delete next[order.id]
                        return next
                      })
                    }
                  >
                    ซ่อนข้อมูล
                  </Button>
                </>
              ) : (
                <Button
                  loading={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      const result = await api<{ delivery: string }>(`/orders/${order.id}/delivery`, {})
                      setRevealed((current) => ({ ...current, [order.id]: result.delivery }))
                    })
                  }
                >
                  เปิดดูข้อมูลส่งมอบ
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
      {section === 'reservations' && (
        <div className="space-y-4">
          {!reservations.length && <Notice>ไม่พบรายการจอง</Notice>}
          {reservations.map((item) => (
            <Card key={item.id} className="space-y-3 p-5">
              <h2 className="font-bold">{item.title}</h2>
              <p>
                ราคาที่จอง {formatTHB(item.priceSatang)} · จ่ายแล้ว {formatTHB(item.depositSatang)}
              </p>
              <p>ครบ 12 ชั่วโมง {formatDateTime(item.holdEndsAt)}</p>
              <p>สิ้นสุดผ่อนผัน {formatDateTime(item.expiresAt)}</p>
              <p>
                สถานะ{' '}
                {item.status === 'active'
                  ? now >= item.holdEndsAt
                    ? 'ช่วงผ่อนผัน'
                    : 'กำลังจอง'
                  : item.status === 'settled'
                    ? 'ชำระครบแล้ว'
                    : 'หมดสิทธิ์และริบเงินจองแล้ว'}
              </p>
              {item.status === 'active' && (
                <>
                  <p>ยอดคงเหลือ {formatTHB(item.priceSatang - item.depositSatang)}</p>
                  <p className="text-sm text-muted">
                    เหลือประมาณ {Math.max(0, Math.ceil((item.expiresAt - now) / 60000))} นาที
                  </p>
                  <Button
                    loading={action.busy}
                    disabled={item.expiresAt <= now}
                    onClick={() =>
                      void action.run(async () => {
                        const result = await api<{ id: string }>(
                          '/reservations/settle',
                          { reservationId: item.id },
                          (settleKeys.current[item.id] ??= crypto.randomUUID()),
                        )
                        await reload()
                        nav(`/account/orders/${result.id}`)
                      })
                    }
                  >
                    ชำระยอดคงเหลือ {formatTHB(item.priceSatang - item.depositSatang)}
                  </Button>
                </>
              )}
              {item.status === 'forfeited' && <p>จองสินค้าเดิมอีกครั้งได้ {formatDateTime(item.cooldownUntil)}</p>}
              {item.orderId && (
                <Link to={`/account/orders/${item.orderId}`} className="block text-accent underline">
                  ดูข้อมูลส่งมอบ
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
      {(section === 'farm' || section === 'notifications') && (
        <div className="space-y-4">
          {!jobs.length && <Notice>ยังไม่มีงานฟาร์ม</Notice>}
          {jobs.map((job) => (
            <Card key={job.id} className="space-y-3 p-5">
              <h2 className="font-bold">ฟาร์มเพชร {job.diamonds.toLocaleString('th-TH')} เพชร</h2>
              <p>
                {JOB_STATUS[job.status]} · {formatTHB(job.priceSatang)}
              </p>
              <p className="break-all text-xs text-muted">เลขงาน {job.id}</p>
              {job.measuredDiamonds !== null && (
                <p>
                  ความคืบหน้าที่ร้านวัดได้ {job.measuredDiamonds.toLocaleString('th-TH')} /{' '}
                  {job.diamonds.toLocaleString('th-TH')} เพชร
                </p>
              )}
              <ol className="space-y-2 border-l border-line pl-4 text-sm">
                {job.timeline.map((event, i) => (
                  <li key={i}>
                    <span className="text-muted">{formatDateTime(event.at)}</span>
                    <p>{event.text}</p>
                  </li>
                ))}
              </ol>
              {catalog?.settings.contactUrl && (
                <a
                  href={catalog.settings.contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  ติดต่อร้านเพื่อประสานงาน
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
      {section === 'transactions' && (
        <div className="space-y-4">
          {!data?.transactions.length && !wallet?.topups.length && <Notice>ยังไม่มีธุรกรรม</Notice>}
          {data?.transactions.map((item) => (
            <Card key={item.id} className="flex flex-wrap justify-between gap-3 p-4">
              <p>
                {
                  (
                    {
                      purchase: 'ซื้อสินค้า',
                      'reservation-deposit': 'เงินจอง',
                      'reservation-remainder': 'ชำระยอดคงเหลือ',
                      'reservation-forfeit': 'ริบเงินจองที่หมดเวลา',
                      'farm-order': 'สั่งฟาร์ม',
                    } as Record<string, string>
                  )[item.kind]
                }
                <span className="block text-xs text-muted">{formatDateTime(item.createdAt)}</span>
              </p>
              <b>{formatTHB(item.amountSatang)}</b>
            </Card>
          ))}
          {wallet?.topups.map((item) => (
            <Card key={item.id} className="flex justify-between p-4">
              <span>เติมเงิน TrueMoney · {item.status === 'success' ? 'สำเร็จ' : 'รอตรวจสอบ'}</span>
              <b>{formatTHB(item.amountSatang)}</b>
            </Card>
          ))}
        </div>
      )}
      {section === 'profile' && (
        <Card className="max-w-xl space-y-4 p-5">
          <PageHeader title="ข้อมูลบัญชี" />
          <p className="break-all">{session.user?.email}</p>
          <p className="break-all text-xs text-muted">รหัสบัญชี: {session.user?.id}</p>
          <OAuthButtons link linked={session.providers} />
          {session.user?.isAdmin && <ButtonLink to="/owner">จัดการร้าน</ButtonLink>}
        </Card>
      )}
    </>
  )
}
