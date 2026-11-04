import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { openDatabase, wallet } from '../src/payments.mjs'
import { createCommerce, quoteFarm } from '../src/commerce.mjs'
import { createApi } from '../src/api.mjs'
import { issueSession } from '../src/sessions.mjs'

const HOUR = 3600000
function fixture() {
  const db = openDatabase(':memory:')
  for (const id of ['owner', 'a', 'b']) db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(id, `${id}@example.invalid`, 'test-only', 'test-only')
  let time = Date.UTC(2026, 10, 3, 12)
  const key = randomBytes(32)
  const shop = createCommerce({ db, encryptionKey: key, adminIds: ['owner'], now: () => time })
  const owner = { id: 'owner' }, a = { id: 'a' }, b = { id: 'b' }
  const fund = (user, amount) => {
    const id = randomUUID()
    db.prepare("INSERT INTO topups (id,user_id,key,voucher_hash,recipient_hash,status,amount_satang,created_at) VALUES (?,?,?,?,?,'success',?,?)").run(id, user.id, id, id, 'test-recipient', amount, time)
    db.prepare('INSERT INTO ledger VALUES (?,?,?,?,?)').run(randomUUID(), user.id, id, amount, time)
  }
  const open = () => shop.saveSettings(owner, { contactUrl: 'https://example.invalid/contact', terms: 'Test sale terms', farmTerms: 'Test farm terms', open: true })
  const listing = (priceSatang = 10000) => shop.saveListing(owner, { mapId: 'anime-adventures', title: 'Private fixture listing', priceSatang, description: 'Fixture description', images: ['https://example.invalid/photo.png'], attributes: [{ label: 'Level', value: '10' }], transferTerms: 'Fixture transfer terms', warranty: 'Fixture warranty', delivery: 'SENSITIVE-FIXTURE-DELIVERY' }).id
  return { db, shop, owner, a, b, key, fund, open, listing, advance: ms => { time += ms }, close: () => db.close() }
}

test('new shop contains no products or fabricated balances, and public catalog never exposes delivery', () => {
  const f = fixture()
  try {
    assert.equal(f.shop.catalog().listings.length, 0)
    assert.equal(f.shop.catalog().settings.open, false)
    assert.equal(wallet(f.db, 'a').balanceSatang, 0)
    const id = f.listing()
    assert.ok(!JSON.stringify(f.shop.catalog()).includes('SENSITIVE-FIXTURE-DELIVERY'))
    assert.ok(!f.db.prepare('SELECT secret FROM listings WHERE id=?').get(id).secret.includes('SENSITIVE-FIXTURE-DELIVERY'))
    assert.throws(() => f.shop.saveListing(f.a, {}), { code: 'forbidden' })
    assert.throws(() => f.shop.saveSettings(f.a, {}), { code: 'forbidden' })
    f.shop.archiveListing(f.owner, { id })
    assert.equal(f.shop.catalog().listings.length, 0)
    assert.equal(f.shop.admin(f.owner).listings[0].status, 'archived')
  } finally { f.close() }
})

test('competing buyers, same-key retries, changed prices and insufficient balances preserve atomic money and stock', async () => {
  const f = fixture()
  try {
    f.open(); f.fund(f.a, 30000); f.fund(f.b, 30000)
    const id = f.listing(), input = { listingId: id, priceSatang: 10000 }
    const results = await Promise.allSettled([Promise.resolve().then(() => f.shop.checkout(f.a, 'purchase-a', input)), Promise.resolve().then(() => f.shop.checkout(f.b, 'purchase-b', input))])
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal(wallet(f.db, 'a').balanceSatang, 20000)
    assert.equal(wallet(f.db, 'b').balanceSatang, 30000)
    const order = f.shop.checkout(f.a, 'purchase-a', input)
    assert.equal(f.shop.account(f.a).orders.length, 1)
    assert.equal(wallet(f.db, 'a').balanceSatang, 20000)
    assert.equal(f.shop.delivery(f.a, order.id).delivery, 'SENSITIVE-FIXTURE-DELIVERY')
    assert.throws(() => f.shop.delivery(f.b, order.id), { code: 'not-found' })
    const another = f.listing(40000)
    assert.throws(() => f.shop.checkout(f.a, 'bad-price', { listingId: another, priceSatang: 1 }), { code: 'price-changed' })
    assert.throws(() => f.shop.checkout(f.a, 'low-funds', { listingId: another, priceSatang: 40000 }), { code: 'insufficient-balance' })
    assert.equal(f.shop.catalog().listings.find(item => item.id === another).status, 'available')
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM commerce_ledger').get().n, 1)
  } finally { f.close() }
})

test('reservation requires agreement, locks stock through grace and settles only the remainder once', () => {
  const f = fixture()
  try {
    f.open(); f.fund(f.a, 20000); f.fund(f.b, 20000)
    const id = f.listing(), input = { listingId: id, priceSatang: 10000, accepted: true }
    assert.throws(() => f.shop.reserve(f.a, 'no-terms', { ...input, accepted: false }), { code: 'reservation-terms-required' })
    const reservation = f.shop.reserve(f.a, 'reserve-1', input)
    assert.deepEqual(f.shop.reserve(f.a, 'reserve-1', input), reservation)
    assert.equal(wallet(f.db, 'a').balanceSatang, 15000)
    f.advance(13 * HOUR)
    assert.throws(() => f.shop.checkout(f.b, 'buy-grace', input), { code: 'listing-unavailable' })
    assert.throws(() => f.shop.settle(f.b, 'bad-owner', { reservationId: reservation.id }), { code: 'reservation-unavailable' })
    const settled = f.shop.settle(f.a, 'settle-1', { reservationId: reservation.id })
    assert.deepEqual(f.shop.settle(f.a, 'settle-1', { reservationId: reservation.id }), settled)
    assert.equal(wallet(f.db, 'a').balanceSatang, 10000)
    assert.equal(f.shop.account(f.a).orders.length, 1)
    assert.equal(f.shop.catalog().listings[0].status, 'sold')
  } finally { f.close() }
})

test('exact expiry forfeits once, releases stock and scopes the six-hour cooldown to user and listing', () => {
  const f = fixture()
  try {
    f.open(); f.fund(f.a, 50000); f.fund(f.b, 50000)
    const id = f.listing(), otherId = f.listing(), input = { listingId: id, priceSatang: 10000, accepted: true }
    const reservation = f.shop.reserve(f.a, 'reserve-a', input)
    f.advance(14 * HOUR)
    assert.throws(() => f.shop.settle(f.a, 'too-late', { reservationId: reservation.id }), { code: 'reservation-unavailable' })
    f.shop.sweep(); f.shop.sweep()
    assert.equal(wallet(f.db, 'a').balanceSatang, 45000)
    assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM commerce_ledger WHERE kind='reservation-forfeit'").get().n, 1)
    assert.throws(() => f.shop.reserve(f.a, 'cooldown-a', input), { code: 'reservation-cooldown' })
    f.shop.reserve(f.a, 'another-a', { ...input, listingId: otherId })
    const purchased = f.shop.checkout(f.a, 'buy-full-a', input)
    assert.ok(purchased.id)
    assert.equal(wallet(f.db, 'a').balanceSatang, 30000)
    const thirdId = f.listing()
    f.shop.reserve(f.a, 'third-a1', { ...input, listingId: thirdId })
    f.advance(14 * HOUR); f.shop.sweep()
    f.shop.reserve(f.b, 'third-b1', { ...input, listingId: thirdId })
    assert.equal(f.shop.account(f.b).reservations.length, 1)
  } finally { f.close() }
})

test('farm uses confirmed prices and measured progress; clients cannot invoke owner commands', () => {
  const f = fixture()
  try {
    f.open(); f.fund(f.a, 50000)
    assert.equal(quoteFarm(250000).priceSatang, 31000)
    assert.equal(quoteFarm(250000).estimateSeconds, 13889 * 120)
    assert.throws(() => quoteFarm(15000), { code: 'invalid-quantity' })
    const job = f.shop.orderFarm(f.a, 'farm-order-1', { diamonds: 20000, priceSatang: 4000, accepted: true })
    assert.equal(wallet(f.db, 'a').balanceSatang, 46000)
    assert.throws(() => f.shop.updateFarm(f.a, { id: job.id }), { code: 'forbidden' })
    assert.throws(() => f.shop.updateFarm(f.owner, { id: job.id, status: 'completed', note: 'complete' }), { code: 'completion-measurement-required' })
    f.shop.updateFarm(f.owner, { id: job.id, status: 'in-progress', measuredDiamonds: 5000, note: 'Measured 5000 diamonds' })
    const progress = f.shop.account(f.a).farmJobs[0]
    assert.equal(progress.measuredDiamonds, 5000)
    f.advance(48 * HOUR)
    assert.equal(f.shop.account(f.a).farmJobs[0].measuredDiamonds, 5000)
    f.shop.updateFarm(f.owner, { id: job.id, status: 'completed', measuredDiamonds: 20000, note: 'Measured goal completed' })
    assert.equal(f.shop.account(f.a).farmJobs[0].status, 'completed')
  } finally { f.close() }
})

test('owner reconciliation credits a verified receipt once and ledgers reject modification', () => {
  const f = fixture()
  try {
    f.db.prepare("INSERT INTO topups (id,user_id,key,voucher_hash,recipient_hash,status,created_at) VALUES ('review','a','reviewkey','reviewhash','recipient','needs-review',0)").run()
    const input = { id: 'review', confirmed: true, amountSatang: 12500, receipt: 'provider-receipt-1' }
    assert.throws(() => f.shop.reviewPayment(f.a, input), { code: 'forbidden' })
    f.shop.reviewPayment(f.owner, input)
    assert.equal(wallet(f.db, 'a').balanceSatang, 12500)
    assert.throws(() => f.shop.reviewPayment(f.owner, input), { code: 'topup-unavailable' })
    assert.throws(() => f.db.exec('DELETE FROM ledger'), /immutable ledger/)
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n, 1)
  } finally { f.close() }
})

test('HTTP endpoints ignore browser-supplied roles and never expose another customer order', async () => {
  const f = fixture(), origin = 'http://localhost:5173'
  const server = createApi({ db: f.db, origin, enabled: true, receive: async () => { throw new Error('must not call live provider') }, commerceOptions: { encryptionKey: f.key, adminIds: ['owner'] } })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const cookieA = issueSession(f.db, origin, 'a').split(';')[0], cookieB = issueSession(f.db, origin, 'b').split(';')[0]
  const request = (path, cookie, data) => fetch(base + path, { method: data ? 'POST' : 'GET', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), 'Idempotency-Key': 'http-buy-1' }, body: data ? JSON.stringify(data) : undefined })
  try {
    assert.equal((await request('/api/admin', cookieA)).status, 403)
    assert.equal((await request('/api/admin/settings', cookieA, { role: 'owner', isAdmin: true })).status, 403)
    assert.equal((await request('/api/purchase', null, {})).status, 401)
    f.open(); f.fund(f.a, 20000)
    const listingId = f.listing()
    const purchase = await request('/api/purchase', cookieA, { listingId, priceSatang: 10000 })
    assert.equal(purchase.status, 200)
    const { id } = await purchase.json()
    assert.equal((await request(`/api/orders/${id}/delivery`, cookieB, {})).status, 404)
    assert.equal((await request(`/api/orders/${id}/delivery`, cookieA, {})).status, 200)
    assert.equal((await (await request('/api/account', cookieB)).json()).orders.length, 0)
    assert.ok(!JSON.stringify(await (await request('/api/catalog')).json()).includes('SENSITIVE-FIXTURE'))
  } finally { await new Promise(resolve => server.close(resolve)); f.close() }
})


test('custom categories and bulk stock are atomic, replay-safe and keep each delivery private', () => {
  const f = fixture()
  try {
    const category = f.shop.saveCategory(f.owner, { name: 'ไอดีไก่ตัน' })
    assert.equal(f.shop.saveCategory(f.owner, { name: 'ไอดีไก่ตัน' }).id, category.id)
    assert.ok(f.shop.catalog().maps.some(item => item.id === category.id))
    assert.throws(() => f.shop.saveCategory(f.a, { name: 'No' }), { code: 'forbidden' })
    const templateId = f.listing()
    const template = f.shop.catalog().listings.find(item => item.id === templateId)
    const input = { ...template, mapId: category.id, deliveries: ['private-one:password-1', 'private-two:password-2'] }
    const result = f.shop.saveBatch(f.owner, 'batch-001', input)
    assert.deepEqual(f.shop.saveBatch(f.owner, 'batch-001', input), result)
    assert.equal(result.count, 2)
    const rows = f.shop.catalog().listings.filter(item => result.ids.includes(item.id))
    assert.equal(rows[0].groupId, rows[1].groupId)
    assert.throws(() => f.shop.saveBatch(f.a, 'batch-bad', input), { code: 'forbidden' })
    assert.throws(() => f.shop.saveBatch(f.owner, 'batch-001', { ...input, title: 'Changed' }), { code: 'idempotency-conflict' })
    assert.throws(() => f.shop.saveBatch(f.owner, 'batch-002', { ...input, deliveries: ['one', 'one'] }), { code: 'invalid-stock' })
    assert.throws(() => f.shop.saveBatch(f.owner, 'batch-003', { ...input, deliveries: ['valid', ''] }), { code: 'invalid-stock' })
    assert.equal(f.shop.catalog().listings.length, 3)
    assert.ok(!JSON.stringify(f.shop.catalog()).includes('private-one'))
    assert.ok(!JSON.stringify(f.shop.admin(f.owner)).includes('private-one'))
    assert.ok(!JSON.stringify(f.db.prepare('SELECT * FROM commands').all()).includes('private-one'))
    f.open(); f.fund(f.a, 50000); f.fund(f.b, 50000)
    const orderA = f.shop.checkout(f.a, 'stock-buy-a', { listingId: result.ids[0], priceSatang: input.priceSatang })
    f.shop.reserve(f.b, 'stock-res-b', { listingId: result.ids[1], priceSatang: input.priceSatang, accepted: true })
    assert.equal(f.shop.delivery(f.a, orderA.id).delivery, input.deliveries[0])
    assert.throws(() => f.shop.delivery(f.b, orderA.id), { code: 'not-found' })
    const refill = f.shop.saveBatch(f.owner, 'batch-refill', { templateId: result.ids[0], deliveries: ['private-three:password-3'] })
    assert.equal(f.shop.catalog().listings.find(item => item.id === refill.ids[0]).groupId, rows[0].groupId)
    assert.throws(() => f.shop.saveBatch(f.owner, 'batch-duplicate', { templateId: result.ids[0], deliveries: input.deliveries }), { code: 'duplicate-stock' })
    assert.equal(f.shop.catalog().listings.find(item => item.id === result.ids[1]).status, 'reserved')
  } finally { f.close() }
})


test('nested categories scope names by parent and preserve them across restart', () => {
  const f = fixture()
  try {
    const child = f.shop.saveCategory(f.owner, { name: 'ไก่ตัน', parentId: 'anime-adventures' })
    const other = f.shop.saveCategory(f.owner, { name: 'ไก่ตัน', parentId: 'anime-vanguards' })
    assert.notEqual(child.id, other.id)
    assert.equal(f.shop.saveCategory(f.owner, { name: 'ไก่ตัน', parentId: 'anime-adventures' }).id, child.id)
    assert.throws(() => f.shop.saveCategory(f.owner, { name: 'Bad', parentId: 'missing' }), { code: 'invalid-category' })
    const nested = f.shop.saveCategory(f.owner, { name: 'ระดับสูง', parentId: child.id })
    const restarted = createCommerce({ db: f.db, encryptionKey: f.key, adminIds: ['owner'] })
    assert.equal(restarted.catalog().maps.find(map => map.id === nested.id).parentId, child.id)
    assert.equal(restarted.catalog().maps.find(map => map.id === child.id).parentId, 'anime-adventures')
  } finally { f.close() }
})


test('category covers and deletion protect children, reservations and completed delivery', () => {
  const f = fixture()
  try {
    const parent = f.shop.saveCategory(f.owner, {name:'Parent',image:'https://example.invalid/cover.webp'})
    const child = f.shop.saveCategory(f.owner, {name:'Child',parentId:parent.id})
    assert.equal(f.shop.catalog().maps.find(m=>m.id===parent.id).image,'https://example.invalid/cover.webp')
    assert.throws(()=>f.shop.editCategory(f.a,{id:child.id,remove:true}),{code:'forbidden'})
    assert.throws(()=>f.shop.editCategory(f.owner,{id:parent.id,remove:true}),{code:'category-not-empty'})
    f.shop.editCategory(f.owner,{id:child.id,name:'Updated',image:'https://example.invalid/new.webp'})
    assert.equal(f.shop.catalog().maps.find(m=>m.id===child.id).name,'Updated')
    f.shop.editCategory(f.owner,{id:child.id,remove:true})
    assert.ok(!f.shop.catalog().maps.some(m=>m.id===child.id))
    const replacement=f.shop.saveCategory(f.owner,{name:'Updated',parentId:parent.id})
    assert.notEqual(replacement.id,child.id)
    f.open(); f.fund(f.a,50000)
    const id=f.listing()
    f.shop.reserve(f.a,'delete-res',{listingId:id,priceSatang:10000,accepted:true})
    assert.throws(()=>f.shop.removeProduct(f.owner,{id}),{code:'product-reserved'})
    const order=f.shop.settle(f.a,'delete-settle',{reservationId:f.shop.account(f.a).reservations[0].id})
    f.shop.removeProduct(f.owner,{id})
    assert.ok(!f.shop.catalog().listings.some(item=>item.id===id))
    assert.equal(f.shop.delivery(f.a,order.id).delivery,'SENSITIVE-FIXTURE-DELIVERY')
  } finally { f.close() }
})
