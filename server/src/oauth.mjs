import { randomBytes, randomUUID } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { PaymentError } from './payments.mjs'
import { digest, issueSession, sessionToken, sessionUser } from './sessions.mjs'

const PROVIDERS = {
  google: {
    issuer: 'https://accounts.google.com', authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token', scope: 'openid email profile',
  },
  discord: {
    issuer: 'https://discord.com', authorize: 'https://discord.com/api/oauth2/authorize',
    token: 'https://discord.com/api/oauth2/token', scope: 'identify email',
  },
}
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), { timeoutDuration: 8000 })
const random = () => randomBytes(32).toString('base64url')
export const oauthConfig = (env = process.env) => Object.fromEntries(Object.keys(PROVIDERS).map(provider => [provider, {
  clientId: env[`${provider.toUpperCase()}_CLIENT_ID`]?.trim(),
  clientSecret: env[`${provider.toUpperCase()}_CLIENT_SECRET`]?.trim(),
}]))

export async function verifyGoogleToken(token, clientId, nonce, keys = googleKeys) {
  const { payload } = await jwtVerify(token, keys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: clientId, algorithms: ['RS256'],
    requiredClaims: ['iss', 'aud', 'exp', 'iat', 'sub', 'nonce', 'email', 'email_verified'],
  })
  if (payload.nonce !== nonce || (payload.azp !== undefined && payload.azp !== clientId) || (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== clientId)) throw new PaymentError('oauth-invalid-token')
  return { subject: payload.sub, email: payload.email, verified: payload.email_verified }
}

export function createOAuth({ db, origin, config = oauthConfig(), fetchImpl = fetch, verifyGoogle = verifyGoogleToken }) {
  const ready = provider => Boolean(PROVIDERS[provider] && config[provider]?.clientId && config[provider]?.clientSecret)
  const status = () => Object.fromEntries(Object.keys(PROVIDERS).map(provider => [provider, ready(provider)]))
  const callbackUri = provider => `${origin}/api/auth/oauth/${provider}/callback`
  const flowCookie = (provider, browser, maxAge = 600) =>
    `bbp_oauth_${provider}=${browser}; HttpOnly; SameSite=Lax; Path=/api/auth/oauth/${provider}; Max-Age=${maxAge}${origin.startsWith('https:') ? '; Secure' : ''}`
  const redirect = (res, target, cookies) => {
    if (cookies) res.setHeader('Set-Cookie', cookies)
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.writeHead(303, { Location: target }); res.end()
  }
  const begin = (provider, req, res, link = false) => {
    if (!ready(provider)) throw new PaymentError('oauth-not-configured', 503)
    const user = link && sessionUser(db, req)
    if (link && !user) throw new PaymentError('authentication-required', 401)
    const state = random(), browser = random(), verifier = random(), nonce = random()
    db.prepare('DELETE FROM oauth_attempts WHERE expires_at<=?').run(Date.now())
    db.prepare('INSERT INTO oauth_attempts (state_hash,provider,browser_hash,verifier,nonce,expires_at,link_user_id,link_session_hash) VALUES (?,?,?,?,?,?,?,?)')
      .run(digest(state), provider, digest(browser), verifier, nonce, Date.now() + 600000, user?.id ?? null, user ? digest(sessionToken(req)) : null)
    const url = new URL(PROVIDERS[provider].authorize)
    const params = {
      client_id: config[provider].clientId, redirect_uri: callbackUri(provider), response_type: 'code',
      scope: PROVIDERS[provider].scope, state, code_challenge: Buffer.from(digest(verifier), 'hex').toString('base64url'), code_challenge_method: 'S256',
    }
    if (provider === 'google') { params.nonce = nonce; params.prompt = 'select_account' }
    else params.prompt = 'consent'
    url.search = new URLSearchParams(params).toString()
    const cookie = flowCookie(provider, browser)
    if (link) {
      res.setHeader('Set-Cookie', cookie)
      res.writeHead(200); res.end(JSON.stringify({ url: url.href }))
    } else redirect(res, url.href, cookie)
  }
  const finish = async (provider, req, res, query) => {
    const clear = flowCookie(provider, '', 0)
    try {
      if (!ready(provider)) throw new PaymentError('oauth-not-configured')
      const state = query.get('state')
      const browser = new RegExp(`(?:^|;\\s*)bbp_oauth_${provider}=([A-Za-z0-9_-]{43})(?:;|$)`).exec(req.headers.cookie ?? '')?.[1]
      if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state) || !browser || query.getAll('state').length !== 1) throw new PaymentError('oauth-invalid-state')
      const attempt = db.prepare('DELETE FROM oauth_attempts WHERE state_hash=? AND provider=? AND browser_hash=? AND expires_at>? RETURNING *')
        .get(digest(state), provider, digest(browser), Date.now())
      if (!attempt) throw new PaymentError('oauth-invalid-state')
      if (query.has('error')) throw new PaymentError('oauth-denied')
      const issuer = query.get('iss')
      if ((provider === 'discord' || issuer !== null) && issuer !== PROVIDERS[provider].issuer) throw new PaymentError('oauth-invalid-issuer')
      const code = query.get('code')
      if (!code || code.length > 4096 || query.getAll('code').length !== 1) throw new PaymentError('oauth-failed')
      const response = await fetchImpl(PROVIDERS[provider].token, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUri(provider),
          client_id: config[provider].clientId, client_secret: config[provider].clientSecret, code_verifier: attempt.verifier }),
      })
      if (!response.ok) throw new PaymentError('oauth-failed')
      const tokens = await response.json()
      let identity
      if (provider === 'google') {
        if (typeof tokens.id_token !== 'string') throw new PaymentError('oauth-invalid-token')
        identity = await verifyGoogle(tokens.id_token, config[provider].clientId, attempt.nonce)
      } else {
        if (typeof tokens.access_token !== 'string' || tokens.token_type?.toLowerCase() !== 'bearer') throw new PaymentError('oauth-invalid-token')
        const profileResponse = await fetchImpl('https://discord.com/api/v10/users/@me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }, redirect: 'error', signal: AbortSignal.timeout(10000),
        })
        if (!profileResponse.ok) throw new PaymentError('oauth-failed')
        const profile = await profileResponse.json()
        identity = { subject: profile.id, email: profile.email, verified: profile.verified }
      }
      if (typeof identity.subject !== 'string' || !identity.subject || identity.subject.length > 255 || identity.verified !== true || typeof identity.email !== 'string' || identity.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) throw new PaymentError('oauth-email-unverified')
      const email = identity.email.trim().toLowerCase()
      db.exec('BEGIN IMMEDIATE')
      let userId
      try {
        const existing = db.prepare('SELECT user_id FROM identities WHERE provider=? AND subject=?').get(provider, identity.subject)
        if (attempt.link_user_id) {
          const active = db.prepare('SELECT user_id FROM sessions WHERE hash=? AND expires_at>?').get(attempt.link_session_hash, Date.now())
          if (active?.user_id !== attempt.link_user_id) throw new PaymentError('oauth-link-expired')
          if (existing && existing.user_id !== active.user_id) throw new PaymentError('oauth-already-linked')
          const other = db.prepare('SELECT subject FROM identities WHERE user_id=? AND provider=?').get(active.user_id, provider)
          if (other && other.subject !== identity.subject) throw new PaymentError('oauth-already-linked')
          userId = active.user_id
        } else if (existing) userId = existing.user_id
        else {
          // Email alone never grants access to an existing account or its wallet.
          if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) throw new PaymentError('oauth-account-exists')
          userId = randomUUID()
          db.prepare('INSERT INTO users (id,email,password_hash,salt) VALUES (?,?,?,?)').run(userId, email, 'oauth-only', 'oauth-only')
        }
        db.prepare('INSERT INTO identities (provider,subject,user_id,email) VALUES (?,?,?,?) ON CONFLICT(provider,subject) DO UPDATE SET email=excluded.email')
          .run(provider, identity.subject, userId, email)
        db.exec('COMMIT')
      } catch (error) { db.exec('ROLLBACK'); throw error }
      redirect(res, '/wallet/live?oauth=success', [clear, issueSession(db, origin, userId)])
    } catch (error) {
      const allowed = ['oauth-not-configured', 'oauth-invalid-state', 'oauth-denied', 'oauth-account-exists', 'oauth-already-linked', 'oauth-link-expired', 'oauth-email-unverified']
      const code = allowed.includes(error.code) ? error.code : 'oauth-failed'
      redirect(res, `/wallet/live?oauth_error=${code}`, clear)
    }
  }
  return { status, begin, finish }
}
