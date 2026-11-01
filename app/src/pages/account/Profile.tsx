import { LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '../../components/feedback'
import { Button, Card, Field, Notice } from '../../components/ui'
import { formatDateTime } from '../../lib/time'
import { setState, useCurrentUser } from '../../store/store'
import { AccountShell } from './AccountNav'

export function Profile() {
  const user = useCurrentUser()
  const toast = useToast()
  const nav = useNavigate()
  const [name, setName] = useState(user?.displayName ?? '')
  const [err, setErr] = useState<string | null>(null)
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setErr('ชื่อที่แสดงอย่างน้อย 2 ตัวอักษร')
    setErr(null)
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === user?.id ? { ...u, displayName: name.trim() } : u)) }))
    toast('success', 'บันทึกโปรไฟล์แล้ว')
  }
  return (
    <AccountShell title="โปรไฟล์">
      <Card className="max-w-xl space-y-4 p-5">
        <form onSubmit={save} className="space-y-4" noValidate>
          <Field label="ชื่อที่แสดง" value={name} onChange={(e) => setName(e.target.value)} error={err} />
          <Field label="อีเมล" value={user?.email ?? ''} readOnly hint="เปลี่ยนอีเมลอยู่นอกขอบเขตต้นแบบ" />
          <p className="text-sm text-muted">สมาชิกตั้งแต่ {user && formatDateTime(user.joinedAt)}</p>
          <Button type="submit">บันทึก</Button>
        </form>
        <Notice tone="neutral">เปลี่ยนรหัสผ่าน และเชื่อมบัญชี Google / Discord อยู่นอกขอบเขตต้นแบบ</Notice>
        <Button variant="secondary" icon={<LogOut className="size-4" aria-hidden />} onClick={() => { setState((s) => ({ ...s, currentUserId: null, viewMode: 'customer' })); nav('/') }}>ออกจากระบบ</Button>
      </Card>
    </AccountShell>
  )
}
