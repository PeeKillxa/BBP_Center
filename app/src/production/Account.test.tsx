import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Wallet } from './Account'
import { ShopProvider } from './context'

describe('OAuth callback feedback', () => {
  it('shows the failure before the wallet session gate resolves', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/wallet?oauth_error=oauth-account-exists']}>
        <ShopProvider><Wallet /></ShopProvider>
      </MemoryRouter>,
    )
    expect(html).toContain('มีบัญชีอีเมลนี้แล้ว ให้เข้าบัญชีเดิมและกดเชื่อมบัญชี Google/Discord')
    expect(html).toContain('/login?oauth_error=oauth-account-exists')
    expect(html).toContain('กำลังตรวจสอบบัญชี')
  })

  it('does not render an OAuth failure on a normal wallet visit', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/wallet']}>
        <ShopProvider><Wallet /></ShopProvider>
      </MemoryRouter>,
    )
    expect(html).not.toContain('กลับไปหน้าเข้าสู่ระบบ')
    expect(html).toContain('กำลังตรวจสอบบัญชี')
  })
})
