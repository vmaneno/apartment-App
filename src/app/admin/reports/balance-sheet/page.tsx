import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency } from '@/lib/utils'
import { BalanceSheetFilters } from './BalanceSheetFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; asOfDate?: string }>

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default async function BalanceSheetPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, asOfDate } = await searchParams
  const asOf = asOfDate || today()

  const properties = await prisma.property.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  const lines = await prisma.transactionLine.findMany({
    where: {
      glAccount: { organizationId: session.organizationId, glType: { in: ['Asset', 'Liability', 'Equity'] } },
      transaction: { date: { lte: new Date(`${asOf}T23:59:59Z`) } },
      ...(propertyId ? { propertyId } : {}),
    },
    include: { glAccount: true },
  })

  const byAccount = new Map<string, { glNumber: string; glName: string; glType: string; amount: number }>()
  for (const l of lines) {
    const key = l.glAccount.id
    const existing = byAccount.get(key) ?? { glNumber: l.glAccount.glNumber, glName: l.glAccount.glName, glType: l.glAccount.glType, amount: 0 }
    existing.amount += l.glAccount.glType === 'Asset' ? (l.debit - l.credit) : (l.credit - l.debit)
    byAccount.set(key, existing)
  }

  const assets = Array.from(byAccount.values()).filter(a => a.glType === 'Asset').sort((a, b) => a.glNumber.localeCompare(b.glNumber))
  const liabilities = Array.from(byAccount.values()).filter(a => a.glType === 'Liability').sort((a, b) => a.glNumber.localeCompare(b.glNumber))
  const equity = Array.from(byAccount.values()).filter(a => a.glType === 'Equity').sort((a, b) => a.glNumber.localeCompare(b.glNumber))
  const totalAssets = Math.round(assets.reduce((s, a) => s + a.amount, 0) * 100) / 100
  const totalLiabilities = Math.round(liabilities.reduce((s, a) => s + a.amount, 0) * 100) / 100
  const totalEquity = Math.round(equity.reduce((s, a) => s + a.amount, 0) * 100) / 100

  const section = (title: string, rows: typeof assets, total: number, emptyNote?: string) => (
    <div className="rounded-xl overflow-hidden shadow-sm mb-4" style={{ border: '1px solid var(--border)' }}>
      <div className="px-4 py-2" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{title}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{emptyNote ?? `No ${title.toLowerCase()} posted as of this date.`}</p>
      ) : rows.map((a, i) => (
        <div key={a.glNumber} className="flex justify-between px-4 py-2 text-sm" style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <span>{a.glNumber} {a.glName}</span>
          <span>{formatCurrency(a.amount)}</span>
        </div>
      ))}
      <div className="flex justify-between px-4 py-2 text-sm font-semibold" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
        <span>Total {title}</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Balance Sheet" subtitle="Assets, Liabilities, and Equity as of a point in time" />
      <div className="mb-6"><BalanceSheetFilters properties={properties} propertyId={propertyId ?? ''} asOfDate={asOf} /></div>

      {section('Assets', assets, totalAssets)}
      {section('Liabilities', liabilities, totalLiabilities, 'No liabilities posted yet — enter a vendor invoice under AP Invoices.')}
      {section('Equity', equity, totalEquity, 'No equity postings yet, and this app has no period-close/retained-earnings roll-up — Income and Expense activity does not flow into Equity here.')}

      <div className="rounded-xl p-4 flex justify-between items-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total Assets vs. Total Liabilities + Equity</span>
        <span className="text-lg font-bold" style={{ color: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.005 ? '#10a06a' : '#d4a017' }}>
          {formatCurrency(totalAssets)} / {formatCurrency(totalLiabilities + totalEquity)}
        </span>
      </div>
    </div>
  )
}
