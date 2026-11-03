import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPayments, openDatabase, voucherCode, wallet } from '../src/payments.mjs'

const code = 'a'.repeat(35)
const phone = '0800000000' // Fictional test input; injected providers never perform network I/O.
function setup(path = ':memory:') {
  const db = openDatabase(path)
  db.prepare('INSERT OR IGNORE INTO users (id,email,password_hash,salt) VALUES (?,?,?,?)').run('a', 'a@example.invalid', 'mock', 'mock')
  db.prepare('INSERT OR IGNORE INTO users (id,email,password_hash,salt) VALUES (?,?,?,?)').run('b', 'b@example.invalid', 'mock', 'mock')
  return db
}

test('normalizes codes and links while rejecting malformed and lookalike hosts', () => {
  assert.equal(voucherCode(`https://gift.truemoney.com/campaign/?v=${code}`), code)
  assert.equal(voucherCode(` ${code} `), code)
  for (const input of [null, '', 'abc', `https://gift.truemoney.com.evil.invalid/campaign/?v=${code}`, `http://gift.truemoney.com/campaign/?v=${code}`]) assert.throws(() => voucherCode(input))
})

test('simultaneous retries and link/code variants produce one provider call and one credit', async () => {
  const db = setup()
  let calls = 0
  const receive = createPayments({ db, phone, redeem: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return { code, amount: 20.25 } } })
  const [first, concurrent] = await Promise.all([receive('a', 'attempt-1', code), receive('a', 'attempt-1', code)])
  assert.equal(first.status, 'success')
  assert.equal(concurrent.status, 'processing')
  assert.equal((await receive('a', 'attempt-1', code)).amountSatang, 2025)
  await assert.rejects(receive('b', 'attempt-2', `https://gift.truemoney.com/campaign/?v=${code}`), { code: 'voucher-already-submitted' })
  await assert.rejects(receive('a', 'attempt-1', 'b'.repeat(35)), { code: 'idempotency-conflict' })
  assert.equal(calls, 1)
  assert.equal(wallet(db, 'a').balanceSatang, 2025)
  assert.equal(wallet(db, 'b').balanceSatang, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM ledger').get().count, 1)
  assert.ok(!JSON.stringify(wallet(db, 'a')).includes(code))
  db.close()
})

test('timeout requires review; late success and retries cannot credit or redeem again', async () => {
  const db = setup()
  let calls = 0
  const receive = createPayments({ db, phone, timeoutMs: 5, redeem: async () => {
    calls++; await new Promise(resolve => setTimeout(resolve, 30)); return { code, amount: 100 }
  } })
  assert.equal((await receive('a', 'timeout-1', code)).status, 'needs-review')
  await new Promise(resolve => setTimeout(resolve, 40))
  assert.equal((await receive('a', 'timeout-1', code)).status, 'needs-review')
  assert.equal(calls, 1)
  assert.equal(wallet(db, 'a').balanceSatang, 0)
  db.close()
})

test('invalid or mismatched provider responses never credit the wallet', async () => {
  for (const result of [{ code, amount: -1 }, { code, amount: 0.001 }, { code, amount: '20' }, { code: 'other', amount: 20 }]) {
    const db = setup()
    const receive = createPayments({ db, phone, redeem: async () => result })
    assert.equal((await receive('a', 'invalid-1', code)).status, 'needs-review')
    assert.equal(wallet(db, 'a').balanceSatang, 0)
    db.close()
  }
})

test('successful credits survive restart and interrupted requests become review-only', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bbp-payments-'))
  const path = join(directory, 'test.sqlite')
  try {
    let db = setup(path)
    const receive = createPayments({ db, phone, redeem: async () => ({ code, amount: 100 }) })
    await receive('a', 'persist-1', code)
    db.prepare("INSERT INTO topups VALUES ('interrupted','a','persist-2','mock-hash','mock-recipient','processing',0,0)").run()
    db.close()
    db = openDatabase(path)
    assert.equal(wallet(db, 'a').balanceSatang, 10000)
    assert.equal(db.prepare("SELECT status FROM topups WHERE id='interrupted'").get().status, 'needs-review')
    const retry = createPayments({ db, phone, redeem: async () => { throw new Error('must not be called') } })
    assert.equal((await retry('a', 'persist-1', code)).status, 'success')
    db.close()
  } finally { rmSync(directory, { recursive: true }) }
})
