import { CircleAlert, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ListingCard } from '../components/shop'
import { Button, EmptyState, PageHeader, Skeleton } from '../components/ui'
import type { ListingStatus } from '../domain/types'
import { parseBahtInput } from '../lib/money'
import { setState, useDemo } from '../store/store'
import { NotFound } from './NotFound'

type Sort = 'new' | 'price-asc' | 'price-desc'
const selectCls = 'h-10 rounded-xl border border-line bg-surface px-3 text-sm'

export function MapListings() {
  const { mapId = 'all' } = useParams()
  const s = useDemo()
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const q = params.get('q') ?? ''
  const status = (params.get('status') ?? 'all') as ListingStatus | 'all'
  const sort = (params.get('sort') ?? 'new') as Sort
  const min = params.get('min') ?? ''
  const max = params.get('max') ?? ''

  useEffect(() => {
    setLoading(true)
    const t = window.setTimeout(() => setLoading(false), s.demo.latencyMs)
    return () => window.clearTimeout(t)
  }, [mapId, s.demo.latencyMs])

  const map = s.maps.find((m) => m.id === mapId)
  if (mapId !== 'all' && !map) return <NotFound />

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v && v !== 'all') p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }
  const minS = min ? parseBahtInput(min) : null
  const maxS = max ? parseBahtInput(max) : null
  const priceErr = (min && minS === null) || (max && maxS === null) ? 'กรอกราคาเป็นตัวเลข' : minS !== null && maxS !== null && minS > maxS ? 'ราคาต่ำสุดต้องไม่เกินราคาสูงสุด' : null

  const needle = q.trim().toLowerCase()
  const items = s.listings
    .filter((l) => mapId === 'all' || l.mapId === mapId)
    .filter((l) => status === 'all' || l.status === status)
    .filter((l) => !needle || [l.title, ...l.highlights, ...l.attributes.map((a) => `${a.label} ${a.value}`)].join(' ').toLowerCase().includes(needle))
    .filter((l) => priceErr || ((minS === null || l.priceSatang >= minS) && (maxS === null || l.priceSatang <= maxS)))
    .sort((a, b) => (sort === 'price-asc' ? a.priceSatang - b.priceSatang : sort === 'price-desc' ? b.priceSatang - a.priceSatang : b.createdAt - a.createdAt))

  return (
    <>
      <nav aria-label="breadcrumb" className="mb-2 text-sm text-muted">
        <Link to="/maps" className="hover:text-ink">หมวดหมู่แมพ</Link> / <span className="text-ink">{map?.name ?? 'ทุกแมพ'}</span>
      </nav>
      <PageHeader title={map ? `ไอดี ${map.name}` : 'ไอดีทุกแมพ'} subtitle={map?.tagline} />

      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="เลือกแมพ">
        {[{ id: 'all', name: 'ทั้งหมด' }, ...s.maps].map((m) => (
          <Link key={m.id} role="tab" aria-selected={m.id === mapId} to={`/maps/${m.id}${params.toString() ? `?${params}` : ''}`} className={`rounded-full border px-4 py-1.5 text-sm ${m.id === mapId ? 'border-accent bg-accent-soft font-semibold text-ink' : 'border-line text-muted hover:text-ink'}`}>
            {m.name}
          </Link>
        ))}
      </div>

      <form className="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => e.preventDefault()} aria-label="ตัวกรอง">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label htmlFor="f-q" className="text-xs font-medium text-muted">ค้นหา</label>
          <input id="f-q" value={q} onChange={(e) => set('q', e.target.value)} placeholder="ชื่อไอดี คุณสมบัติ" className={selectCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-status" className="text-xs font-medium text-muted">สถานะ</label>
          <select id="f-status" value={status} onChange={(e) => set('status', e.target.value)} className={selectCls}>
            <option value="all">ทุกสถานะ</option>
            <option value="available">พร้อมขาย</option>
            <option value="reserved">จอง</option>
            <option value="sold">ขายแล้ว</option>
          </select>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs font-medium text-muted">ช่วงราคา (บาท)</legend>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="f-min">ราคาต่ำสุด</label>
            <input id="f-min" inputMode="decimal" value={min} onChange={(e) => set('min', e.target.value)} placeholder="ต่ำสุด" className={`${selectCls} w-full`} aria-invalid={!!priceErr || undefined} aria-describedby={priceErr ? 'f-price-err' : undefined} />
            <label className="sr-only" htmlFor="f-max">ราคาสูงสุด</label>
            <input id="f-max" inputMode="decimal" value={max} onChange={(e) => set('max', e.target.value)} placeholder="สูงสุด" className={`${selectCls} w-full`} aria-invalid={!!priceErr || undefined} aria-describedby={priceErr ? 'f-price-err' : undefined} />
          </div>
          {priceErr && <p id="f-price-err" role="alert" className="text-xs text-danger">{priceErr} (ยังไม่กรองราคา)</p>}
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-sort" className="text-xs font-medium text-muted">เรียงลำดับ</label>
          <select id="f-sort" value={sort} onChange={(e) => set('sort', e.target.value)} className={selectCls}>
            <option value="new">ใหม่ล่าสุด</option>
            <option value="price-asc">ราคาต่ำ → สูง</option>
            <option value="price-desc">ราคาสูง → ต่ำ</option>
          </select>
        </div>
      </form>

      {s.demo.simulateLoadError ? (
        <EmptyState
          icon={<CircleAlert className="size-10 text-danger" aria-hidden />}
          title="โหลดรายการไม่สำเร็จ"
          body="นี่คือสถานะจำลองจาก Demo Controls ลองใหม่อีกครั้ง"
          action={<Button onClick={() => setState((x) => ({ ...x, demo: { ...x.demo, simulateLoadError: false } }))}>ลองใหม่</Button>}
        />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="กำลังโหลด">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-line">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="space-y-2 p-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-6 w-1/4" /></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<SearchX className="size-10" aria-hidden />} title="ไม่พบไอดีที่ตรงกับเงื่อนไข" body="ลองเปลี่ยนคำค้น สถานะ หรือช่วงราคา" action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>ล้างตัวกรอง</Button>} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted" aria-live="polite">พบ {items.length} รายการ</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((l) => <ListingCard key={l.id} listing={l} map={s.maps.find((m) => m.id === l.mapId)} />)}
          </div>
        </>
      )}
    </>
  )
}
