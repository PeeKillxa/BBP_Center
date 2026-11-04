import { useEffect, useState } from 'react'
import { Button } from './ui'

const PROVIDERS = [
  { id: 'google', name: 'Google', logo: '/brand/oauth/google.png' },
  { id: 'discord', name: 'Discord', logo: '/brand/oauth/discord.svg' },
] as const

/** A full navigation begins server-side OAuth; no provider token is handled in the browser. */
export function OAuthButtons({ link = false, linked = [] }: { link?: boolean; linked?: string[] }) {
  const [available, setAvailable] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    fetch('/api/auth/providers', { credentials: 'same-origin' }).then(async response => {
      if (!response.ok) throw new Error()
      const providers = await response.json()
      if (active) setAvailable(providers)
    }).catch(() => { if (active) setError('บริการเข้าสู่ระบบยังไม่พร้อมใช้งาน') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const start = async (provider: string) => {
    if (busy) return
    setBusy(provider); setError('')
    if (!link) { window.location.assign(`/api/auth/oauth/${provider}/start`); return }
    try {
      const response = await fetch(`/api/auth/oauth/${provider}/link`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })
      if (!response.ok) throw new Error()
      const result = await response.json()
      window.location.assign(result.url)
    } catch { setError('เชื่อมบัญชีไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง'); setBusy('') }
  }
  return <div className="space-y-2">
    {PROVIDERS.map(provider => {
      const isLinked = linked.includes(provider.id)
      return <div key={provider.id}>
        <Button type="button" variant="secondary" className="w-full" loading={busy === provider.id}
          icon={<img src={provider.logo} alt="" aria-hidden="true" width={20} height={20} className="size-5 shrink-0 object-contain" />}
          disabled={loading || !available[provider.id] || Boolean(busy) || (link && isLinked)}
          onClick={() => void start(provider.id)} aria-describedby={`oauth-${provider.id}-hint`}>
          {link ? isLinked ? `เชื่อม ${provider.name} แล้ว` : `เชื่อมบัญชี ${provider.name}` : `ดำเนินการต่อด้วย ${provider.name}`}
        </Button>
        <p id={`oauth-${provider.id}-hint`} className="mt-1 text-xs text-muted">
          {loading ? 'กำลังตรวจสอบช่องทาง…' : !available[provider.id] ? 'ร้านยังไม่เปิดช่องทางนี้' : link ? 'ใช้เข้าสู่บัญชีและยอดเงินเดิมได้' : 'เข้าสู่บัญชี BBP Center'}
        </p>
      </div>
    })}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>
}
