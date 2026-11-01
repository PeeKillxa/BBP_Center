import { History } from 'lucide-react'
import { useState } from 'react'
import { TopUpBadge } from '../../components/shop'
import { Badge, Card, EmptyState } from '../../components/ui'
import type { LedgerKind } from '../../domain/types'
import { formatTHB } from '../../lib/money'
import { formatDateTime } from '../../lib/time'
import { cn } from '../../lib/util'
import { useCurrentUser, useDemo } from '../../store/store'
import { AccountShell } from './AccountNav'

const KIND: Record<LedgerKind, string> = {
  topup: 'เติมเงิน',
  purchase: 'ซื้อไอดี',
  'reservation-deposit': 'เงินจอง 50%',
  'reservation-remainder': 'ชำระยอดคงเหลือ',
  'reservation-forfeit': 'ริบเงินจอง',
  'farm-order': 'สั่งฟาร์ม',
  'demo-adjust': 'ปรับยอด (สาธิต)',
}

export function Transactions() {
  const s = useDemo()
  const user = useCurrentUser()
  const [tab, setTab] = useState<'ledger' | 'topups'>('ledger')
  const ledger = s.ledger.filter((e) => e.userId === user?.id).sort((a, b) => b.at - a.at)
  const topups = s.topups.filter((t) => t.userId === user?.id)
  return (
    <AccountShell title="ประวัติธุรกรรม" subtitle="ยอดเข้าออกกระเป๋าเงินและสถานะเติมเงินแยกกัน">
      <div role="tablist" className="mb-4 inline-flex rounded-xl border border-line bg-surface-2 p-1">
        {([['ledger', 'ยอดเข้า/ออก'], ['topups', 'การเติมเงิน']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('rounded-lg px-4 py-2 text-sm', tab === k ? 'bg-surface font-semibold shadow-sm' : 'text-muted')}>{label}</button>
        ))}
      </div>
      {tab === 'ledger' ? (
        ledger.length === 0 ? <EmptyState icon={<History className="size-8" aria-hidden />} title="ยังไม่มีธุรกรรม" /> : (
          <Card className="divide-y divide-line">
            {ledger.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <Badge tone={e.kind === 'reservation-forfeit' ? 'danger' : e.amountSatang > 0 ? 'success' : 'neutral'}>{KIND[e.kind]}</Badge>
                  <p className="mt-1 text-sm">{e.note}</p>
                  <p className="text-xs text-muted">{formatDateTime(e.at)}{e.refId && ` · อ้างอิง ${e.refId}`}</p>
                </div>
                <span className={cn('font-bold tabular-nums', e.amountSatang > 0 ? 'text-success' : e.amountSatang < 0 ? '' : 'text-muted')}>
                  {e.amountSatang > 0 ? '+' : e.amountSatang < 0 ? '−' : ''}{formatTHB(Math.abs(e.amountSatang))}
                  {e.kind === 'reservation-forfeit' && <span className="block text-right text-xs font-normal text-muted">หักไปแล้วตอนจอง</span>}
                </span>
              </div>
            ))}
          </Card>
        )
      ) : topups.length === 0 ? <EmptyState icon={<History className="size-8" aria-hidden />} title="ยังไม่มีรายการเติมเงิน" /> : (
        <Card className="divide-y divide-line">
          {topups.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-medium">{t.method === 'bank-slip' ? 'โอนธนาคาร / สลิป' : 'อั่งเปา TrueMoney'} · {formatTHB(t.amountSatang)}</p>
                <p className="text-xs text-muted">{t.id} · {formatDateTime(t.createdAt)} · {t.credited ? 'เพิ่มยอดแล้ว' : 'ไม่ได้เพิ่มยอด'}</p>
              </div>
              <TopUpBadge status={t.status} />
            </div>
          ))}
        </Card>
      )}
    </AccountShell>
  )
}
