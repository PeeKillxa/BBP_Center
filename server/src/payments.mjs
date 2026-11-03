import { createHash, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

export class PaymentError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status }
}

export function voucherCode(input) {
  if (typeof input !== 'string' || input.length > 512) throw new PaymentError('invalid-voucher')
  const value = input.trim()
  if (/^[a-z0-9]{35}$/i.test(value)) return value
  try {
    const url = new URL(value)
    const code = url.searchParams.get('v')
    if (url.origin !== 'https://gift.truemoney.com' || !/^\/campaign\/?$/.test(url.pathname) || url.username || url.password || !/^[a-z0-9]{35}$/i.test(code ?? '')) throw new Error()
    return code
  } catch { throw new PaymentError('invalid-voucher') }
}

const hash = (value) => createHash('sha256').update(value).digest('hex')

export function openDatabase(path) {
  const db = new DatabaseSync(path)
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS topups (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), key TEXT NOT NULL,
      voucher_hash TEXT UNIQUE NOT NULL, recipient_hash TEXT NOT NULL, status TEXT NOT NULL,
      amount_satang INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
      UNIQUE(user_id, key)
    );
    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), topup_id TEXT UNIQUE NOT NULL REFERENCES topups(id),
      amount_satang INTEGER NOT NULL CHECK(amount_satang > 0), created_at INTEGER NOT NULL
    );`)
  // After a process interruption the provider may already have received the request.
  db.exec("UPDATE topups SET status='needs-review' WHERE status='processing'")
  return db
}

export const publicTopup = (row) => ({ id: row.id, status: row.status, amountSatang: row.amount_satang, createdAt: row.created_at })

export function wallet(db, userId) {
  const balance = db.prepare('SELECT COALESCE(SUM(amount_satang),0) AS balance FROM ledger WHERE user_id=?').get(userId).balance
  const topups = db.prepare('SELECT * FROM topups WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(userId).map(publicTopup)
  return { balanceSatang: balance, topups }
}

/** Real provider is injected; tests never import or call the redeem package. */
export function createPayments({ db, phone, redeem, timeoutMs = 20000 }) {
  return async function receive(userId, key, input) {
    if (!/^[A-Za-z0-9-]{8,100}$/.test(key ?? '')) throw new PaymentError('invalid-idempotency-key')
    const code = voucherCode(input)
    const fingerprint = hash(code)
    const prior = db.prepare('SELECT * FROM topups WHERE user_id=? AND key=?').get(userId, key)
    if (prior) {
      if (prior.voucher_hash !== fingerprint) throw new PaymentError('idempotency-conflict', 409)
      return publicTopup(prior)
    }
    if (!/^0[689]\d{8}$/.test(phone ?? '')) throw new PaymentError('not-configured', 503)
    const id = randomUUID()
    // Claim voucher globally before awaiting the provider. Concurrent calls cannot redeem twice.
    try {
      db.prepare("INSERT INTO topups (id,user_id,key,voucher_hash,recipient_hash,status,created_at) VALUES (?,?,?,?,?,'processing',?)")
        .run(id, userId, key, fingerprint, hash(phone), Date.now())
    } catch (error) {
      if (String(error.code).startsWith('ERR_SQLITE') && db.prepare('SELECT id FROM topups WHERE voucher_hash=?').get(fingerprint)) throw new PaymentError('voucher-already-submitted', 409)
      throw error
    }
    let timer
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => redeem(phone, code)),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('provider-timeout')), timeoutMs) }),
      ])
      // Credit only the provider's redeemed amount, never an amount supplied by the browser.
      const amount = result?.amount
      const satang = Math.round(amount * 100)
      if (result?.code !== code || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(satang) || Math.abs(amount * 100 - satang) > 0.000001) throw new Error('invalid-provider-response')
      db.exec('BEGIN IMMEDIATE')
      try {
        db.prepare('INSERT INTO ledger (id,user_id,topup_id,amount_satang,created_at) VALUES (?,?,?,?,?)').run(randomUUID(), userId, id, satang, Date.now())
        db.prepare("UPDATE topups SET status='success', amount_satang=? WHERE id=?").run(satang, id)
        db.exec('COMMIT')
      } catch (error) { db.exec('ROLLBACK'); throw error }
    } catch {
      // All uncertain outcomes require reconciliation. Never retry automatically or expose provider errors.
      db.prepare("UPDATE topups SET status='needs-review' WHERE id=? AND status='processing'").run(id)
    } finally { clearTimeout(timer) }
    return publicTopup(db.prepare('SELECT * FROM topups WHERE id=?').get(id))
  }
}
