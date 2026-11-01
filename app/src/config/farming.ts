/**
 * Farming service configuration. Every price, rate, limit, and status here is data,
 * not code: the real system should load this from the backend.
 *
 * Source: docs/Markdown.md §6 (supersedes conflicting values in Prompt_.txt).
 */
export type FarmServiceKind = 'diamond' | 'secret-unit' | 'level'

export interface PriceAnchor {
  diamonds: number
  priceBaht: number
}

export interface DiamondRateConfig {
  diamondsPerRound: number
  secondsPerRound: number // includes rejoin time
}

export interface DiamondPricingConfig {
  anchors: PriceAnchor[] // ascending by diamonds
  packages: number[] // diamond amounts shown as package cards
  custom: {
    min: number
    step: number
    /** Highest orderable amount. Markdown.md defines no cap; the last price anchor is used because no extrapolation rule exists. */
    max: number
    maxIsConfirmed: false
  }
  rate: DiamondRateConfig
  pricesConfirmedByOwner: boolean
}

export interface FarmServiceConfig {
  id: string
  mapId: string
  kind: FarmServiceKind
  name: string
  summary: string
  /** Orderable only when the shop has defined prices/details. */
  orderable: boolean
  pendingReason?: string
  diamond?: DiamondPricingConfig
}

export const SERVICE_KIND_LABEL: Record<FarmServiceKind, string> = {
  diamond: 'ฟาร์มเพชร',
  'secret-unit': 'หาตัวลับ',
  level: 'ฟาร์มเลเวล',
}

const PENDING = 'รอร้านกำหนดรายละเอียด'

export const FARM_SERVICES: FarmServiceConfig[] = [
  {
    id: 'aa-diamond',
    mapId: 'anime-adventures',
    kind: 'diamond',
    name: 'ฟาร์มเพชร Anime Adventures',
    summary: 'เลือกแพ็กเกจหรือกำหนดจำนวนเพชรเอง พร้อมเวลาฟาร์มประมาณ',
    orderable: true,
    diamond: {
      anchors: [
        { diamonds: 10_000, priceBaht: 20 },
        { diamonds: 20_000, priceBaht: 40 },
        { diamonds: 30_000, priceBaht: 60 },
        { diamonds: 50_000, priceBaht: 100 },
        { diamonds: 100_000, priceBaht: 160 },
        { diamonds: 120_000, priceBaht: 180 },
      ],
      packages: [10_000, 20_000, 30_000, 50_000, 100_000, 120_000],
      custom: { min: 10_000, step: 10_000, max: 120_000, maxIsConfirmed: false },
      rate: { diamondsPerRound: 18, secondsPerRound: 120 },
      pricesConfirmedByOwner: false,
    },
  },
  {
    id: 'aa-secret',
    mapId: 'anime-adventures',
    kind: 'secret-unit',
    name: 'หาตัวลับ Anime Adventures',
    summary: 'ราคา ระยะเวลา และเงื่อนไข ' + PENDING,
    orderable: false,
    pendingReason: PENDING,
  },
  {
    id: 'aa-level',
    mapId: 'anime-adventures',
    kind: 'level',
    name: 'ฟาร์มเลเวล Anime Adventures',
    summary: 'ราคา ระยะเวลา และเงื่อนไข ' + PENDING,
    orderable: false,
    pendingReason: PENDING,
  },
  {
    id: 'av-secret',
    mapId: 'anime-vanguards',
    kind: 'secret-unit',
    name: 'หาตัวลับ Anime Vanguards',
    summary: 'ราคา ระยะเวลา และเงื่อนไข ' + PENDING,
    orderable: false,
    pendingReason: PENDING,
  },
  {
    id: 'av-level',
    mapId: 'anime-vanguards',
    kind: 'level',
    name: 'ฟาร์มเลเวล Anime Vanguards',
    summary: 'ราคา ระยะเวลา และเงื่อนไข ' + PENDING,
    orderable: false,
    pendingReason: PENDING,
  },
]

export const getFarmService = (id: string) => FARM_SERVICES.find((s) => s.id === id)
