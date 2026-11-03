import { createHash, randomBytes } from 'node:crypto'

const SESSION_MS = 12 * 60 * 60 * 1000
export const digest = value => createHash('sha256').update(value).digest('hex')
export const sessionToken = req => /(?:^|;\s*)bbp_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1]
export function sessionUser(db, req) {
  const token = sessionToken(req)
  return token && db.prepare('SELECT users.id,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.hash=? AND sessions.expires_at>?').get(digest(token), Date.now())
}
export function sessionCookie(origin, token, maxAge = SESSION_MS / 1000) {
  return `bbp_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${new URL(origin).protocol === 'https:' ? '; Secure' : ''}`
}
export function issueSession(db, origin, userId) {
  const token = randomBytes(32).toString('hex')
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now())
  db.prepare('INSERT INTO sessions (hash,user_id,expires_at) VALUES (?,?,?)').run(digest(token), userId, Date.now() + SESSION_MS)
  return sessionCookie(origin, token)
}
