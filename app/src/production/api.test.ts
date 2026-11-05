import { afterEach, expect, it, vi } from 'vitest'
import { api } from './api'
afterEach(() => {
  vi.unstubAllGlobals()
})
it('announces only confirmed purchase responses, never a failed or pending payment', async () => {
  const dispatch = vi.fn()
  vi.stubGlobal('window', { dispatchEvent: dispatch })
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: 'insufficient-balance' }) }),
  )
  await expect(api('/purchase', { listingId: 'test' })).rejects.toThrow()
  expect(dispatch).not.toHaveBeenCalled()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 202, json: async () => ({ topup: { status: 'processing' } }) }),
  )
  await api('/topups/truemoney', { voucher: 'test' })
  expect(dispatch).not.toHaveBeenCalled()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'confirmed-order' }) }),
  )
  await api('/purchase', { listingId: 'test' })
  expect(dispatch).toHaveBeenCalledTimes(1)
  expect(dispatch.mock.calls[0][0].type).toBe('bbp-success')
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ topup: { status: 'success' } }) }),
  )
  await api('/topups/truemoney', { voucher: 'test' })
  expect(dispatch).toHaveBeenCalledTimes(2)
})
