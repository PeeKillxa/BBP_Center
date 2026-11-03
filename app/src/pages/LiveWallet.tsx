import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Gift, RefreshCw, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { Button, Card, Field, Notice, PageHeader } from '../components/ui'
import { OAuthButtons } from '../components/OAuthButtons'
import { formatTHB } from '../lib/money'
import { formatDateTime } from '../lib/time'

type Topup = { id: string; status: string; amountSatang: number; createdAt: number }
type Account = { user: { id: string; email: string }; balanceSatang: number; topups: Topup[] }
const ERROR: Record<string, string> = {
  'invalid-credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสผ่าน 12–128 ตัวอักษร)',
  'registration-unavailable': 'สมัครด้วยอีเมลนี้ไม่ได้ ลองเข้าสู่ระบบหรือติดต่อร้าน',
  'authentication-required': 'กรุณาเข้าสู่ระบบกระเป๋าเงินจริง',
  'invalid-voucher': 'ลิงก์หรือรหัสซองไม่ถูกต้อง',
  'voucher-already-submitted': 'ซองนี้ถูกส่งตรวจแล้ว กรุณาตรวจประวัติหรือติดต่อร้าน',
  'idempotency-conflict': 'รายการเดิมใช้กับซองอื่นแล้ว กรุณาเริ่มรายการใหม่',
  'not-configured': 'ร้านยังไม่เปิดรับซองเงินจริง',
  'rate-limited': 'ทำรายการถี่เกินไป กรุณารอสักครู่',
  'oauth-not-configured': 'ร้านยังไม่เปิดใช้ช่องทางเข้าสู่ระบบนี้',
  'oauth-invalid-state': 'คำขอเข้าสู่ระบบหมดอายุหรือไม่ตรงกับเบราว์เซอร์ กรุณาลองอีกครั้ง',
  'oauth-denied': 'ยกเลิกการเข้าสู่ระบบแล้ว',
  'oauth-account-exists': 'มีบัญชีอีเมลนี้แล้ว กรุณาเข้าบัญชีเดิม แล้วกดเชื่อม Google/Discord เพื่อใช้ยอดเงินเดิม',
  'oauth-already-linked': 'บัญชีผู้ให้บริการนี้เชื่อมกับบัญชีอื่นแล้ว',
  'oauth-link-expired': 'เซสชันสำหรับเชื่อมบัญชีหมดอายุ กรุณาเข้าสู่ระบบใหม่',
  'oauth-email-unverified': 'กรุณายืนยันอีเมลกับ Google/Discord ก่อนเข้าสู่ระบบ',
  'oauth-failed': 'เข้าสู่ระบบกับผู้ให้บริการไม่สำเร็จ กรุณาลองใหม่',
}
async function api(path: string, data?: object, key?: string) {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: data ? 'POST' : 'GET', credentials: 'same-origin',
      headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    })
  } catch { throw new Error('เชื่อมต่อร้านไม่ได้ ลองโหลดประวัติก่อนส่งซองอีกครั้ง') }
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) throw new Error(ERROR[result?.error] ?? 'เชื่อมต่อบริการไม่ได้ กรุณาลองใหม่ภายหลัง')
  return result
}

export function LiveWallet() {
  const [account, setAccount] = useState<Account | null>(null)
  const [linked, setLinked] = useState<string[]>([])
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [voucher, setVoucher] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(() => new URLSearchParams(window.location.search).get('oauth') === 'success' ? 'เข้าสู่ระบบ / เชื่อมบัญชีสำเร็จ' : '')
  const [error, setError] = useState(() => ERROR[new URLSearchParams(window.location.search).get('oauth_error') ?? ''] ?? '')
  const attempt = useRef<{ input: string; key: string } | null>(null)
  const refresh = async () => {
    try {
      const session = await api('/auth/session')
      if (!session.user) { setAccount(null); setLinked([]); return }
      setAccount(await api('/wallet'))
      setLinked(session.providers)
    } catch { setAccount(null); setLinked([]) }
  }
  useEffect(() => {
    let active = true
    api('/health').then(result => { if (active) { setEnabled(result.enabled); setLoaded(true) } })
      .catch(() => { if (active) { setLoaded(true); setError('บริการกระเป๋าเงินยังไม่พร้อมใช้งาน') } })
    void refresh()
    return () => { active = false }
  }, [])
  const authenticate = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      await api(register ? '/auth/register' : '/auth/login', { email, password })
      setPassword(''); await refresh()
    } catch (failure) { setError((failure as Error).message) }
    finally { setBusy(false) }
  }
  const redeem = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !accepted) return
    const input = voucher.trim()
    if (!attempt.current || attempt.current.input !== input) attempt.current = { input, key: crypto.randomUUID() }
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await api('/topups/truemoney', { voucher: input }, attempt.current.key)
      setAccount(result)
      setVoucher(''); setAccepted(false); attempt.current = null
      setMessage(result.topup.status === 'success' ? `รับซองสำเร็จ เพิ่มยอด ${formatTHB(result.topup.amountSatang)}` : 'รายการกำลังตรวจสอบ หากยอดยังไม่เข้า กรุณาติดต่อร้านและแจ้งเลขรายการ ห้ามส่งซองซ้ำ')
    } catch (failure) { setError((failure as Error).message) }
    finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title="กระเป๋าเงินจริง" subtitle="รับซอง TrueMoney และดูประวัติยอดเงิน" />
      <Notice tone="warning" title="อ่านก่อนเติมเงิน" className="mb-6">
        ยอดนี้เป็นเงินจริงและแยกจากยอดสาธิต สินค้าและบริการในเว็บยังเป็นเดโม จึงยังใช้ยอดนี้ซื้อสินค้าไม่ได้ กรุณาติดต่อร้านก่อนเติมเงิน
      </Notice>
      {error && <p role="alert" className="mb-4 text-danger">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl border border-line p-4">{message}</p>}
      {!loaded ? <p role="status">กำลังเชื่อมต่อ…</p> : !account ? (
        <Card className="mx-auto max-w-md p-5">
          <h2 className="mb-4 text-lg font-bold">{register ? 'สมัครบัญชีกระเป๋าเงินจริง' : 'เข้าสู่ระบบกระเป๋าเงินจริง'}</h2>
          <p className="mb-4 text-sm text-muted">บัญชีนี้แยกจากบัญชีสาธิต</p>
          <OAuthButtons />
          <p className="my-4 text-center text-xs text-muted">หรือใช้อีเมลและรหัสผ่าน</p>
          <form className="space-y-4" onSubmit={authenticate}>
            <Field label="อีเมล" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            <Field label="รหัสผ่าน" type="password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} hint="12–128 ตัวอักษร" />
            <Button type="submit" loading={busy} className="w-full">{register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => { setRegister(!register); setPassword(''); setError('') }}>{register ? 'มีบัญชีแล้ว เข้าสู่ระบบ' : 'ยังไม่มีบัญชี สมัครสมาชิก'}</Button>
          </form>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Card className="p-6">
              <p className="flex items-center gap-2 text-muted"><Wallet className="size-4" aria-hidden />ยอดเงินจริงคงเหลือ</p>
              <p className="my-3 text-4xl font-bold tabular-nums">{formatTHB(account.balanceSatang)}</p>
              <p className="break-all text-sm text-muted">{account.user.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" loading={busy} onClick={async () => { setBusy(true); await refresh(); setBusy(false) }} icon={<RefreshCw className="size-4" aria-hidden />}>โหลดประวัติ</Button>
                <Button variant="ghost" disabled={busy} onClick={async () => {
                  setBusy(true)
                  try { await api('/auth/logout', {}); setAccount(null); setMessage(''); setVoucher(''); attempt.current = null }
                  catch (failure) { setError((failure as Error).message) }
                  finally { setBusy(false) }
                }}>ออกจากระบบ</Button>
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 font-bold">ช่องทางเข้าสู่บัญชีนี้</h2>
              <OAuthButtons link linked={linked} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 font-bold">ประวัติรับซอง</h2>
              {!account.topups.length ? <p className="text-sm text-muted">ยังไม่มีรายการ</p> : <ul className="divide-y divide-line">
                {account.topups.map(item => <li key={item.id} className="space-y-1 py-3 text-sm">
                  <p className="flex justify-between gap-3"><span>{item.status === 'success' ? 'สำเร็จ' : item.status === 'processing' ? 'กำลังตรวจ' : 'รอตรวจสอบกับร้าน'}</span><b>{formatTHB(item.amountSatang)}</b></p>
                  <p className="text-muted">{formatDateTime(item.createdAt)}</p><p className="break-all text-xs text-muted">เลขรายการ {item.id}</p>
                </li>)}
              </ul>}
            </Card>
          </div>
          <Card className="h-fit p-5">
            <h2 className="mb-4 flex items-center gap-2 font-bold"><Gift className="size-5 text-accent" aria-hidden />รับซอง TrueMoney</h2>
            {!enabled ? <Notice title="ร้านยังไม่เปิดรับซองเงินจริง">กรุณารอร้านเปิดบริการก่อนส่งซอง</Notice> : <form onSubmit={redeem} className="space-y-4">
              <Field label="ลิงก์อั่งเปา TrueMoney" required type="url" value={voucher} onChange={e => { setVoucher(e.target.value); setAccepted(false) }} placeholder="https://gift.truemoney.com/campaign/?v=…" autoComplete="off" />
              <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={accepted} onChange={e => setAccepted(e.target.checked)} required /><span>ฉันยืนยันให้ร้านรับซองนี้เข้ากระเป๋าเงินจริง และทราบว่ายังใช้ซื้อสินค้าเดโมไม่ได้</span></label>
              <Button type="submit" className="w-full" loading={busy} disabled={!accepted || !voucher.trim()}>ยืนยันรับซองเงินจริง</Button>
              <p className="text-xs text-muted">ยอดเงินจะเพิ่มตามจำนวนที่รับสำเร็จ หากไม่ทราบผลให้ตรวจประวัติและติดต่อร้านก่อนส่งใหม่</p>
            </form>}
          </Card>
        </div>
      )}
      <p className="mt-6 text-sm"><Link to="/wallet" className="text-accent underline">กลับกระเป๋าสาธิต</Link></p>
    </>
  )
}
