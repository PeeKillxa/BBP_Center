import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useToast } from '../../components/feedback'
import { Logo } from '../../components/Logo'
import { Button, Card, Field, Notice } from '../../components/ui'
import { uid } from '../../lib/util'
import { safeNext } from '../../lib/navigation'
import { getState, nowMs, setState } from '../../store/store'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function Shell({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex justify-center"><Logo size={56} /></div>
      <Card className="p-6">
        <h1 className="mb-1 text-2xl font-bold">{title}</h1>
        <Notice tone="warning" className="my-4">โหมดสาธิต: ไม่มีการสร้างบัญชีจริงและไม่บันทึกรหัสผ่าน ห้ามใช้รหัสผ่านจริง</Notice>
        {children}
      </Card>
      <p className="mt-4 text-center text-sm text-muted">{footer}</p>
    </div>
  )
}

/** Social buttons never pretend OAuth succeeded: they say so and sign in as a sample user. */
function SocialButtons({ onDone }: { onDone: (userId: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const go = (p: string) => {
    setBusy(p)
    window.setTimeout(() => {
      setBusy(null)
      onDone('u-a')
    }, 600)
  }
  return (
    <div className="space-y-2">
      {['Google', 'Discord'].map((p) => (
        <Button key={p} type="button" variant="secondary" className="w-full" loading={busy === p} onClick={() => go(p)} aria-describedby="social-demo">
          ดำเนินการต่อด้วย {p} (โหมดสาธิต)
        </Button>
      ))}
      <p id="social-demo" className="text-xs text-muted">ไม่ได้เชื่อม OAuth จริง ปุ่มนี้เข้าสู่ระบบเป็น "ผู้ใช้ตัวอย่าง A"</p>
    </div>
  )
}

const Divider = () => (
  <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />หรือ<span className="h-px flex-1 bg-line" /></div>
)

const useFinish = () => {
  const nav = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  return (userId: string, msg = 'เข้าสู่ระบบแล้ว') => {
    setState((s) => ({ ...s, currentUserId: userId, viewMode: 'customer' }))
    toast('success', msg)
    nav(safeNext(params.get('next')), { replace: true })
  }
}

export function Login() {
  const finish = useFinish()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('demo.a@example.invalid')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<{ email?: string; pw?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = { email: EMAIL.test(email.trim()) ? undefined : 'รูปแบบอีเมลไม่ถูกต้อง', pw: pw.length >= 8 ? undefined : 'รหัสผ่านอย่างน้อย 8 ตัวอักษร' }
    setErr(next)
    if (next.email || next.pw) return
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      const u = getState().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      setPw('')
      if (!u) return setErr({ form: 'ไม่พบบัญชีนี้ในข้อมูลสาธิต ลองใช้ demo.a@example.invalid หรือสมัครสมาชิก' })
      finish(u.id)
    }, 700)
  }
  return (
    <Shell title="เข้าสู่ระบบ" footer={<>ยังไม่มีบัญชี? <Link to={`/register${params.toString() ? `?${params}` : ''}`} className="text-accent underline">สมัครสมาชิก</Link></>}>
      <SocialButtons onDone={(id) => finish(id, 'เข้าสู่ระบบแบบสาธิตแล้ว')} />
      <Divider />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="อีเมล" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err.email} hint="บัญชีสาธิต: demo.a / demo.b / demo.c @example.invalid" />
        <Field label="รหัสผ่าน" type="password" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} error={err.pw} hint="กรอกอะไรก็ได้ 8 ตัวขึ้นไป (ไม่ถูกบันทึก)" />
        {err.form && <p role="alert" className="text-sm text-danger">{err.form}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy} icon={<LogIn className="size-5" aria-hidden />}>เข้าสู่ระบบ</Button>
        <p className="text-center text-sm"><Link to="/forgot" className="text-accent underline">ลืมรหัสผ่าน?</Link></p>
      </form>
    </Shell>
  )
}

export function Register() {
  const finish = useFinish()
  const [f, setF] = useState({ name: '', email: '', pw: '', pw2: '', terms: false })
  const [err, setErr] = useState<Record<string, string | undefined>>({})
  const [busy, setBusy] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const exists = getState().users.some((u) => u.email.toLowerCase() === f.email.trim().toLowerCase())
    const next = {
      name: f.name.trim().length >= 2 ? undefined : 'ชื่อที่แสดงอย่างน้อย 2 ตัวอักษร',
      email: !EMAIL.test(f.email.trim()) ? 'รูปแบบอีเมลไม่ถูกต้อง' : exists ? 'อีเมลนี้มีในข้อมูลสาธิตแล้ว' : undefined,
      pw: f.pw.length >= 8 ? undefined : 'รหัสผ่านอย่างน้อย 8 ตัวอักษร',
      pw2: f.pw2 === f.pw ? undefined : 'รหัสผ่านไม่ตรงกัน',
      terms: f.terms ? undefined : 'กรุณายอมรับเงื่อนไข',
    }
    setErr(next)
    if (Object.values(next).some(Boolean)) return
    setBusy(true)
    window.setTimeout(() => {
      const id = uid('u')
      // Only name + email are kept. The password is discarded.
      setState((s) => ({ ...s, users: [...s.users, { id, displayName: f.name.trim(), email: f.email.trim(), joinedAt: nowMs(), demoNote: 'สร้างระหว่างสาธิต' }] }))
      setF((x) => ({ ...x, pw: '', pw2: '' }))
      setBusy(false)
      finish(id, 'สมัครสมาชิกแบบสาธิตแล้ว')
    }, 700)
  }
  return (
    <Shell title="สมัครสมาชิก" footer={<>มีบัญชีแล้ว? <Link to="/login" className="text-accent underline">เข้าสู่ระบบ</Link></>}>
      <SocialButtons onDone={(id) => finish(id, 'เข้าสู่ระบบแบบสาธิตแล้ว')} />
      <Divider />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="ชื่อที่แสดง" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} autoComplete="nickname" />
        <Field label="อีเมล" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err.email} autoComplete="email" hint="ใช้อีเมลสมมติ เช่น me@example.invalid" />
        <Field label="รหัสผ่าน" type="password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} error={err.pw} autoComplete="off" />
        <Field label="ยืนยันรหัสผ่าน" type="password" value={f.pw2} onChange={(e) => setF({ ...f, pw2: e.target.value })} error={err.pw2} autoComplete="off" />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={f.terms} onChange={(e) => setF({ ...f, terms: e.target.checked })} className="mt-1 size-4" aria-invalid={!!err.terms || undefined} />
          <span>ยอมรับ <Link to="/help" className="text-accent underline">เงื่อนไขการใช้งาน</Link> (เนื้อหารอร้านกำหนด)</span>
        </label>
        {err.terms && <p role="alert" className="text-sm text-danger">{err.terms}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy} icon={<UserPlus className="size-5" aria-hidden />}>สมัครสมาชิก</Button>
      </form>
    </Shell>
  )
}

export function Forgot() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) return setErr('รูปแบบอีเมลไม่ถูกต้อง')
    setErr(null)
    setBusy(true)
    window.setTimeout(() => { setBusy(false); setSent(true) }, 700)
  }
  return (
    <Shell title="ลืมรหัสผ่าน" footer={<Link to="/login" className="text-accent underline">กลับไปเข้าสู่ระบบ</Link>}>
      {sent ? (
        <Notice tone="success" icon={<Mail className="size-4" aria-hidden />} title="จำลองการส่งลิงก์รีเซ็ตแล้ว">
          ต้นแบบไม่ส่งอีเมลจริง ระบบจริงต้องตอบข้อความเดียวกันไม่ว่าจะมีบัญชีหรือไม่ เพื่อไม่เปิดเผยว่าอีเมลนี้สมัครไว้
        </Notice>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="อีเมลที่ใช้สมัคร" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err} autoComplete="email" />
          <Button type="submit" className="w-full" loading={busy} icon={<KeyRound className="size-4" aria-hidden />}>ส่งลิงก์รีเซ็ตรหัสผ่าน (จำลอง)</Button>
        </form>
      )}
    </Shell>
  )
}
