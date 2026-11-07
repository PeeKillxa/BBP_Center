import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowUpRight, Gem, Sprout, PackageOpen, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Button, ButtonLink, Card, EmptyState, Notice, PageHeader, Field, Badge } from '../components/ui'
import { formatTHB } from '../lib/money'
import { formatDurationTH } from '../lib/time'
import { idempotencyKey } from '../lib/idempotency'
import { api, type Listing, type Quote } from './api'
import { useAction, useShop } from './context'
import { CatalogSkeleton } from '../components/CatalogSkeleton'
import { InventoryTools, groupListings, categoryPath, CategoryCard } from './Inventory'

const statusText: Record<string, string> = { available: 'พร้อมขาย', reserved: 'จองแล้ว', sold: 'ขายแล้ว' }
export function ListingCard({ listing }: { listing: Listing & { stock?: number } }) {
  return (
    <Card as="article" lift className="self-start overflow-hidden">
      <Link className="block" to={`/listing/${listing.id}`}>
        <div className="listing-media">
          <img src={listing.images[0]} alt={listing.title} className="aspect-square w-full bg-surface-2 object-contain" loading="lazy" />
          <span className="listing-shine" aria-hidden="true" />
        </div>
        <div className="space-y-2 p-4">
          <Badge tone={listing.status === 'available' ? 'success' : 'neutral'}>{statusText[listing.status]}</Badge>
          <h3 className="font-bold">{listing.title}</h3>
          {listing.stock !== undefined && <p className="text-sm text-muted">เหลือ {listing.stock} บัญชี</p>}
          <p className="flex items-center justify-between text-lg font-bold text-accent">{formatTHB(listing.priceSatang)}<ArrowUpRight className="size-4 opacity-60" aria-hidden="true" /></p>
        </div>
      </Link>
      <div className="px-4 pb-3"><InventoryTools template={listing} /></div>
    </Card>
  )
}
export function Home() {
  const { catalog, loading } = useShop()
  return (
    <div className="space-y-12">
      <section className="premium-hero cinematic-hero relative isolate overflow-hidden rounded-[2rem] border border-line px-6 py-12 sm:p-12 lg:py-20">
        <div className="hero-light" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-scanline" aria-hidden="true" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="hero-copy space-y-6">
            <p className="eyebrow flex items-center gap-2"><Sparkles className="size-3.5" aria-hidden="true" /> BBP CENTER / ROBLOX STORE</p>
            <h1 className="text-4xl leading-[1.08] font-black tracking-[-.045em] sm:text-6xl">เลือกไอดีที่ใช่<br /><span className="hero-gradient-text">แล้วเข้าเกมให้สุด</span></h1>
            <p className="max-w-lg text-base leading-relaxed text-muted sm:text-lg">เลือกไอดีที่ใช่ แล้วไปต่อในเกมที่ชอบ<br />ไอดี Roblox และบริการฟาร์ม ดูแลโดยทีม BBP Center</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/maps" size="lg" icon={<Gem className="size-5" />}>เลือกซื้อไอดี</ButtonLink>
              <ButtonLink to="/farm" size="lg" variant="secondary" icon={<Sprout className="size-5" />}>บริการฟาร์ม</ButtonLink>
            </div>
            <div className="hero-trust flex flex-wrap gap-3 pt-3 text-xs text-muted"><span><ShieldCheck /> ผู้ให้บริการโดยตรง</span><span><Zap /> ส่งมอบเป็นระบบ</span><span><Sparkles /> ติดตามงานได้</span></div>
          </div>
          <div className="hero-brand relative mx-auto flex aspect-square w-full max-w-[380px] items-center justify-center">
            <div className="brand-halo" aria-hidden="true" />
            <div className="brand-float">
              <img src="/brand/bbp-center-logo.png" alt="BBP Center" className="brand-intro block w-full object-contain" width="320" height="320" />
            </div>
          </div>
        </div>
      </section>
      <section>
        <p className="eyebrow mb-2">CHOOSE YOUR WORLD</p><h2 className="mb-6 text-2xl font-bold sm:text-3xl">หมวดหมู่เกม</h2>
        <InventoryTools />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {catalog?.maps.filter(map => !map.parentId).map((map) => (
            <CategoryCard key={map.id} category={map} />
          ))}
        </div>
      </section>
      <section>
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="eyebrow mb-2">READY TO PLAY</p><h2 className="text-2xl font-bold sm:text-3xl">ไอดีพร้อมขาย</h2></div><Link to="/maps" className="group flex items-center gap-1 text-sm text-accent">ดูทั้งหมด <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link></div>
        {loading && <CatalogSkeleton />}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {groupListings(catalog?.listings ?? [])
            .filter((item) => item.status === 'available')
            .slice(0, 4)
            .map((item) => (
              <ListingCard key={item.groupId ?? item.id} listing={item} />
            ))}
        </div>
        {catalog && !catalog.listings.some((item) => item.status === 'available') && (
          <EmptyState icon={<PackageOpen />} title="ยังไม่มีไอดีพร้อมขาย" body="กลับมาตรวจรายการใหม่ได้ภายหลัง" />
        )}
      </section>
      <section>
        <p className="eyebrow mb-2">HOW IT WORKS</p><h2 className="mb-6 text-2xl font-bold sm:text-3xl">เริ่มเล่นได้ใน 4 ขั้นตอน</h2>
        <div className="process-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['เข้าสู่ระบบ', 'เติมเงินผ่าน TrueMoney', 'เลือกซื้อหรือจองสินค้า', 'รับข้อมูลส่งมอบ / ติดตามงาน'].map(
            (step, i) => (
              <Card key={step} className="process-card p-5">
                <span className="process-number">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{step}</h3>
              </Card>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
export function Maps() {
  const { catalog, loading } = useShop(),
    { mapId } = useParams()
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('all'),
    [sort, setSort] = useState('new'),
    [max, setMax] = useState('')
  const title = catalog?.maps.find((map) => map.id === mapId)?.name ?? 'ไอดีทุกเกม'
  const listings = groupListings(catalog?.listings ?? [])
    .filter(
      (item) =>
        (!mapId || mapId === 'all' || categoryPath(catalog?.maps ?? [], item.mapId).some(map => map.id === mapId)) &&
        (status === 'all' || item.status === status) &&
        item.title.toLowerCase().includes(query.toLowerCase()) &&
        (!max || item.priceSatang <= Number(max) * 100),
    )
    .sort((a, b) =>
      sort === 'asc' ? a.priceSatang - b.priceSatang : sort === 'desc' ? b.priceSatang - a.priceSatang : 0,
    )
  return (
    <>
      <p className="eyebrow mb-3">EXPLORE THE COLLECTION</p>
      <PageHeader title={title} />
      <nav aria-label="เส้นทางหมวดหมู่" className="mb-4 flex flex-wrap gap-2 text-accent">
        <Link to="/maps">หมวดหมู่ทั้งหมด</Link>
        {categoryPath(catalog?.maps ?? [], mapId).map(map => <span key={map.id}> / <Link to={`/maps/${map.id}`}>{map.name}</Link></span>)}
      </nav>
      <InventoryTools key={mapId ?? 'root'} mapId={mapId} />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {catalog?.maps.filter(map => (map.parentId ?? null) === (mapId && mapId !== 'all' ? mapId : null)).map(map => <CategoryCard key={map.id} category={map} />)}
      </div>
      <Card className="mb-6 grid gap-4 p-4 sm:grid-cols-4">
        <Field label="ค้นหาไอดี" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Field label="ราคาสูงสุด (บาท)" type="number" min="0" value={max} onChange={(e) => setMax(e.target.value)} />
        <label className="space-y-2 text-sm">
          สถานะ
          <select
            className="h-11 w-full rounded-xl border border-line bg-surface px-3"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">ทุกสถานะ</option>
            {Object.entries(statusText).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          เรียงลำดับ
          <select
            className="h-11 w-full rounded-xl border border-line bg-surface px-3"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="new">ล่าสุด</option>
            <option value="asc">ราคาต่ำไปสูง</option>
            <option value="desc">ราคาสูงไปต่ำ</option>
          </select>
        </label>
      </Card>
      {loading ? (
        <CatalogSkeleton />
      ) : listings.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((item) => (
            <ListingCard key={item.groupId ?? item.id} listing={item} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<PackageOpen />} title="ไม่พบสินค้าที่ตรงเงื่อนไข" />
      )}
    </>
  )
}
export function ListingDetail() {
  const { id } = useParams(),
    { catalog, session, reload, loading } = useShop(),
    nav = useNavigate(),
    action = useAction()
  const original = catalog?.listings.find((item) => item.id === id)
  const siblings = catalog?.listings.filter(item => (item.groupId ?? item.id) === (original?.groupId ?? original?.id)) ?? []
  const listing = siblings.find(item => item.status === 'available') ?? original
  const [accepted, setAccepted] = useState(false),
    [image, setImage] = useState(0)
  const buyKey = useMemo(() => idempotencyKey(), [listing?.id]),
    reserveKey = useMemo(() => idempotencyKey(), [listing?.id])
  if (loading) return <CatalogSkeleton />
  if (!listing) return <PageHeader title="ไม่พบสินค้านี้" />
  const submit = (reserve: boolean) =>
    void action.run(async () => {
      const result = await api<{ id: string }>(
        reserve ? '/reservations' : '/purchase',
        { listingId: listing.id, priceSatang: listing.priceSatang, accepted },
        reserve ? reserveKey : buyKey,
      )
      await reload()
      nav(reserve ? `/account/reservations/${result.id}` : `/account/orders/${result.id}`)
    })
  return (
    <>
      <PageHeader title={listing.title} />
      <InventoryTools template={listing} />
      <p className="mb-4 text-muted">เหลือ {siblings.filter(item => item.status === 'available').length} บัญชี</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <img
            src={listing.images[image] ?? listing.images[0]}
            alt={listing.title}
            className="aspect-square w-full rounded-2xl bg-surface-2 object-contain"
          />
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {listing.images.map((src, i) => (
              <button
                key={src}
                onClick={() => setImage(i)}
                aria-label={`ดูภาพ ${i + 1}`}
                aria-pressed={image === i}
                className="shrink-0 rounded-lg border border-line"
              >
                <img src={src} alt="" className="h-16 w-24 rounded-lg bg-surface-2 object-contain" />
              </button>
            ))}
          </div>
          <p className="mt-5 whitespace-pre-wrap">{listing.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            {listing.attributes.map((attribute) => (
              <div key={attribute.label}>
                <dt className="text-sm text-muted">{attribute.label}</dt>
                <dd>{attribute.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Card className="h-fit space-y-4 p-6">
          <Badge>{statusText[listing.status]}</Badge>
          <p className="text-4xl font-bold">{formatTHB(listing.priceSatang)}</p>
          <h2 className="font-bold">เงื่อนไขการโอน</h2>
          <p className="whitespace-pre-wrap text-sm">{listing.transferTerms}</p>
          <h2 className="font-bold">การรับประกัน</h2>
          <p className="whitespace-pre-wrap text-sm">{listing.warranty}</p>
          {!session.user ? (
            <ButtonLink to="/login">เข้าสู่ระบบเพื่อทำรายการ</ButtonLink>
          ) : (
            <>
              <Button
                className="w-full"
                loading={action.busy}
                disabled={listing.status !== 'available' || !catalog?.settings.open}
                onClick={() => submit(false)}
              >
                ยืนยันซื้อเต็มจำนวน {formatTHB(listing.priceSatang)}
              </Button>
              <Notice tone="warning" title="เงื่อนไขการจอง">
                {catalog?.reservationTerms}
              </Notice>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-5 shrink-0"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                ฉันยอมรับเงื่อนไขการจองและการริบเงินจอง
              </label>
              <Button
                className="w-full"
                variant="secondary"
                loading={action.busy}
                disabled={!accepted || listing.status !== 'available' || !catalog?.settings.open}
                onClick={() => submit(true)}
              >
                จอง 50% · {formatTHB(listing.priceSatang / 2)}
              </Button>
            </>
          )}
          {action.error && (
            <p role="alert" className="text-danger">
              {action.error}
            </p>
          )}
          <Link to="/wallet" className="block text-sm text-accent underline">
            เติมเงิน / ดูยอดคงเหลือ
          </Link>
        </Card>
      </div>
    </>
  )
}
export function Farm() {
  const { serviceId } = useParams()
  const { catalog, session, reload } = useShop(),
    nav = useNavigate(),
    action = useAction()
  const [diamonds, setDiamonds] = useState('10000'),
    [quote, setQuote] = useState<Quote | null>(null),
    [quoteError, setQuoteError] = useState(''),
    [accepted, setAccepted] = useState(false)
  const key = useMemo(() => idempotencyKey(), [diamonds])
  useEffect(() => {
    let active = true
    setQuote(null)
    setQuoteError('')
    setAccepted(false)
    const timer = window.setTimeout(() => {
      api<Quote>(`/farm/quote?diamonds=${encodeURIComponent(diamonds)}`)
        .then((result) => {
          if (active) setQuote(result)
        })
        .catch((failure) => {
          if (active) setQuoteError(failure.message)
        })
    }, 200)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [diamonds])
  if (serviceId && serviceId !== 'aa-diamond') return <PageHeader title="บริการนี้ยังไม่เปิดรับคำสั่งซื้อ" />
  return (
    <>
      <div className="mb-8 rounded-3xl border border-line bg-surface p-6 sm:p-8"><p className="eyebrow mb-3">BBP FARM SERVICE</p><PageHeader title="ให้เราดูแลการฟาร์มของคุณ" subtitle="ฟาร์มเพชร Anime Adventures · เลือกแพ็กเกจและตรวจยอดก่อนยืนยัน" /><ol className="grid gap-4 text-sm sm:grid-cols-3">{['เลือกจำนวนเพชร', 'อ่านเงื่อนไขและยืนยันยอด', 'ติดตามงานในบัญชีของฉัน'].map((text,index) => <li key={text} className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent">{index+1}</span>{text}</li>)}</ol></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3">
            {catalog?.packages.map((item) => (
              <button
                key={item.diamonds}
                aria-pressed={Number(diamonds) === item.diamonds}
                onClick={() => setDiamonds(String(item.diamonds))}
                className={`rounded-xl border p-4 text-left ${Number(diamonds) === item.diamonds ? 'border-accent bg-accent-soft' : 'border-line'}`}
              >
                <b className="block">{item.diamonds.toLocaleString('th-TH')} เพชร</b>
                {formatTHB(item.priceSatang)}
              </button>
            ))}
          </div>
          <Field
            label="จำนวนเพชร"
            type="number"
            min="10000"
            max="250000"
            step="10000"
            value={diamonds}
            onChange={(e) => setDiamonds(e.target.value)}
            hint="ขั้นต่ำ 10,000 สูงสุด 250,000 เพิ่มทีละ 10,000"
          />
          {quoteError && (
            <p role="alert" className="text-danger">
              {quoteError}
            </p>
          )}
        </Card>
        <Card className="h-fit space-y-4 p-6 lg:sticky lg:top-24">
          {!quote && !quoteError && <p role="status" className="skeleton h-16 rounded-xl"><span className="sr-only">กำลังคำนวณราคา</span></p>}
          {quote && (
            <>
              <p className="text-xs text-muted">ราคารวมบริการ</p><p className="text-4xl font-extrabold text-accent">{formatTHB(quote.priceSatang)}</p>
              <p>เวลาฟาร์มประมาณ {formatDurationTH(quote.estimateSeconds)}</p>
              <p className="text-sm text-muted">
                คิดจาก 18 เพชรต่อรอบ รอบละ 2 นาที รวม rejoin ไม่รวมคิว เวลายืนยันบัญชี และเหตุขัดข้อง
              </p>
            </>
          )}
          <h2 className="font-bold">เงื่อนไขบริการ</h2>
          {catalog?.settings.farmTerms ? (
            <p className="whitespace-pre-wrap text-sm">{catalog.settings.farmTerms}</p>
          ) : (
            <p className="text-muted">บริการนี้ยังไม่เปิดรับคำสั่งซื้อ</p>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            ฉันอ่านและยอมรับเงื่อนไขบริการแล้ว
          </label>
          {session.user ? (
            <Button
              className="w-full"
              loading={action.busy}
              disabled={!quote || !accepted || !catalog?.settings.open || !catalog?.settings.farmTerms}
              onClick={() =>
                void action.run(async () => {
                  const result = await api<{ id: string }>(
                    '/farm/orders',
                    { diamonds: quote!.diamonds, priceSatang: quote!.priceSatang, accepted },
                    key,
                  )
                  await reload()
                  nav(`/account/farm/${result.id}`)
                })
              }
            >
              ยืนยันสั่งฟาร์ม{quote ? ` ${formatTHB(quote.priceSatang)}` : ''}
            </Button>
          ) : (
            <ButtonLink to="/login">เข้าสู่ระบบเพื่อสั่งบริการ</ButtonLink>
          )}
          {action.error && (
            <p role="alert" className="text-danger">
              {action.error}
            </p>
          )}
        </Card>
      </div>
    </>
  )
}
export function Help() {
  const { catalog } = useShop()
  return (
    <>
      <PageHeader title="ติดต่อและเงื่อนไขบริการ" />
      <Card className="space-y-5 p-6">
        {catalog?.settings.contactUrl ? (
          <a
            href={catalog.settings.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            ติดต่อร้าน BBP Center
          </a>
        ) : (
          <p>ขณะนี้ยังไม่มีช่องทางติดต่อที่เปิดให้บริการ</p>
        )}
        <h2 className="text-lg font-bold">เงื่อนไขร้าน</h2>
        <p className="whitespace-pre-wrap">{catalog?.settings.terms || 'ร้านยังไม่เปิดรับคำสั่งซื้อ'}</p>
        <h2 className="text-lg font-bold">เงื่อนไขการจอง</h2>
        <p>{catalog?.reservationTerms}</p>
        <h2 className="text-lg font-bold">การโอนและรับประกัน</h2>
        <p>ดูเงื่อนไขเฉพาะของแต่ละรายการในหน้ารายละเอียดสินค้าก่อนยืนยันซื้อ</p>
      </Card>
    </>
  )
}
