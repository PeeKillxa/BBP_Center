import { test } from 'node:test'
import assert from 'node:assert/strict'
import { redeemVoucher } from '../src/provider.mjs'

test('installed tw-voucher package receives the configured phone/code and parses the provider amount (mock HTTP)', async (t) => {
  const code = 'd'.repeat(35)
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    assert.equal(new URL(url).protocol, 'https:')
    assert.equal(options.method, 'POST')
    assert.deepEqual(JSON.parse(options.body), { mobile: '0800000000', voucher: code })
    return { json: async () => ({ status: { code: 'SUCCESS' }, data: { my_ticket: { amount_baht: '1,000.25' }, owner_profile: { full_name: 'Mock donor' } } }) }
  })
  const result = await redeemVoucher('0800000000', code)
  assert.equal(result.code, code)
  assert.equal(result.amount, 1000.25)
  assert.equal(calls, 1)
})
