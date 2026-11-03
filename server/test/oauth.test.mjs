import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { generateKeyPair, SignJWT } from 'jose'
import { createApi } from '../src/api.mjs'
import { openDatabase } from '../src/payments.mjs'
import { verifyGoogleToken } from '../src/oauth.mjs'
import { digest } from '../src/sessions.mjs'

const origin = 'http://localhost:5173'
const config = {
  google: { clientId: 'test-google-client', clientSecret: 'mock-google-secret' },
  discord: { clientId: 'test-discord-client', clientSecret: 'mock-discord-secret' },
}
async function fixture(overrides = {}) {
  const db = openDatabase(':memory:')
  const calls = []
  let googleEmail = 'google@example.invalid'
  let discordEmail = 'discord@example.invalid'
  let discordSubject = '123456789012345678'
  const server = createApi({ db, origin, enabled: false, receive: () => { throw new Error('payments not used') }, oauthOptions: {
    config,
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      if (url === 'https://discord.com/api/v10/users/@me') return { ok: true, json: async () => ({ id: discordSubject, email: discordEmail, verified: true }) }
      return { ok: true, json: async () => ({ id_token: 'mock-signed-token', access_token: 'mock-access-token', token_type: 'Bearer' }) }
    },
    verifyGoogle: async () => ({ subject: 'google-subject-1', email: googleEmail, verified: true }),
    ...overrides,
  } })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const request = (path, { cookie, data, headers } = {}) => fetch(base + path, {
    redirect: 'manual', method: data ? 'POST' : 'GET', headers: { Origin: origin, ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: data ? JSON.stringify(data) : undefined,
  })
  const start = async (provider, linkCookie) => {
    const response = await request(`/api/auth/oauth/${provider}/${linkCookie ? 'link' : 'start'}`, linkCookie ? { cookie: linkCookie, data: {} } : {})
    const url = new URL(linkCookie ? (await response.json()).url : response.headers.get('location'))
    return { response, url, cookie: response.headers.getSetCookie()[0].split(';')[0] }
  }
  const finish = (provider, flow, extra = '', cookie = flow.cookie) => request(`/api/auth/oauth/${provider}/callback?state=${flow.url.searchParams.get('state')}&code=test-authorization-code&iss=${encodeURIComponent(provider === 'google' ? 'https://accounts.google.com' : 'https://discord.com')}${extra}`, { cookie })
  return { db, calls, request, start, finish,
    setEmails: (google, discord = discordEmail) => { googleEmail = google; discordEmail = discord },
    setDiscordSubject: value => { discordSubject = value },
    close: async () => { await new Promise(resolve => server.close(resolve)); db.close() },
  }
}

test('both providers request minimum login scopes, exact callbacks and PKCE; secrets stay on server', async () => {
  const f = await fixture()
  try {
    assert.deepEqual(await (await f.request('/api/auth/providers')).json(), { google: true, discord: true })
    for (const provider of ['google', 'discord']) {
      const flow = await f.start(provider)
      assert.equal(flow.response.status, 303)
      assert.equal(flow.url.searchParams.get('redirect_uri'), `${origin}/api/auth/oauth/${provider}/callback`)
      assert.equal(flow.url.searchParams.get('code_challenge_method'), 'S256')
      assert.equal(flow.url.searchParams.get('scope'), provider === 'google' ? 'openid email profile' : 'identify email')
      assert.ok(!flow.url.searchParams.has('client_secret'))
      assert.ok(flow.response.headers.get('set-cookie').includes('SameSite=Lax'))
      const attempt = f.db.prepare('SELECT * FROM oauth_attempts WHERE state_hash=?').get(digest(flow.url.searchParams.get('state')))
      assert.equal(flow.url.searchParams.get('code_challenge'), createHash('sha256').update(attempt.verifier).digest('base64url'))
      const finished = await f.finish(provider, flow)
      assert.equal(finished.headers.get('location'), '/wallet/live?oauth=success')
      const cookie = finished.headers.getSetCookie().find(value => value.startsWith('bbp_session=')).split(';')[0]
      const session = await (await f.request('/api/auth/session', { cookie })).json()
      assert.deepEqual(session.providers, [provider])
      const wallet = await (await f.request('/api/wallet', { cookie })).json()
      assert.equal(wallet.balanceSatang, 0)
      assert.ok(!JSON.stringify(wallet).includes('mock-access-token'))
      const exchange = f.calls.find(call => call.url.includes(provider === 'google' ? 'googleapis.com/token' : '/oauth2/token'))
      assert.equal(exchange.options.body.get('code_verifier'), attempt.verifier)
      assert.equal(exchange.options.body.get('client_secret'), config[provider].clientSecret)
    }
  } finally { await f.close() }
})

test('missing/wrong browser binding, expired state, issuer mismatch and replay cannot establish a session', async () => {
  const f = await fixture()
  try {
    const flow = await f.start('discord')
    assert.match((await f.finish('discord', flow, '', '')).headers.get('location'), /oauth-invalid-state/)
    assert.equal(f.calls.length, 0)
    const success = await f.finish('discord', flow)
    assert.equal(success.headers.get('location'), '/wallet/live?oauth=success')
    const count = f.calls.length
    assert.match((await f.finish('discord', flow)).headers.get('location'), /oauth-invalid-state/)
    assert.equal(f.calls.length, count)
    const expired = await f.start('discord')
    f.db.prepare('UPDATE oauth_attempts SET expires_at=0').run()
    assert.match((await f.finish('discord', expired)).headers.get('location'), /oauth-invalid-state/)
    const mixed = await f.start('google')
    const bad = await f.request(`/api/auth/oauth/google/callback?state=${mixed.url.searchParams.get('state')}&code=mock&iss=https://evil.invalid`, { cookie: mixed.cookie })
    assert.match(bad.headers.get('location'), /oauth-failed/)
    assert.equal(f.calls.length, count)
  } finally { await f.close() }
})

test('provider identities keep their account on repeated login and never auto-link an existing email', async () => {
  const f = await fixture()
  try {
    const first = await f.finish('google', await f.start('google'))
    const cookie = first.headers.getSetCookie().find(value => value.startsWith('bbp_session=')).split(';')[0]
    const user = (await (await f.request('/api/auth/session', { cookie })).json()).user
    await f.finish('google', await f.start('google'))
    assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1)
    f.setEmails('google@example.invalid', 'google@example.invalid')
    const collision = await f.finish('discord', await f.start('discord'))
    assert.match(collision.headers.get('location'), /oauth-account-exists/)
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM identities WHERE provider='discord'").get().count, 0)
    const linked = await f.finish('discord', await f.start('discord', cookie))
    assert.equal(linked.headers.get('location'), '/wallet/live?oauth=success')
    const identity = f.db.prepare("SELECT user_id FROM identities WHERE provider='discord'").get()
    assert.equal(identity.user_id, user.id)
    const discordLogin = await f.finish('discord', await f.start('discord'))
    const discordCookie = discordLogin.headers.getSetCookie().find(value => value.startsWith('bbp_session=')).split(';')[0]
    assert.equal((await (await f.request('/api/auth/session', { cookie: discordCookie })).json()).user.id, user.id)
    const wrongPassword = await f.request('/api/auth/login', { data: { email: user.email, password: 'unavailable-password' } })
    assert.equal(wrongPassword.status, 401)
  } finally { await f.close() }
})

test('linking requires an active original session and cannot move a provider from a different account', async () => {
  const f = await fixture()
  try {
    assert.equal((await f.request('/api/auth/oauth/discord/link', { data: {} })).status, 401)
    const local = await f.request('/api/auth/register', { data: { email: 'local@example.invalid', password: 'test-password-1234' } })
    const cookie = local.headers.getSetCookie()[0].split(';')[0]
    await f.finish('discord', await f.start('discord'))
    const conflict = await f.finish('discord', await f.start('discord', cookie))
    assert.match(conflict.headers.get('location'), /oauth-already-linked/)
    const pending = await f.start('google', cookie)
    await f.request('/api/auth/logout', { cookie, data: {} })
    assert.match((await f.finish('google', pending)).headers.get('location'), /oauth-link-expired/)
  } finally { await f.close() }
})

test('disabled, rejected and unverified logins do not create users', async () => {
  const disabled = await fixture({ config: {} })
  try { assert.equal((await disabled.request('/api/auth/oauth/google/start')).status, 503) }
  finally { await disabled.close() }
  const f = await fixture({ verifyGoogle: async () => ({ subject: 'sub', email: 'test@example.invalid', verified: false }) })
  try {
    const denied = await f.finish('google', await f.start('google'), '&error=access_denied')
    assert.match(denied.headers.get('location'), /oauth-denied/)
    assert.equal(f.calls.length, 0)
    assert.match((await f.finish('google', await f.start('google'))).headers.get('location'), /oauth-email-unverified/)
    assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0)
  } finally { await f.close() }
})

test('Google ID tokens require a valid signature, audience, issuer, nonce, expiry and authorized party', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const { privateKey: otherKey } = await generateKeyPair('RS256')
  const claims = { sub: 'google-sub', email: 'test@example.invalid', email_verified: true, nonce: 'test-nonce' }
  const sign = (payload = claims, options = {}, key = privateKey) => new SignJWT(payload).setProtectedHeader({ alg: 'RS256' })
    .setIssuer(options.issuer ?? 'https://accounts.google.com').setAudience(options.audience ?? 'test-client')
    .setIssuedAt().setExpirationTime(options.expiry ?? '5m').sign(key)
  const valid = await sign()
  assert.equal((await verifyGoogleToken(valid, 'test-client', 'test-nonce', publicKey)).subject, 'google-sub')
  await assert.rejects(verifyGoogleToken(valid, 'other-client', 'test-nonce', publicKey))
  await assert.rejects(verifyGoogleToken(valid, 'test-client', 'wrong-nonce', publicKey))
  await assert.rejects(verifyGoogleToken(await sign(claims, { issuer: 'https://evil.invalid' }), 'test-client', 'test-nonce', publicKey))
  await assert.rejects(verifyGoogleToken(await sign(claims, { expiry: -1 }), 'test-client', 'test-nonce', publicKey))
  await assert.rejects(verifyGoogleToken(await sign(claims, {}, otherKey), 'test-client', 'test-nonce', publicKey))
  await assert.rejects(verifyGoogleToken(await sign({ ...claims, azp: 'other-client' }), 'test-client', 'test-nonce', publicKey))
  await assert.rejects(verifyGoogleToken(await sign(claims, { audience: ['test-client', 'other-client'] }), 'test-client', 'test-nonce', publicKey))
})
