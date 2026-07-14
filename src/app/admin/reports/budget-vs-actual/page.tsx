import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency } from '@/lib/utils'
import { BudgetVsActualFilters } from './BudgetVsActualFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; year?: string; throughMonth?: string }>

type Row = { glNumber: string; glName: string; glType: string; budget: number; actual: number }

export default async function BudgetVsActualPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, year: yearParam, throughMonth: throughMonthParam } = await searchParams
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const year = yearParam && /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : currentYear
  const years = Array.from({ length: 3 }, (_, i) => currentYear + 1 - i)
  const defaultThroughMonth = year === currentYear ? now.getUTCMonth() + 1 : 12
  const throughMonth = throughMonthParam && /^([1-9]|1[0-2])$/.test(throughMonthParam) ? parseInt(throughMonthParam, 10) : defaultThroughMonth

  const rangeStart = new Date(Date.UTC(year, 0, 1))
  const rangeEnd = new Date(Date.UTC(year, throughMonth, 0, 23, 59, 59))

  const properties = await prisma.property.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  const [budgets, lines] = await Promise.all([
    prisma.budget.findMany({
      where: {
        organizationId: session.organizationId,
        year,
        month: { lte: throughMonth },
        ...(propertyId ? { propertyId } : {}),
      },
      include: { glAccount: true },
    }),
    prisma.transactionLine.findMany({
      where: {
        glAccount: { organizationId: session.organizationId, glType: { in: ['Income', 'Expense'] } },
        transaction: { date: { gte: rangeStart, lte: rangeEnd } },
        ...(propertyId ? { propertyId } : {}),
      },
      include: { glAccount: true },
    }),
  ])

  const byAccount = new Map<string, Row>()
  for (const b of budgets) {
    const key = b.glAccountId
    const existing = byAccount.get(key) ?? { glNumber: b.glAccount.glNumber, glName: b.glAccount.glName, glType: b.glAccount.glType, budget: 0, actual: 0 }
    existing.budget += b.amount
    byAccount.set(key, existing)
  }
  for (const l of lines) {
    const key = l.glAccountId
    const existing = byAccount.get(key) ?? { glNumber: l.glAccount.glNumber, glName: l.glAccount.glName, glType: l.glAccount.glType, budget: 0, actual: 0 }
    existing.actual += l.glAccount.glType === 'Income' ? (l.credit - l.debit) : (l.debit - l.credit)
    byAccount.set(key, existing)
  }

  const round2 = (n: number) => Math.round(n * 100) / 100
  const rows = Array.from(byAccount.values())
    .map(r => ({ ...r, budget: round2(r.budget), actual: round2(r.actual), variance: round2(r.actual - r.budget) }))
    .sort((a, b) => a.glNumber.localeCompare(b.glNumber))

  const income = rows.filter(r => r.glType === 'Income')
  const expense = rows.filter(r => r.glType === 'Expense')
  const sum = (rs: typeof rows, key: 'budget' | 'actual' | 'variance') => round2(rs.reduce((s, r) => s + r[key], 0))
  const budgetNOI = round2(sum(income, 'budget') - sum(expense, 'budget'))
  const actualNOI = round2(sum(income, 'actual') - sum(expense, 'actual'))

  function section(label: string, rs: typeof rows, emptyNote: string) {
    return (
      <div className="rounded-xl overflow-hidden shadow-sm mb-4" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-2 grid grid-cols-4" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
          <p className="text-xs font-semibold col-span-1" style={{ color: 'var(--accent)' }}>{label}</p>
          <p className="text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>Budget</p>
          <p className="text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>Actual</p>
          <p className="text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>Variance</p>
        </div>
        {rs.length === 0 ? (
          <p className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{emptyNote}</p>
        ) : rs.map((r, i) => (
          <div key={r.glNumber} className="grid grid-cols-4 px-4 py-2 text-sm" style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <span>{r.glNumber} {r.glName}</span>
            <span className="text-right">{formatCurrency(r.budget)}</span>
            <span className="text-right">{formatCurrency(r.actual)}</span>
            <span className="text-right" style={{ color: r.variance === 0 ? 'var(--text-primary)' : (label === 'Income' ? r.variance > 0 : r.variance < 0) ? '#10a06a' : '#ef4444' }}>
              {formatCurrency(r.variance)}
            </span>
          </div>
        ))}
        <div className="grid grid-cols-4 px-4 py-2 text-sm font-semibold" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <span>Total {label}</span>
          <span className="text-right">{formatCurrency(sum(rs, 'budget'))}</span>
          <span className="text-right">{formatCurrency(sum(rs, 'actual'))}</span>
          <span className="text-right">{formatCurrency(sum(rs, 'variance'))}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Budget vs. Actual" subtitle="Budgeted amounts compared to actual GL activity, year to date" />
      <div className="mb-6"><BudgetVsActualFilters properties={properties} propertyId={propertyId ?? ''} year={year} years={years} throughMonth={throughMonth} /></div>

      {section('Income', income, 'No budget or actual income for this range — set one under Setup → Budget.')}
      {section('Expenses', expense, 'No budget or actual expenses for this range — set one under Setup → Budget.')}

      <div className="rounded-xl p-4 grid grid-cols-3 gap-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Net Operating Income (NOI)</span>
        <span className="text-right font-semibold" style={{ color: 'var(--text-primary)' }}>Budget: {formatCurrency(budgetNOI)}</span>
        <span className="text-right text-lg font-bold" style={{ color: actualNOI >= budgetNOI ? '#10a06a' : '#ef4444' }}>Actual: {formatCurrency(actualNOI)}</span>
      </div>
    </div>
  )
}
