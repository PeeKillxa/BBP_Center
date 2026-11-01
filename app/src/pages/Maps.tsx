import { Link } from 'react-router'
import { ListingArt } from '../components/shop'
import { Card, PageHeader } from '../components/ui'
import { useDemo } from '../store/store'

export function Maps() {
  const s = useDemo()
  return (
    <>
      <PageHeader title="หมวดหมู่แมพ" subtitle="เลือกแมพเพื่อดูไอดีที่เกี่ยวข้อง" />
      <div className="grid gap-5 sm:grid-cols-2">
        {s.maps.map((m) => {
          const ls = s.listings.filter((l) => l.mapId === m.id)
          return (
            <Card key={m.id} lift className="overflow-hidden">
              <Link to={`/maps/${m.id}`} className="block">
                <ListingArt hue={m.hue} label={m.name} />
                <div className="p-5">
                  <h2 className="text-xl font-bold">{m.name}</h2>
                  <p className="text-muted">{m.tagline}</p>
                  <p className="mt-3 text-sm">
                    <span className="text-success">พร้อมขาย {ls.filter((l) => l.status === 'available').length}</span>
                    <span className="text-muted"> · จอง {ls.filter((l) => l.status === 'reserved').length} · ขายแล้ว {ls.filter((l) => l.status === 'sold').length}</span>
                  </p>
                </div>
              </Link>
            </Card>
          )
        })}
      </div>
      <p className="mt-6 text-sm text-muted">
        หรือ <Link className="text-accent underline" to="/maps/all">ดูไอดีทุกแมพ</Link>
      </p>
    </>
  )
}
