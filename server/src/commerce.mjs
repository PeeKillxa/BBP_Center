import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import { PaymentError, wallet } from './payments.mjs'

export const MAPS = [
  { id: 'anime-adventures', name: 'Anime Adventures' },
  { id: 'anime-vanguards', name: 'Anime Vanguards' },
]
const HOUR = 3600000
const ANCHORS = [
  [10000, 2000],
  [20000, 4000],
  [30000, 6000],
  [50000, 10000],
  [100000, 16000],
  [120000, 18000],
  [250000, 31000],
]
export const RESERVATION_TERMS =
  'ชำระเงินจอง 50% ล็อกสินค้า 12 ชั่วโมงและผ่อนผัน 2 ชั่วโมง เมื่อครบ 14 ชั่วโมงโดยยังไม่ชำระ จะริบเงินจองและเปิดขายสินค้าอีกครั้ง จองสินค้าเดิมซ้ำไม่ได้ 6 ชั่วโมง แต่ซื้อเต็มจำนวนได้ เงินจองที่ริบไม่นำมาหักจากการซื้อครั้งใหม่'

export function quoteFarm(diamonds) {
  if (!Number.isSafeInteger(diamonds) || diamonds < 10000 || diamonds > 250000 || diamonds % 10000 !== 0)
    throw new PaymentError('invalid-quantity')
  for (let i = 1; i < ANCHORS.length; i++) {
    if (diamonds <= ANCHORS[i][0]) {
      const [d0, p0] = ANCHORS[i - 1],
        [d1, p1] = ANCHORS[i]
      return {
        diamonds,
        priceSatang: p0 + ((diamonds - d0) * (p1 - p0)) / (d1 - d0),
        estimateSeconds: Math.ceil(diamonds / 18) * 120,
      }
    }
  }
}

export function migrateCommerce(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE);
    CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, data BLOB NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS shop_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY, map_id TEXT NOT NULL, title TEXT NOT NULL, price_satang INTEGER NOT NULL CHECK(price_satang>0),
      description TEXT NOT NULL, images TEXT NOT NULL, attributes TEXT NOT NULL, transfer_terms TEXT NOT NULL, warranty TEXT NOT NULL,
      secret TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'available', created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), listing_id TEXT UNIQUE NOT NULL REFERENCES listings(id),
      title TEXT NOT NULL, price_satang INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), listing_id TEXT NOT NULL REFERENCES listings(id),
      title TEXT NOT NULL, price_satang INTEGER NOT NULL, deposit_satang INTEGER NOT NULL, created_at INTEGER NOT NULL,
      hold_ends_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, cooldown_until INTEGER NOT NULL,
      status TEXT NOT NULL, order_id TEXT REFERENCES orders(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_reservation ON reservations(listing_id) WHERE status='active';
    CREATE TABLE IF NOT EXISTS farm_jobs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), diamonds INTEGER NOT NULL, price_satang INTEGER NOT NULL,
      estimate_seconds INTEGER NOT NULL, status TEXT NOT NULL, measured_diamonds INTEGER,
      timeline TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS commerce_ledger (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount_satang INTEGER NOT NULL,
      kind TEXT NOT NULL, reference TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(kind,reference)
    );
    CREATE TABLE IF NOT EXISTS commands (
      user_id TEXT NOT NULL REFERENCES users(id), key TEXT NOT NULL, fingerprint TEXT NOT NULL, result TEXT NOT NULL,
      PRIMARY KEY(user_id,key)
    );
    CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, reference TEXT NOT NULL, at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS payment_reviews (topup_id TEXT PRIMARY KEY REFERENCES topups(id), receipt TEXT UNIQUE NOT NULL, actor_id TEXT NOT NULL, at INTEGER NOT NULL);
    CREATE TRIGGER IF NOT EXISTS ledger_no_update BEFORE UPDATE ON ledger BEGIN SELECT RAISE(ABORT,'immutable ledger'); END;
    CREATE TRIGGER IF NOT EXISTS ledger_no_delete BEFORE DELETE ON ledger BEGIN SELECT RAISE(ABORT,'immutable ledger'); END;
    CREATE TRIGGER IF NOT EXISTS commerce_ledger_no_update BEFORE UPDATE ON commerce_ledger BEGIN SELECT RAISE(ABORT,'immutable ledger'); END;
    CREATE TRIGGER IF NOT EXISTS commerce_ledger_no_delete BEFORE DELETE ON commerce_ledger BEGIN SELECT RAISE(ABORT,'immutable ledger'); END;
  `)
  if (!db.prepare('PRAGMA table_info(listings)').all().some(column => column.name === 'group_id'))
    db.exec('ALTER TABLE listings ADD COLUMN group_id TEXT')
  if (!db.prepare('PRAGMA table_info(categories)').all().some(column => column.name === 'parent_id')) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE categories_tree (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE, parent_id TEXT);
      INSERT INTO categories_tree (id,name) SELECT id,name FROM categories;
      DROP TABLE categories;
      ALTER TABLE categories_tree RENAME TO categories;
      CREATE UNIQUE INDEX category_sibling_name ON categories(COALESCE(parent_id,''),name COLLATE NOCASE);
      COMMIT;`)
  }
  if (!db.prepare('PRAGMA table_info(listings)').all().some(column => column.name === 'hidden')) db.exec('ALTER TABLE listings ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0')
  for (const column of ['image TEXT', 'deleted INTEGER NOT NULL DEFAULT 0']) {
    const name = column.split(' ')[0]
    if (!db.prepare('PRAGMA table_info(categories)').all().some(item => item.name === name)) db.exec('ALTER TABLE categories ADD COLUMN ' + column)
  }
  db.exec("DROP INDEX IF EXISTS category_sibling_name; CREATE UNIQUE INDEX category_sibling_name ON categories(COALESCE(parent_id,''),name COLLATE NOCASE) WHERE deleted=0;")
  for (const map of MAPS) db.prepare('INSERT OR IGNORE INTO categories (id,name) VALUES (?,?)').run(map.id, map.name)
}

export function createCommerce({ db, encryptionKey, adminIds = [], now = Date.now }) {
  migrateCommerce(db)
  const isAdmin = (user) => Boolean(user && adminIds.includes(user.id))
  const requireAdmin = (user) => {
    if (!isAdmin(user)) throw new PaymentError('forbidden', 403)
  }
  const audit = (actor, action, reference) =>
    db.prepare('INSERT INTO audit_log VALUES (?,?,?,?,?)').run(randomUUID(), actor, action, reference, now())
  const transaction = (fn) => {
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
  const settings = () => {
    const values = Object.fromEntries(
      db
        .prepare('SELECT * FROM shop_settings')
        .all()
        .map((row) => [row.key, row.value]),
    )
    return {
      contactUrl: values.contactUrl ?? '',
      terms: values.terms ?? '',
      farmTerms: values.farmTerms ?? '',
      open: values.open === 'true' && Boolean(values.contactUrl && values.terms),
    }
  }
  const requireOpen = () => {
    if (!settings().open) throw new PaymentError('shop-closed', 409)
  }
  const requireBalance = (userId, amount) => {
    if (wallet(db, userId).balanceSatang < amount) throw new PaymentError('insufficient-balance', 409)
  }
  // Explicit column list protects ledger writes from schema changes.
  const movement = (userId, amount, kind, ref) =>
    db
      .prepare('INSERT INTO commerce_ledger (id,user_id,amount_satang,kind,reference,created_at) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), userId, amount, kind, ref, now())
  const encrypt = (value) => {
    if (!Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32)
      throw new PaymentError('delivery-not-configured', 503)
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', encryptionKey, iv)
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
  }
  const decrypt = (value) => {
    const data = Buffer.from(value, 'base64'),
      decipher = createDecipheriv('aes-256-gcm', encryptionKey, data.subarray(0, 12))
    decipher.setAuthTag(data.subarray(12, 28))
    return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8')
  }
  const publicListing = (row) =>
    row && {
      id: row.id,
      groupId: row.group_id ?? row.id,
      mapId: row.map_id,
      title: row.title,
      priceSatang: row.price_satang,
      description: row.description,
      images: JSON.parse(row.images),
      attributes: JSON.parse(row.attributes),
      transferTerms: row.transfer_terms,
      warranty: row.warranty,
      status: row.status,
    }
  const record = (row) =>
    row &&
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        key === 'timeline' ? JSON.parse(value) : value,
      ]),
    )
  const once = (userId, key, fingerprint, fn) =>
    transaction(() => {
      if (!/^[A-Za-z0-9-]{8,100}$/.test(key ?? '')) throw new PaymentError('invalid-idempotency-key')
      const prior = db.prepare('SELECT * FROM commands WHERE user_id=? AND key=?').get(userId, key)
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new PaymentError('idempotency-conflict', 409)
        return JSON.parse(prior.result)
      }
      const result = fn()
      db.prepare('INSERT INTO commands VALUES (?,?,?,?)').run(userId, key, fingerprint, JSON.stringify(result))
      return result
    })
  const sweep = () =>
    transaction(() => {
      for (const row of db.prepare("SELECT * FROM reservations WHERE status='active' AND expires_at<=?").all(now())) {
        db.prepare("UPDATE reservations SET status='forfeited' WHERE id=?").run(row.id)
        db.prepare("UPDATE listings SET status='available' WHERE id=? AND status='reserved'").run(row.listing_id)
        movement(row.user_id, 0, 'reservation-forfeit', row.id)
      }
    })
  const listingForSale = (id, expectedPrice) => {
    const row = db.prepare('SELECT * FROM listings WHERE id=?').get(id)
    if (!row || row.status !== 'available') throw new PaymentError('listing-unavailable', 409)
    if (row.price_satang !== expectedPrice) throw new PaymentError('price-changed', 409)
    return row
  }
  const order = (userId, row) => {
    const id = randomUUID()
    db.prepare('INSERT INTO orders VALUES (?,?,?,?,?,?)').run(id, userId, row.id, row.title, row.price_satang, now())
    db.prepare("UPDATE listings SET status='sold' WHERE id=?").run(row.id)
    return { id }
  }
  const checkout = (user, key, input) => {
    sweep()
    return once(user.id, key, JSON.stringify(['buy', input.listingId, input.priceSatang]), () => {
      requireOpen()
      const row = listingForSale(input.listingId, input.priceSatang)
      requireBalance(user.id, row.price_satang)
      const result = order(user.id, row)
      movement(user.id, -row.price_satang, 'purchase', result.id)
      return result
    })
  }
  const reserve = (user, key, input) => {
    sweep()
    return once(user.id, key, JSON.stringify(['reserve', input.listingId, input.priceSatang, input.accepted]), () => {
      requireOpen()
      if (input.accepted !== true) throw new PaymentError('reservation-terms-required')
      const row = listingForSale(input.listingId, input.priceSatang)
      if (row.price_satang % 2) throw new PaymentError('invalid-price')
      if (
        db
          .prepare(
            "SELECT id FROM reservations WHERE user_id=? AND listing_id=? AND status='forfeited' AND cooldown_until>?",
          )
          .get(user.id, row.id, now())
      )
        throw new PaymentError('reservation-cooldown', 409)
      const deposit = row.price_satang / 2,
        id = randomUUID(),
        at = now()
      requireBalance(user.id, deposit)
      db.prepare(
        'INSERT INTO reservations (id,user_id,listing_id,title,price_satang,deposit_satang,created_at,hold_ends_at,expires_at,cooldown_until,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      ).run(
        id,
        user.id,
        row.id,
        row.title,
        row.price_satang,
        deposit,
        at,
        at + 12 * HOUR,
        at + 14 * HOUR,
        at + 20 * HOUR,
        'active',
      )
      db.prepare("UPDATE listings SET status='reserved' WHERE id=?").run(row.id)
      movement(user.id, -deposit, 'reservation-deposit', id)
      return { id }
    })
  }
  const settle = (user, key, input) => {
    sweep()
    return once(user.id, key, JSON.stringify(['settle', input.reservationId]), () => {
      const row = db
        .prepare("SELECT * FROM reservations WHERE id=? AND user_id=? AND status='active'")
        .get(input.reservationId, user.id)
      if (!row) throw new PaymentError('reservation-unavailable', 409)
      const remainder = row.price_satang - row.deposit_satang
      requireBalance(user.id, remainder)
      const result = order(user.id, { id: row.listing_id, title: row.title, price_satang: row.price_satang })
      movement(user.id, -remainder, 'reservation-remainder', row.id)
      db.prepare("UPDATE reservations SET status='settled',order_id=? WHERE id=?").run(result.id, row.id)
      return result
    })
  }
  const orderFarm = (user, key, input) =>
    once(user.id, key, JSON.stringify(['farm', input.diamonds, input.priceSatang, input.accepted]), () => {
      requireOpen()
      if (!settings().farmTerms || input.accepted !== true) throw new PaymentError('farm-terms-required')
      const quote = quoteFarm(input.diamonds)
      if (input.priceSatang !== quote.priceSatang) throw new PaymentError('price-changed', 409)
      requireBalance(user.id, quote.priceSatang)
      const id = randomUUID(),
        at = now(),
        timeline = [{ at, text: 'รับคำสั่งซื้อบริการแล้ว' }]
      db.prepare(
        'INSERT INTO farm_jobs (id,user_id,diamonds,price_satang,estimate_seconds,status,timeline,created_at) VALUES (?,?,?,?,?,?,?,?)',
      ).run(
        id,
        user.id,
        quote.diamonds,
        quote.priceSatang,
        quote.estimateSeconds,
        'queued',
        JSON.stringify(timeline),
        at,
      )
      movement(user.id, -quote.priceSatang, 'farm-order', id)
      return { id }
    })
  const insertListing = (user, input, groupId = null) => {
    requireAdmin(user)
    const text = (value, max = 5000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
    if (
      typeof input.mapId !== 'string' || !db.prepare('SELECT id FROM categories WHERE id=? AND deleted=0').get(input.mapId) ||
      !text(input.title, 200) ||
      !text(input.description) ||
      !text(input.transferTerms) ||
      !text(input.warranty) ||
      !text(input.delivery, 10000) ||
      !Number.isSafeInteger(input.priceSatang) ||
      input.priceSatang <= 0 ||
      input.priceSatang > 100000000 ||
      input.priceSatang % 2 ||
      !Array.isArray(input.images) ||
      !input.images.length ||
      input.images.length > 8 ||
      !input.images.every((image) => {
        if (typeof image !== 'string') return false
        const local = /^\/api\/media\/([a-f0-9-]{36})\.webp$/.exec(image)
        if (local) return Boolean(db.prepare('SELECT id FROM media WHERE id=?').get(local[1]))
        try {
          return new URL(image).protocol === 'https:' && image.length < 2048
        } catch {
          return false
        }
      })
    )
      throw new PaymentError('invalid-listing')
    const attributes = Array.isArray(input.attributes) ? input.attributes : []
    if (
      attributes.length > 30 ||
      !attributes.every((attribute) => text(attribute.label, 100) && text(attribute.value, 500))
    )
      throw new PaymentError('invalid-listing')
    const id = randomUUID()
    {
      db.prepare(
        'INSERT INTO listings (id,map_id,title,price_satang,description,images,attributes,transfer_terms,warranty,secret,status,created_at,group_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      ).run(
        id,
        input.mapId,
        input.title.trim(),
        input.priceSatang,
        input.description,
        JSON.stringify(input.images),
        JSON.stringify(attributes),
        input.transferTerms,
        input.warranty,
        encrypt(input.delivery),
        'available',
        now(),
        groupId ?? id,
      )
      audit(user.id, 'listing-created', id)
    }
    return { id }
  }
  const saveListing = (user, input) => transaction(() => insertListing(user, input))
  const saveBatch = (user, key, input) => {
    requireAdmin(user)
    // Store only a digest of the command: account credentials must never enter the replay log.
    const fingerprint = createHash('sha256').update(JSON.stringify(['stock', input])).digest('hex')
    return once(user.id, key, fingerprint, () => {
      if (!Array.isArray(input.deliveries) || !input.deliveries.length || input.deliveries.length > 100 ||
          !input.deliveries.every(value => typeof value === 'string' && value.trim() && value.length <= 10000) ||
          new Set(input.deliveries.map(value => value.trim())).size !== input.deliveries.length)
        throw new PaymentError('invalid-stock')
      let template = input, groupId = randomUUID()
      if (input.templateId) {
        if (typeof input.templateId !== 'string') throw new PaymentError('invalid-stock')
        const row = db.prepare('SELECT * FROM listings WHERE id=?').get(input.templateId)
        if (!row) throw new PaymentError('not-found', 404)
        template = publicListing(row)
        groupId = row.group_id ?? row.id
        const existing = new Set(db.prepare('SELECT secret FROM listings WHERE COALESCE(group_id,id)=?').all(groupId).map(item => decrypt(item.secret).trim()))
        if (input.deliveries.some(value => existing.has(value.trim()))) throw new PaymentError('duplicate-stock', 409)
      }
      const ids = input.deliveries.map(delivery => insertListing(user, { ...template, delivery }, groupId).id)
      return { ids, count: ids.length }
    })
  }
  const saveCategory = (user, input) => {
    requireAdmin(user)
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80)
      throw new PaymentError('invalid-category')
    return transaction(() => {
      const name = input.name.trim()
      const parentId = input.parentId ?? null
      if (parentId !== null && (typeof parentId !== 'string' || !db.prepare('SELECT id FROM categories WHERE id=? AND deleted=0').get(parentId))) throw new PaymentError('invalid-category')
      const existing = db.prepare('SELECT id,name,parent_id AS parentId FROM categories WHERE name=? AND parent_id IS ? AND deleted=0').get(name, parentId)
      if (existing) return existing
      const image = input.image || null
      if (image && (typeof image !== 'string' || image.length > 2048 || !(/^https:\/\//.test(image) || /^\/api\/media\/[a-f0-9-]{36}\.webp$/.test(image)))) throw new PaymentError('invalid-image')
      const id = randomUUID()
      db.prepare('INSERT INTO categories (id,name,parent_id,image) VALUES (?,?,?,?)').run(id, name, parentId, image)
      audit(user.id, 'category-created', id)
      return { id, name, parentId }
    })
  }
  const editCategory = (user, input) => {
    requireAdmin(user)
    return transaction(() => {
      const row = db.prepare('SELECT * FROM categories WHERE id=? AND deleted=0').get(input.id ?? '')
      if (!row) throw new PaymentError('not-found', 404)
      if (input.remove === true) {
        if (db.prepare('SELECT id FROM categories WHERE parent_id=? AND deleted=0').get(row.id) ||
            db.prepare("SELECT id FROM listings WHERE map_id=? AND status IN ('available','reserved')").get(row.id)) throw new PaymentError('category-not-empty', 409)
        db.prepare('UPDATE categories SET deleted=1 WHERE id=?').run(row.id)
        audit(user.id, 'category-removed', row.id)
        return { ok: true }
      }
      if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80) throw new PaymentError('invalid-category')
      const image = input.image || null
      if (image && (typeof image !== 'string' || image.length > 2048 || !(/^https:\/\//.test(image) || /^\/api\/media\/[a-f0-9-]{36}\.webp$/.test(image)))) throw new PaymentError('invalid-image')
      if (db.prepare('SELECT id FROM categories WHERE name=? AND parent_id IS ? AND id!=? AND deleted=0').get(input.name.trim(), row.parent_id, row.id)) throw new PaymentError('category-name-exists', 409)
      db.prepare('UPDATE categories SET name=?,image=? WHERE id=?').run(input.name.trim(), image, row.id)
      audit(user.id, 'category-updated', row.id)
      return { ok: true }
    })
  }
  const removeProduct = (user, input) => {
    requireAdmin(user)
    return transaction(() => {
      const row = db.prepare('SELECT * FROM listings WHERE id=?').get(input.id ?? '')
      if (!row) throw new PaymentError('not-found', 404)
      const group = row.group_id ?? row.id
      if (db.prepare("SELECT id FROM listings WHERE COALESCE(group_id,id)=? AND status='reserved'").get(group)) throw new PaymentError('product-reserved', 409)
      db.prepare("UPDATE listings SET status='archived' WHERE COALESCE(group_id,id)=? AND status='available'").run(group)
      db.prepare('UPDATE listings SET hidden=1 WHERE COALESCE(group_id,id)=?').run(group)
      audit(user.id, 'product-removed', group)
      return { ok: true }
    })
  }
  const saveSettings = (user, input) => {
    requireAdmin(user)
    if (
      typeof input.contactUrl !== 'string' ||
      typeof input.terms !== 'string' ||
      typeof input.farmTerms !== 'string' ||
      input.terms.length > 10000 ||
      input.farmTerms.length > 10000 ||
      typeof input.open !== 'boolean'
    )
      throw new PaymentError('invalid-settings')
    if (input.contactUrl && (input.contactUrl.length > 2048 || !/^https:\/\//.test(input.contactUrl)))
      throw new PaymentError('invalid-settings')
    try {
      if (input.contactUrl && new URL(input.contactUrl).protocol !== 'https:') throw new Error()
    } catch {
      throw new PaymentError('invalid-settings')
    }
    if (input.open && (!input.contactUrl || !input.terms.trim())) throw new PaymentError('shop-details-required')
    transaction(() => {
      for (const key of ['contactUrl', 'terms', 'farmTerms', 'open'])
        db.prepare('INSERT INTO shop_settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(
          key,
          String(input[key]),
        )
      audit(user.id, 'settings-updated', 'shop')
    })
    return settings()
  }
  const archiveListing = (user, input) => {
    requireAdmin(user)
    return transaction(() => {
      const row = db.prepare("SELECT id FROM listings WHERE id=? AND status='available'").get(input.id)
      if (!row) throw new PaymentError('listing-unavailable', 409)
      db.prepare("UPDATE listings SET status='archived' WHERE id=?").run(row.id)
      audit(user.id, 'listing-archived', row.id)
      return { id: row.id }
    })
  }
  const account = (user) => {
    sweep()
    return {
      orders: db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC').all(user.id).map(record),
      reservations: db
        .prepare('SELECT * FROM reservations WHERE user_id=? ORDER BY created_at DESC')
        .all(user.id)
        .map(record),
      farmJobs: db.prepare('SELECT * FROM farm_jobs WHERE user_id=? ORDER BY created_at DESC').all(user.id).map(record),
      transactions: db
        .prepare(
          'SELECT id, amount_satang, kind, reference, created_at FROM commerce_ledger WHERE user_id=? ORDER BY created_at DESC',
        )
        .all(user.id)
        .map(record),
    }
  }
  const delivery = (user, id) => {
    const row = db
      .prepare(
        'SELECT listings.secret FROM orders JOIN listings ON listings.id=orders.listing_id WHERE orders.id=? AND orders.user_id=?',
      )
      .get(id, user.id)
    if (!row) throw new PaymentError('not-found', 404)
    const result = decrypt(row.secret)
    audit(user.id, 'delivery-viewed', id)
    return { delivery: result }
  }
  const updateFarm = (user, input) => {
    requireAdmin(user)
    if (
      !['queued', 'in-progress', 'awaiting-customer', 'completed'].includes(input.status) ||
      typeof input.note !== 'string' ||
      !input.note.trim() ||
      input.note.length > 1000
    )
      throw new PaymentError('invalid-job-update')
    return transaction(() => {
      const row = db.prepare('SELECT * FROM farm_jobs WHERE id=?').get(input.id)
      if (!row || row.status === 'completed') throw new PaymentError('job-unavailable', 409)
      const measured =
        input.measuredDiamonds === null || input.measuredDiamonds === undefined
          ? row.measured_diamonds
          : input.measuredDiamonds
      if (
        measured !== null &&
        (!Number.isSafeInteger(measured) ||
          measured < 0 ||
          measured > row.diamonds ||
          measured < (row.measured_diamonds ?? 0))
      )
        throw new PaymentError('invalid-progress')
      if (input.status === 'completed' && measured !== row.diamonds)
        throw new PaymentError('completion-measurement-required')
      const timeline = [...JSON.parse(row.timeline), { at: now(), text: input.note.trim() }]
      db.prepare('UPDATE farm_jobs SET status=?,measured_diamonds=?,timeline=? WHERE id=?').run(
        input.status,
        measured,
        JSON.stringify(timeline),
        row.id,
      )
      audit(user.id, 'farm-updated', row.id)
      return { id: row.id }
    })
  }
  const reviewPayment = (user, input) => {
    requireAdmin(user)
    if (
      input.confirmed !== true ||
      !Number.isSafeInteger(input.amountSatang) ||
      input.amountSatang <= 0 ||
      input.amountSatang > 100000000 ||
      typeof input.receipt !== 'string' ||
      !input.receipt.trim() ||
      input.receipt.length > 200
    )
      throw new PaymentError('invalid-payment-review')
    return transaction(() => {
      const row = db.prepare("SELECT * FROM topups WHERE id=? AND status='needs-review'").get(input.id)
      if (!row) throw new PaymentError('topup-unavailable', 409)
      if (db.prepare('SELECT topup_id FROM payment_reviews WHERE receipt=?').get(input.receipt.trim()))
        throw new PaymentError('receipt-already-used', 409)
      db.prepare('INSERT INTO payment_reviews VALUES (?,?,?,?)').run(row.id, input.receipt.trim(), user.id, now())
      db.prepare('INSERT INTO ledger VALUES (?,?,?,?,?)').run(
        randomUUID(),
        row.user_id,
        row.id,
        input.amountSatang,
        now(),
      )
      db.prepare("UPDATE topups SET status='success',amount_satang=? WHERE id=?").run(input.amountSatang, row.id)
      audit(user.id, 'payment-reconciled', row.id)
      return { id: row.id }
    })
  }
  const admin = (user) => {
    requireAdmin(user)
    sweep()
    return {
      settings: settings(),
      listings: db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all().map(publicListing),
      farmJobs: db
        .prepare(
          'SELECT farm_jobs.*, users.email FROM farm_jobs JOIN users ON users.id=farm_jobs.user_id ORDER BY created_at DESC',
        )
        .all()
        .map(record),
      pendingPayments: db
        .prepare(
          "SELECT topups.id,topups.created_at,users.email FROM topups JOIN users ON users.id=topups.user_id WHERE topups.status='needs-review' ORDER BY topups.created_at",
        )
        .all()
        .map(record),
    }
  }
  const catalog = () => {
    sweep()
    return {
      serverTime: now(),
      maps: db.prepare('SELECT id,name,parent_id AS parentId,image FROM categories WHERE deleted=0 ORDER BY rowid').all(),
      listings: db
        .prepare("SELECT * FROM listings WHERE status!='archived' AND hidden=0 ORDER BY created_at DESC")
        .all()
        .map(publicListing),
      settings: settings(),
      reservationTerms: RESERVATION_TERMS,
      packages: [10000, 20000, 50000, 100000, 250000].map(quoteFarm),
    }
  }
  return {
    isAdmin,
    settings,
    requireOpen,
    catalog,
    checkout,
    reserve,
    settle,
    orderFarm,
    saveListing,
    saveBatch,
    saveCategory,
    editCategory,
    removeProduct,
    archiveListing,
    saveSettings,
    account,
    delivery,
    updateFarm,
    reviewPayment,
    admin,
    sweep,
  }
}
