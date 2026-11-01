import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Gem, MessageCircle, PackageCheck, Sparkles, Star, UserPlus, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { ContactButtons } from '../components/ContactButtons'
import { ListingArt, ListingCard, SampleTag } from '../components/shop'
import { ButtonLink, Card } from '../components/ui'
import { FARM_SERVICES, SERVICE_KIND_LABEL } from '../config/farming'
import { formatDurationTH } from '../lib/time'
import { estimateDiamondFarm, priceForDiamonds } from '../domain/farming'
import { formatTHB } from '../lib/money'
import { useDemo } from '../store/store'
import { Logo } from '../components/Logo'
import { FAQ } from './Help'

function Particles() {
  const reduce = useReducedMotion()
  const dots = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 100, d: 6 + (i % 5) * 2, s: 2 + (i % 3) })), [])
  if (reduce) return null
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block" aria-hidden>
      {dots.map((p, i) => (
        <motion.span key={i} className="absolute rounded-full bg-cyan-300/60" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }} animate={{ y: [0, -18, 0], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: p.d, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }} />
      ))}
    </div>
  )
}

const STEPS = [
  { icon: UserPlus, title: 'สมัครสมาชิก', body: 'ใช้อีเมล Google หรือ Discord' },
  { icon: Wallet, title: 'เติมเงิน', body: 'โอน/QR แนบสลิป หรืออั่งเปา TrueMoney' },
  { icon: Gem, title: 'เลือกซื้อ', body: 'ซื้อเต็มจำนวน จอง 50% หรือสั่งฟาร์ม' },
  { icon: PackageCheck, title: 'รับสินค้า / ติดตามงาน', body: 'ดูข้อมูลส่งมอบและสถานะงานในบัญชี' },
]

export function Home() {
  const s = useDemo()
  const featured = s.listings.filter((l) => l.status === 'available').slice(0, 4)
  const diamond = FARM_SERVICES.find((x) => x.kind === 'diamond')!
  return (
    <div className="space-y-16">
      <section className="relative -mx-4 -mt-6 overflow-hidden border-b border-line px-4 py-16 sm:py-24">
        <div className="hero-gradient absolute inset-0" aria-hidden />
        <Particles />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: [0.05, 0.7, 0.1, 1] }}>
            <Logo size={112} withText={false} />
          </motion.div>
          <motion.h1 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }} className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            BBP <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Center</span>
          </motion.h1>
          <motion.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="max-w-xl text-lg text-muted">
            ร้านขายไอดี Roblox และบริการรับฟาร์ม สำหรับ Anime Adventures และ Anime Vanguards
          </motion.p>
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/maps" size="lg" icon={<Gem className="size-5" aria-hidden />}>เลือกซื้อไอดี</ButtonLink>
            <ButtonLink to="/farm" size="lg" variant="secondary" icon={<Sparkles className="size-5" aria-hidden />}>สั่งฟาร์ม</ButtonLink>
          </motion.div>
        </div>
      </section>

      <section aria-labelledby="h-maps">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="h-maps" className="text-2xl font-bold">หมวดหมู่แมพ</h2>
          <Link to="/maps" className="text-sm text-accent hover:underline">ดูทั้งหมด</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {s.maps.map((m) => (
            <Card key={m.id} lift className="overflow-hidden">
              <Link to={`/maps/${m.id}`} className="flex items-center gap-4">
                <ListingArt hue={m.hue} label={m.name} className="w-36 shrink-0 sm:w-48" />
                <div className="py-3 pr-4">
                  <h3 className="text-lg font-bold">{m.name}</h3>
                  <p className="text-sm text-muted">{m.tagline}</p>
                  <p className="mt-2 text-sm text-accent">{s.listings.filter((l) => l.mapId === m.id && l.status === 'available').length} รายการพร้อมขาย →</p>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="h-feat">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="h-feat" className="text-2xl font-bold">ไอดีแนะนำ</h2>
          <Link to="/maps/all" className="text-sm text-accent hover:underline">ดูไอดีทั้งหมด</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((l) => <ListingCard key={l.id} listing={l} map={s.maps.find((m) => m.id === l.mapId)} />)}
        </div>
      </section>

      <section aria-labelledby="h-farm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 id="h-farm" className="text-2xl font-bold">บริการฟาร์มยอดนิยม</h2>
          <SampleTag>ราคาเสนอสำหรับต้นแบบ · รอร้านยืนยัน</SampleTag>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {diamond.diamond!.packages.map((d) => {
            const p = priceForDiamonds(d, diamond.diamond!)
            return (
              <Card key={d} lift>
                <Link to={`/farm/${diamond.id}?d=${d}`} className="flex flex-col gap-1 p-5">
                  <span className="text-xs text-accent">{SERVICE_KIND_LABEL.diamond} · Anime Adventures</span>
                  <span className="text-2xl font-extrabold tabular-nums">{d.toLocaleString('th-TH')} <Gem className="inline size-5 text-accent" aria-label="เพชร" /></span>
                  <span className="text-lg font-bold">{p.ok ? formatTHB(p.satang) : '—'}</span>
                  <span className="text-xs text-muted">เวลาฟาร์มประมาณ {formatDurationTH(estimateDiamondFarm(d, diamond.diamond!.rate).seconds)}</span>
                </Link>
              </Card>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="h-steps">
        <h2 id="h-steps" className="mb-4 text-2xl font-bold">ขั้นตอนใช้งาน</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: I, title, body }, i) => (
            <li key={title}>
              <Card className="flex h-full gap-3 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><I className="size-5" aria-hidden /></span>
                <div>
                  <p className="font-semibold"><span className="text-muted">{i + 1}.</span> {title}</p>
                  <p className="text-sm text-muted">{body}</p>
                </div>
              </Card>
              {i < STEPS.length - 1 && <ArrowRight className="mx-auto hidden size-4 text-muted" aria-hidden />}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="h-rev">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="h-rev" className="text-2xl font-bold">รีวิว</h2>
          <SampleTag>ข้อมูลตัวอย่างในต้นแบบ ไม่ใช่รีวิวจริง</SampleTag>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {s.reviews.slice(0, 3).map((r) => (
            <Card key={r.id} className="p-5">
              <div className="mb-2 flex items-center gap-1" aria-label={`${r.rating} จาก 5 ดาว`}>
                {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-line'}`} aria-hidden />)}
              </div>
              <p>{r.text}</p>
              <p className="mt-2 text-xs text-muted">{r.displayName}{r.sample ? ' · ตัวอย่าง' : ' · ผู้ซื้อที่มีคำสั่งซื้อสำเร็จ'}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="h-faq" className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 id="h-faq" className="mb-4 text-2xl font-bold">คำถามที่พบบ่อย</h2>
          <FAQ />
        </div>
        <Card className="h-fit p-5">
          <h3 className="mb-2 flex items-center gap-2 font-bold"><MessageCircle className="size-5 text-accent" aria-hidden /> ติดต่อร้าน</h3>
          <ContactButtons />
        </Card>
      </section>
    </div>
  )
}
