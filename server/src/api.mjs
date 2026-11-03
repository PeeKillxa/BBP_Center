import { createServer } from 'node:http'
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { PaymentError, wallet } from './payments.mjs'
import { createOAuth } from './oauth.mjs'
import { digest, issueSession, sessionCookie, sessionToken, sessionUser } from './sessions.mjs'
import { createCommerce, quoteFarm } from './commerce.mjs'

const scrypt = promisify(scryptCallback)

async function body(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 65536) throw new PaymentError('request-too-large', 413)
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new PaymentError('invalid-json') }
}

export function createApi({ db, receive, origin, enabled, oauthOptions = {}, commerceOptions = {}, staticHandler }) {
  const oauth = createOAuth({ db, origin, ...oauthOptions })
  const commerce = createCommerce({ db, ...commerceOptions })
  const limits = new Map()
  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, data) => { res.writeHead(status); res.end(JSON.stringify(data)) }
    try {
      const url = new URL(req.url, origin)
      const path = url.pathname
      if (!path.startsWith('/api/')) {
        if (staticHandler) return await staticHandler(req, res, path)
        return send(404, { error: 'not-found' })
      }
      if (req.method === 'POST') {
        if (req.headers.origin !== origin) throw new PaymentError('origin-rejected', 403)
        if (!req.headers['content-type']?.startsWith('application/json')) throw new PaymentError('json-required', 415)
      }
      if (req.method === 'POST' || /^\/api\/auth\/oauth\/(google|discord)\/start$/.test(path)) {
        const now = Date.now()
        for (const [key, value] of limits) if (value.until <= now) limits.delete(key)
        const limitUser = sessionUser(db, req)
        const key = limitUser ? `user:${limitUser.id}` : `ip:${req.socket.remoteAddress}`
        const rate = limits.get(key) ?? { count: 0, until: now + 60000 }
        rate.count++
        limits.set(key, rate)
        if (rate.count > 20) throw new PaymentError('rate-limited', 429)
      }
      if (req.method === 'GET' && path === '/api/health') return send(200, { enabled: enabled && commerce.settings().open })
      if (req.method === 'GET' && path === '/api/catalog') return send(200, commerce.catalog())
      if (req.method === 'GET' && path === '/api/farm/quote') return send(200, quoteFarm(Number(url.searchParams.get('diamonds'))))
      if (req.method === 'GET' && path === '/api/auth/providers') return send(200, oauth.status())
      const oauthRoute = /^\/api\/auth\/oauth\/(google|discord)\/(start|callback|link)$/.exec(path)
      if (oauthRoute) {
        const [, provider, action] = oauthRoute
        if (req.method === 'GET' && action === 'start') return oauth.begin(provider, req, res)
        if (req.method === 'GET' && action === 'callback') return await oauth.finish(provider, req, res, url.searchParams)
        if (req.method === 'POST' && action === 'link') { await body(req); return oauth.begin(provider, req, res, true) }
        return send(405, { error: 'method-not-allowed' })
      }
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
          if (!user || !/^[a-f0-9]{128}$/.test(user.password_hash) || !timingSafeEqual(calculated, Buffer.from(user.password_hash, 'hex'))) throw new PaymentError('invalid-credentials', 401)
        }
        res.setHeader('Set-Cookie', issueSession(db, origin, user.id))
        return send(200, { user: { id: user.id, email: user.email } })
      }
      const token = sessionToken(req)
      const user = sessionUser(db, req)
      if (req.method === 'GET' && path === '/api/auth/session') return send(200, {
        user: user ? { ...user, isAdmin: commerce.isAdmin(user) } : null, providers: user ? db.prepare('SELECT provider FROM identities WHERE user_id=?').all(user.id).map(row => row.provider) : [],
      })
      if (!user) throw new PaymentError('authentication-required', 401)
      if (req.method === 'GET' && path === '/api/wallet') return send(200, { user, ...wallet(db, user.id) })
      if (req.method === 'GET' && path === '/api/account') return send(200, commerce.account(user))
      const delivery = /^\/api\/orders\/([A-Za-z0-9-]+)\/delivery$/.exec(path)
      if (req.method === 'POST' && delivery) return send(200, commerce.delivery(user, delivery[1]))
      if (req.method === 'GET' && path === '/api/admin') return send(200, commerce.admin(user))
      if (req.method === 'POST' && ['/api/purchase', '/api/reservations', '/api/reservations/settle', '/api/farm/orders', '/api/admin/listings', '/api/admin/listings/archive', '/api/admin/settings', '/api/admin/farm', '/api/admin/payments/reconcile'].includes(path)) {
        const input = await body(req)
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PaymentError('invalid-input')
        const handlers = {
          '/api/purchase': () => commerce.checkout(user, req.headers['idempotency-key'], input),
          '/api/reservations': () => commerce.reserve(user, req.headers['idempotency-key'], input),
          '/api/reservations/settle': () => commerce.settle(user, req.headers['idempotency-key'], input),
          '/api/farm/orders': () => commerce.orderFarm(user, req.headers['idempotency-key'], input),
          '/api/admin/listings': () => commerce.saveListing(user, input),
          '/api/admin/listings/archive': () => commerce.archiveListing(user, input),
          '/api/admin/settings': () => commerce.saveSettings(user, input),
          '/api/admin/farm': () => commerce.updateFarm(user, input),
          '/api/admin/payments/reconcile': () => commerce.reviewPayment(user, input),
        }
        return send(200, handlers[path]())
      }
      if (req.method === 'POST' && path === '/api/auth/logout') {
        db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(token))
        res.setHeader('Set-Cookie', sessionCookie(origin, '', 0))
        return send(200, { ok: true })
      }
      if (req.method === 'POST' && path === '/api/topups/truemoney') {
        if (!enabled) throw new PaymentError('not-configured', 503)
        commerce.requireOpen()
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
