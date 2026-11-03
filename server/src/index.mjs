import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createApi } from './api.mjs'
import { createPayments, openDatabase } from './payments.mjs'
import { redeemVoucher } from './provider.mjs'

const origin = new URL(process.env.APP_ORIGIN ?? 'http://localhost:5173').origin
const phone = process.env.TRUEMONEY_RECIPIENT_PHONE?.trim()
const enabled = process.env.TRUEMONEY_ENABLED === 'true'
if (enabled && !/^0[689]\d{8}$/.test(phone ?? '')) throw new Error('Configure TRUEMONEY_RECIPIENT_PHONE before enabling payments')
if (process.env.NODE_ENV === 'production' && !origin.startsWith('https://')) throw new Error('Production requires an HTTPS APP_ORIGIN')
const databasePath = resolve(process.env.DATABASE_PATH ?? './data/bbp.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })
const db = openDatabase(databasePath)
const receive = createPayments({ db, phone, redeem: redeemVoucher })
const server = createApi({ db, receive, origin, enabled })
server.listen(Number(process.env.PORT ?? 3001), '127.0.0.1', () => {
  console.info(`BBP payment server ready at http://127.0.0.1:${server.address().port}; payments ${enabled ? 'enabled' : 'disabled'}`)
})
