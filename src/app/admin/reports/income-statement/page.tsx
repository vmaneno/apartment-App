import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency } from '@/lib/utils'
import { IncomeStatementFilters } from './IncomeStatementFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; startDate?: string; endDate?: string }>

function startOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}
function today() {
  return new Date().toISOString().slice(0, 10)
}

export default async function IncomeStatementPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, startDate, endDate } = await searchParams
  const start = startDate || startOfMonth()
  const end = endDate || today()

  const properties = await prisma.property.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  const lines = await prisma.transactionLine.findMany({
    where: {
      glAccount: { organizationId: session.organizationId, glType: { in: ['Income', 'Expense'] } },
      transaction: { date: { gte: new Date(`${start}T00:00:00`), lte: new Date(`${end}T23:59:59`) } },
      ...(propertyId ? { propertyId } : {}),
    },
    include: { glAccount: true },
  })

  const byAccount = new Map<string, { glNumber: string; glName: string; glType: string; amount: number }>()
  for (const l of lines) {
    const key = l.glAccount.id
    const existing = byAccount.get(key) ?? { glNumber: l.glAccount.glNumber, glName: l.glAccount.glName, glType: l.glAccount.glType, amount: 0 }
    existing.amount += l.glAccount.glType === 'Income' ? (l.credit - l.debit) : (l.debit - l.credit)
    byAccount.set(key, existing)
  }

  const income = Array.from(byAccount.values()).filter(a => a.glType === 'Income').sort((a, b) => a.glNumber.localeCompare(b.glNumber))
  const expense = Array.from(byAccount.values()).filter(a => a.glType === 'Expense').sort((a, b) => a.glNumber.localeCompare(b.glNumber))
  const totalIncome = Math.round(income.reduce((s, a) => s + a.amount, 0) * 100) / 100
  const totalExpense = Math.round(expense.reduce((s, a) => s + a.amount, 0) * 100) / 100
  const noi = Math.round((totalIncome - totalExpense) * 100) / 100

  return (
    <div>
      <PageHeader title="Income Statement" subtitle="Income minus operating expenses = Net Operating Income" />
      <div className="mb-6"><IncomeStatementFilters properties={properties} propertyId={propertyId ?? ''} startDate={start} endDate={end} /></div>

      <div className="rounded-xl overflow-hidden shadow-sm mb-4" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-2" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Income</p>
        </div>
        {income.length === 0 ? (
          <p className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>No income posted in this range.</p>
        ) : income.map((a, i) => (
          <div key={a.glNumber} className="flex justify-between px-4 py-2 text-sm" style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <span>{a.glNumber} {a.glName}</span>
            <span>{formatCurrency(a.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between px-4 py-2 text-sm font-semibold" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <span>Total Income</span>
          <span>{formatCurrency(totalIncome)}</span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden shadow-sm mb-4" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-2" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Expenses</p>
        </div>
        {expense.length === 0 ? (
          <p className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            No expenses posted in this range — this app doesn&apos;t have vendor bill/expense posting yet, only lease charges and payments.
          </p>
        ) : expense.map((a, i) => (
          <div key={a.glNumber} className="flex justify-between px-4 py-2 text-sm" style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <span>{a.glNumber} {a.glName}</span>
            <span>{formatCurrency(a.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between px-4 py-2 text-sm font-semibold" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <span>Total Expenses</span>
          <span>{formatCurrency(totalExpense)}</span>
        </div>
      </div>

      <div className="rounded-xl p-4 flex justify-between items-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Net Operating Income (NOI)</span>
        <span className="text-lg font-bold" style={{ color: noi >= 0 ? '#10a06a' : '#ef4444' }}>{formatCurrency(noi)}</span>
      </div>
    </div>
  )
}
