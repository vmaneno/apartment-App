import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/utils'
import { NoiFilters } from './NoiFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; startDate?: string; endDate?: string }>

function startOfYear() {
  const now = new Date()
  return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
}
function today() {
  return new Date().toISOString().slice(0, 10)
}

export default async function NoiReportPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, startDate, endDate } = await searchParams
  const start = startDate || startOfYear()
  const end = endDate || today()
  const startD = new Date(`${start}T00:00:00Z`)
  const endD = new Date(`${end}T23:59:59Z`)
  const daysInRange = Math.max(1, Math.floor((endD.getTime() - startD.getTime()) / 86400000) + 1)

  const properties = await prisma.property.findMany({
    where: {
      organizationId: session.organizationId,
      active: true,
      ...(propertyId ? { id: propertyId } : {}),
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, propertyValue: true },
  })

  const lines = await prisma.transactionLine.findMany({
    where: {
      glAccount: { organizationId: session.organizationId, glType: { in: ['Income', 'Expense'] } },
      transaction: { date: { gte: startD, lte: endD } },
      propertyId: { in: properties.map(p => p.id) },
    },
    include: { glAccount: true },
  })

  const byProperty = new Map<string, { income: number; expense: number }>()
  for (const l of lines) {
    if (!l.propertyId) continue
    const entry = byProperty.get(l.propertyId) ?? { income: 0, expense: 0 }
    if (l.glAccount.glType === 'Income') entry.income += l.credit - l.debit
    else entry.expense += l.debit - l.credit
    byProperty.set(l.propertyId, entry)
  }

  const rows = properties.map(p => {
    const activity = byProperty.get(p.id) ?? { income: 0, expense: 0 }
    const income = Math.round(activity.income * 100) / 100
    const expense = Math.round(activity.expense * 100) / 100
    const noi = Math.round((income - expense) * 100) / 100
    const annualizedNoi = Math.round((noi * (365 / daysInRange)) * 100) / 100
    const capRate = p.propertyValue ? Math.round((annualizedNoi / p.propertyValue) * 10000) / 100 : null
    return {
      id: p.id,
      propertyName: p.name,
      propertyValue: p.propertyValue,
      income,
      expense,
      noi,
      annualizedNoi,
      capRate,
    }
  })

  const totalIncome = Math.round(rows.reduce((s, r) => s + r.income, 0) * 100) / 100
  const totalExpense = Math.round(rows.reduce((s, r) => s + r.expense, 0) * 100) / 100
  const totalNoi = Math.round((totalIncome - totalExpense) * 100) / 100
  const totalAnnualizedNoi = Math.round((totalNoi * (365 / daysInRange)) * 100) / 100
  const valuedRows = rows.filter(r => r.propertyValue)
  const totalValue = Math.round(valuedRows.reduce((s, r) => s + (r.propertyValue as number), 0) * 100) / 100
  const blendedAnnualizedNoi = Math.round(valuedRows.reduce((s, r) => s + r.annualizedNoi, 0) * 100) / 100
  const blendedCapRate = totalValue > 0 ? Math.round((blendedAnnualizedNoi / totalValue) * 10000) / 100 : null

  const cards = [
    { label: 'NOI (period)', value: formatCurrency(totalNoi) },
    { label: 'Annualized NOI', value: formatCurrency(totalAnnualizedNoi) },
    { label: 'Portfolio Value (priced)', value: totalValue > 0 ? formatCurrency(totalValue) : '—' },
    { label: 'Blended Cap Rate', value: blendedCapRate !== null ? `${blendedCapRate}%` : '—' },
  ]

  return (
    <div>
      <PageHeader title="NOI & Cap Rate" subtitle="Net Operating Income by property, annualized, against property value" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-4"><NoiFilters properties={properties} propertyId={propertyId ?? ''} startDate={start} endDate={end} /></div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        NOI = Income − Operating Expenses for the selected range ({daysInRange} day{daysInRange === 1 ? '' : 's'}).
        Annualized NOI scales that figure to a 365-day year (× 365 ÷ {daysInRange}) — select a full calendar year
        for the most accurate Cap Rate; a short range annualizes noisily. Cap Rate = Annualized NOI ÷ Property Value.
        Blended Cap Rate above only includes properties with a value on file.
      </p>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property' },
          { key: 'income', label: 'Income', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.income as number) },
          { key: 'expense', label: 'Expense', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.expense as number) },
          { key: 'noi', label: 'NOI (period)', align: 'right' as const, render: (r: Record<string, unknown>) => {
            const v = r.noi as number
            return <span style={{ color: v >= 0 ? '#10a06a' : '#ef4444' }}>{formatCurrency(v)}</span>
          } },
          { key: 'annualizedNoi', label: 'Annualized NOI', align: 'right' as const, render: (r: Record<string, unknown>) => {
            const v = r.annualizedNoi as number
            return <span className="font-semibold" style={{ color: v >= 0 ? '#10a06a' : '#ef4444' }}>{formatCurrency(v)}</span>
          } },
          { key: 'propertyValue', label: 'Property Value', align: 'right' as const, render: (r: Record<string, unknown>) => {
            const v = r.propertyValue as number | null
            return v ? formatCurrency(v) : '—'
          } },
          { key: 'capRate', label: 'Cap Rate', align: 'right' as const, render: (r: Record<string, unknown>) => {
            const v = r.capRate as number | null
            return v !== null ? <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{v}%</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
          } },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No properties match this filter."
      />
    </div>
  )
}
