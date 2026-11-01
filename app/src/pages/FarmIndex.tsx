import { Clock, Gem } from 'lucide-react'
import { Link } from 'react-router'
import { SampleTag } from '../components/shop'
import { Badge, Card, PageHeader } from '../components/ui'
import { FARM_SERVICES, SERVICE_KIND_LABEL } from '../config/farming'
import { useDemo } from '../store/store'

export function FarmIndex() {
  const s = useDemo()
  return (
    <>
      <PageHeader title="บริการฟาร์ม" subtitle="แยกตามแมพและชนิดบริการ" />
      <div className="space-y-10">
        {s.maps.map((m) => {
          const svcs = FARM_SERVICES.filter((x) => x.mapId === m.id)
          return (
            <section key={m.id} aria-labelledby={`fm-${m.id}`}>
              <h2 id={`fm-${m.id}`} className="mb-3 text-xl font-bold">{m.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {svcs.map((x) => (
                  <Card key={x.id} lift className="h-full">
                    <Link to={`/farm/${x.id}`} className="flex h-full flex-col gap-2 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent" icon={<Gem className="size-3.5" aria-hidden />}>{SERVICE_KIND_LABEL[x.kind]}</Badge>
                        {x.orderable ? <SampleTag>ราคาเสนอ · รอร้านยืนยัน</SampleTag> : <Badge tone="neutral" icon={<Clock className="size-3.5" aria-hidden />}>{x.pendingReason}</Badge>}
                      </div>
                      <h3 className="text-lg font-semibold">{x.name}</h3>
                      <p className="text-sm text-muted">{x.summary}</p>
                      <span className="mt-auto pt-2 text-sm text-accent">{x.orderable ? 'เลือกแพ็กเกจ →' : 'ดูรายละเอียด →'}</span>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
