import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { randomBytes } from 'node:crypto'
import { openDatabase } from '../src/payments.mjs'
import { createApi } from '../src/api.mjs'
import { issueSession } from '../src/sessions.mjs'

test('image upload requires admin and Origin, validates pixels, serves persistent sanitized media', async () => {
  const db = openDatabase(':memory:'), origin = 'http://localhost:5173'
  for (const id of ['owner', 'buyer']) db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(id, `${id}@example.invalid`, 'test', 'test')
  const server = createApi({ db, origin, enabled: false, commerceOptions: { adminIds: ['owner'], encryptionKey: randomBytes(32) } })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const owner = issueSession(db, origin, 'owner').split(';')[0], buyer = issueSession(db, origin, 'buyer').split(';')[0]
  const request = (path, data, cookie = owner, extra = {}) => fetch(base + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie, ...extra }, body: JSON.stringify(data) })
  try {
    const pixels = await sharp({ create: { width: 2500, height: 100, channels: 3, background: '#234567' } }).png().toBuffer()
    const data = pixels.toString('base64')
    assert.equal((await request('/api/admin/images', { data }, '')).status, 401)
    assert.equal((await request('/api/admin/images', { data }, buyer)).status, 403)
    assert.equal((await request('/api/admin/images', { data }, owner, { Origin: 'https://other.invalid' })).status, 403)
    for (const bad of ['<svg></svg>', 'not an image']) assert.equal((await request('/api/admin/images', { data: Buffer.from(bad).toString('base64') })).status, 400)
    const response = await request('/api/admin/images', { data })
    assert.equal(response.status, 200)
    const { url } = await response.json()
    const downloaded = await fetch(base + url)
    assert.equal(downloaded.headers.get('content-type'), 'image/webp')
    assert.equal(downloaded.headers.get('x-content-type-options'), 'nosniff')
    const metadata = await sharp(Buffer.from(await downloaded.arrayBuffer())).metadata()
    assert.equal(metadata.width, 1920)
    assert.equal(metadata.exif, undefined)
    assert.equal(db.prepare('SELECT count(*) AS n FROM media').get().n, 1)
    assert.equal((await fetch(base + '/api/media/00000000-0000-0000-0000-000000000000.webp')).status, 404)
    assert.equal((await request('/api/admin/categories', { name: 'No' }, buyer)).status, 403)
    assert.equal((await request('/api/admin/stock', {}, buyer)).status, 403)
    const category = await (await request('/api/admin/categories', { name: 'New category' })).json()
    const input = { mapId: category.id, title: 'Photo listing', priceSatang: 2000, description: 'Description', images: [url], transferTerms: 'Terms', warranty: 'Warranty', deliveries: ['account:private-password'] }
    const created = await request('/api/admin/stock', input, owner, { 'Idempotency-Key': 'photo-stock' })
    assert.equal(created.status, 200)
    assert.equal((await created.json()).count, 1)
    const catalog = await (await fetch(base + '/api/catalog')).json()
    assert.equal(catalog.listings[0].images[0], url)
    assert.ok(!JSON.stringify(catalog).includes('private-password'))
  } finally { await new Promise(resolve => server.close(resolve)); db.close() }
})
