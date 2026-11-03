import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApi } from '../src/api.mjs'
import { createPayments, openDatabase } from '../src/payments.mjs'

test('API authenticates on the server, rejects CSRF and isolates users and balances', async () => {
  const db = openDatabase(':memory:')
  const origin = 'http://localhost:5173'
  const receive = createPayments({ db, phone: '0800000000', redeem: async (_phone, code) => ({ code, amount: 50 }) })
  const server = createApi({ db, origin, receive, enabled: true })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const request = (path, data, cookie, extra = {}) => fetch(base + path, {
    method: data ? 'POST' : 'GET', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra },
    body: data ? JSON.stringify(data) : undefined,
  })
  try {
    assert.equal((await request('/api/wallet')).status, 401)
    const credentials = { email: 'a@example.invalid', password: 'test-password-1234' }
    assert.equal((await request('/api/auth/register', credentials, null, { Origin: 'https://evil.invalid' })).status, 403)
    const registered = await request('/api/auth/register', credentials)
    assert.equal(registered.status, 200)
    const cookie = registered.headers.get('set-cookie').split(';')[0]
    assert.ok(registered.headers.get('set-cookie').includes('HttpOnly'))
    const login = await request('/api/auth/login', credentials)
    assert.equal(login.status, 200)
    assert.equal((await request('/api/auth/login', { ...credentials, password: 'wrong-password-1234' })).status, 401)
    const paid = await request('/api/topups/truemoney', { voucher: 'c'.repeat(35), userId: 'someone-else', amount: 999999 }, cookie, { 'Idempotency-Key': 'credit-01' })
    assert.equal(paid.status, 200)
    assert.equal((await paid.json()).balanceSatang, 5000)
    const second = await request('/api/auth/register', { email: 'b@example.invalid', password: 'test-password-5678' })
    const cookieB = second.headers.get('set-cookie').split(';')[0]
    assert.equal((await (await request('/api/wallet', null, cookieB)).json()).balanceSatang, 0)
    assert.equal((await request('/api/topups/truemoney', { voucher: 'c'.repeat(35) }, cookieB, { 'Idempotency-Key': 'credit-02' })).status, 409)
    await request('/api/auth/logout', {}, cookie)
    assert.equal((await request('/api/wallet', null, cookie)).status, 401)
    assert.notEqual(db.prepare('SELECT password_hash FROM users WHERE email=?').get(credentials.email).password_hash, credentials.password)
  } finally { await new Promise(resolve => server.close(resolve)); db.close() }
})
