import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { BudgetFilters } from './BudgetFilters'
import { BudgetGrid } from './BudgetGrid'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; year?: string }>

export default async function BudgetSetupPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId: propertyIdParam, year: yearParam } = await searchParams
  const currentYear = new Date().getUTCFullYear()
  const year = yearParam && /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : currentYear
  const years = Array.from({ length: 3 }, (_, i) => currentYear + 1 - i)

  const properties = await prisma.property.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  const propertyId = propertyIdParam || properties[0]?.id || ''

  const [glAccounts, budgets] = await Promise.all([
    prisma.chartOfAccount.findMany({
      where: { organizationId: session.organizationId, active: true, glType: { in: ['Income', 'Expense'] } },
      orderBy: { glNumber: 'asc' },
    }),
    propertyId
      ? prisma.budget.findMany({ where: { propertyId, year } })
      : Promise.resolve([]),
  ])

  const amounts: Record<string, number> = {}
  for (const b of budgets) amounts[`${b.glAccountId}-${b.month}`] = b.amount

  return (
    <div>
      <PageHeader title="Budget" subtitle="Set monthly budgeted amounts per GL account, per property" />
      <div className="mb-6"><BudgetFilters properties={properties} propertyId={propertyId} year={year} years={years} /></div>
      {!propertyId ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add a property first under Setup → Properties.</p>
      ) : (
        <BudgetGrid
          key={`${propertyId}-${year}`}
          propertyId={propertyId}
          year={year}
          glAccounts={glAccounts.map(a => ({ id: a.id, glNumber: a.glNumber, glName: a.glName, glType: a.glType }))}
          amounts={amounts}
        />
      )}
    </div>
  )
}
