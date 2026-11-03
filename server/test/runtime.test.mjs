import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createApi } from '../src/api.mjs'
import { openDatabase } from '../src/payments.mjs'
import { deliveryKey, staticApp } from '../src/runtime.mjs'

test('delivery key is persistent and the static app cannot expose server files or credentials', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bbp-runtime-'))
  const databasePath = join(directory, 'shop.sqlite')
  const db = openDatabase(databasePath)
  const key = deliveryKey(databasePath)
  assert.equal(key.length, 32)
  assert.deepEqual(deliveryKey(databasePath), key)
  const server = createApi({ db, origin: 'http://localhost', enabled: false, receive: async () => { throw new Error('disabled') }, staticHandler: staticApp(resolve('../app/dist')) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const response = await fetch(base + '/')
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.ok(html.includes('BBP Center'))
    assert.ok(!/โหมดสาธิต|Demo Controls/.test(html))
    for (const path of ['/server/.env', '/%2e%2e%5cserver%5c.env', '/src/commerce.mjs']) {
      const file = await fetch(base + path)
      assert.ok(file.status === 404 || file.headers.get('content-type')?.includes('text/html'))
      assert.ok(!(await file.text()).includes('TRUEMONEY_RECIPIENT_PHONE'))
    }
    assert.equal((await fetch(base + '/api/admin')).status, 401)
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); rmSync(directory, { recursive: true }) }
})
