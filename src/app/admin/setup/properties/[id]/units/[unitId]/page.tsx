import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { LeaseForm } from './LeaseForm'
import { LeaseRowActions } from './LeaseRowActions'

export const dynamic = 'force-dynamic'

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string; unitId: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id, unitId } = await params

  const [unit, tenants] = await Promise.all([
    prisma.unit.findFirst({
      where: { id: unitId, propertyId: id, property: { organizationId: session.organizationId } },
      include: {
        property: true,
        leases: {
          include: { leaseTenants: { include: { tenant: true } } },
          orderBy: { startDate: 'desc' },
        },
      },
    }),
    prisma.tenant.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])
  if (!unit) notFound()

  const hasActiveLease = unit.leases.some(l => l.status === 'Active')

  return (
    <div>
      <Link href={`/admin/setup/properties/${unit.propertyId}`} className="text-xs underline mb-2 inline-block" style={{ color: 'var(--text-muted)' }}>
        ← {unit.property.name}
      </Link>
      <PageHeader
        title={`Unit ${unit.unitNumber}`}
        subtitle={`${unit.beds} bd / ${unit.baths} ba${unit.sqft ? ` · ${unit.sqft} sqft` : ''}${unit.marketRent ? ` · Market rent ${formatCurrency(unit.marketRent)}` : ''}`}
      />
      <div className="mb-6"><LeaseForm unitId={unit.id} tenants={tenants} hasActiveLease={hasActiveLease} /></div>
      <DataTable
        columns={[
          { key: 'tenants', label: 'Tenant(s)', render: (r: Record<string, unknown>) => {
            const lts = r.leaseTenants as { tenant: { name: string } }[]
            const names = lts.map(lt => lt.tenant.name).join(', ')
            return (
              <Link href={`/admin/setup/properties/${unit.propertyId}/units/${unit.id}/leases/${r.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                {names}
              </Link>
            )
          } },
          { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => {
            const status = r.status as string
            const color = status === 'Active' ? '#10a06a' : status === 'Pending' ? '#d4a017' : 'var(--text-muted)'
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${color}22`, color }}>{status}</span>
          } },
          { key: 'startDate', label: 'Start', render: (r: Record<string, unknown>) => formatDate(r.startDate as Date) },
          { key: 'endDate', label: 'End', render: (r: Record<string, unknown>) => r.endDate ? formatDate(r.endDate as Date) : '—' },
          { key: 'rentAmount', label: 'Rent', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.rentAmount as number) },
          { key: 'depositAmount', label: 'Deposit', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.depositAmount as number) },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <LeaseRowActions lease={r as unknown as Parameters<typeof LeaseRowActions>[0]['lease']} />
          ) },
        ]}
        data={unit.leases as unknown as Record<string, unknown>[]}
        emptyMessage="No leases yet — click Add Lease to create one."
      />
    </div>
  )
}
