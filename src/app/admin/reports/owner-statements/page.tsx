import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency } from '@/lib/utils'
import { OwnerStatementFilters } from './OwnerStatementFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ ownerId?: string; startDate?: string; endDate?: string }>

function startOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}
function today() {
  return new Date().toISOString().slice(0, 10)
}

export default async function OwnerStatementsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { ownerId, startDate, endDate } = await searchParams
  const start = startDate || startOfMonth()
  const end = endDate || today()

  const owners = await prisma.owner.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  let rows: { propertyId: string; propertyName: string; ownershipPercent: number; income: number; expense: number; noi: number; share: number }[] = []
  let owner: { id: string; name: string } | null = null

  if (ownerId) {
    owner = owners.find(o => o.id === ownerId) ?? null
    const propertyOwners = await prisma.propertyOwner.findMany({
      where: { ownerId, property: { organizationId: session.organizationId, active: true } },
      include: { property: true },
    })

    const lines = await prisma.transactionLine.findMany({
      where: {
        glAccount: { organizationId: session.organizationId, glType: { in: ['Income', 'Expense'] } },
        transaction: { date: { gte: new Date(`${start}T00:00:00Z`), lte: new Date(`${end}T23:59:59Z`) } },
        propertyId: { in: propertyOwners.map(po => po.propertyId) },
      },
      include: { glAccount: true },
    })

    rows = propertyOwners.map(po => {
      const propertyLines = lines.filter(l => l.propertyId === po.propertyId)
      const income = propertyLines.filter(l => l.glAccount.glType === 'Income').reduce((s, l) => s + (l.credit - l.debit), 0)
      const expense = propertyLines.filter(l => l.glAccount.glType === 'Expense').reduce((s, l) => s + (l.debit - l.credit), 0)
      const noi = Math.round((income - expense) * 100) / 100
      const share = Math.round(noi * po.ownershipPercent) / 100
      return { propertyId: po.propertyId, propertyName: po.property.name, ownershipPercent: po.ownershipPercent, income, expense, noi, share }
    })
  }

  const totalIncome = rows.reduce((s, r) => s + r.income, 0)
  const totalExpense = rows.reduce((s, r) => s + r.expense, 0)
  const totalNoi = rows.reduce((s, r) => s + r.noi, 0)
  const totalShare = Math.round(rows.reduce((s, r) => s + r.share, 0) * 100) / 100

  return (
    <div>
      <PageHeader title="Owner Statements" subtitle="Each owner's share of property income, by ownership %" />
      <div className="mb-6"><OwnerStatementFilters owners={owners} ownerId={ownerId ?? ''} startDate={start} endDate={end} /></div>

      {!ownerId ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select an owner to view their statement.</p>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden shadow-sm mb-4" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-2" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{owner?.name}</p>
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>This owner has no properties assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                      <th className="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--accent)' }}>Property</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--accent)' }}>Income</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--accent)' }}>Expense</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--accent)' }}>NOI</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--accent)' }}>Ownership %</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--accent)' }}>Owner&apos;s Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.propertyId} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <td className="px-4 py-2">{r.propertyName}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(r.income)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(r.expense)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(r.noi)}</td>
                        <td className="px-4 py-2 text-right">{r.ownershipPercent}%</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatCurrency(r.share)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(totalIncome)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(totalExpense)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(totalNoi)}</td>
                      <td className="px-4 py-2 text-right"></td>
                      <td className="px-4 py-2 text-right">{formatCurrency(totalShare)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
