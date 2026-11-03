import { createServer } from 'node:http'
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { PaymentError, wallet } from './payments.mjs'

const scrypt = promisify(scryptCallback)
const digest = value => createHash('sha256').update(value).digest('hex')
const SESSION_MS = 12 * 60 * 60 * 1000

async function body(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 4096) throw new PaymentError('request-too-large', 413)
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new PaymentError('invalid-json') }
}

export function createApi({ db, receive, origin, enabled }) {
  const secure = new URL(origin).protocol === 'https:'
  const limits = new Map()
  const sessionCookie = (token, maxAge = SESSION_MS / 1000) => `bbp_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, data) => { res.writeHead(status); res.end(JSON.stringify(data)) }
    try {
      const path = new URL(req.url, origin).pathname
      if (req.method === 'POST') {
        if (req.headers.origin !== origin) throw new PaymentError('origin-rejected', 403)
        if (!req.headers['content-type']?.startsWith('application/json')) throw new PaymentError('json-required', 415)
        const now = Date.now()
        for (const [key, value] of limits) if (value.until <= now) limits.delete(key)
        const key = req.socket.remoteAddress
        const rate = limits.get(key) ?? { count: 0, until: now + 60000 }
        rate.count++
        limits.set(key, rate)
        if (rate.count > 20) throw new PaymentError('rate-limited', 429)
      }
      if (req.method === 'GET' && path === '/api/health') return send(200, { enabled })
      if (req.method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(path)) {
        const input = await body(req)
        if (!input || typeof input.email !== 'string' || typeof input.password !== 'string') throw new PaymentError('invalid-credentials')
        const email = input.email.trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || input.password.length < 12 || input.password.length > 128) throw new PaymentError('invalid-credentials')
        let user = db.prepare('SELECT * FROM users WHERE email=?').get(email)
        if (path.endsWith('/register')) {
          const salt = randomBytes(16).toString('hex')
          const passwordHash = (await scrypt(input.password, salt, 64)).toString('hex')
          try {
            user = { id: randomUUID(), email, password_hash: passwordHash, salt }
            db.prepare('INSERT INTO users (id,email,password_hash,salt) VALUES (?,?,?,?)').run(user.id, email, passwordHash, salt)
          } catch { throw new PaymentError('registration-unavailable', 409) }
        } else {
          const calculated = await scrypt(input.password, user?.salt ?? 'bbp-nonexistent-user', 64)
          if (!user || !timingSafeEqual(calculated, Buffer.from(user.password_hash, 'hex'))) throw new PaymentError('invalid-credentials', 401)
        }
        const token = randomBytes(32).toString('hex')
        db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now())
        db.prepare('INSERT INTO sessions (hash,user_id,expires_at) VALUES (?,?,?)').run(digest(token), user.id, Date.now() + SESSION_MS)
        res.setHeader('Set-Cookie', sessionCookie(token))
        return send(200, { user: { id: user.id, email: user.email } })
      }
      const token = /(?:^|;\s*)bbp_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1]
      const user = token && db.prepare('SELECT users.id,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.hash=? AND sessions.expires_at>?').get(digest(token), Date.now())
      if (!user) throw new PaymentError('authentication-required', 401)
      if (req.method === 'GET' && path === '/api/wallet') return send(200, { user, ...wallet(db, user.id) })
      if (req.method === 'POST' && path === '/api/auth/logout') {
        db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(token))
        res.setHeader('Set-Cookie', sessionCookie('', 0))
        return send(200, { ok: true })
      }
      if (req.method === 'POST' && path === '/api/topups/truemoney') {
        if (!enabled) throw new PaymentError('not-configured', 503)
        const input = await body(req)
        const topup = await receive(user.id, req.headers['idempotency-key'], input?.voucher)
        return send(topup.status === 'processing' ? 202 : 200, { topup, ...wallet(db, user.id) })
      }
      return send(404, { error: 'not-found' })
    } catch (error) {
      send(error instanceof PaymentError ? error.status : 500, { error: error instanceof PaymentError ? error.code : 'server-error' })
    }
  })
}
