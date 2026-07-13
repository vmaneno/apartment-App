import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AddLeaseForm } from './AddLeaseForm'
import { LeasesFilters } from './LeasesFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; status?: string }>

export default async function LeasesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, status } = await searchParams
  const selectedStatus = status === 'Active' || status === 'Pending' || status === 'Ended' ? status : 'all'

  const [leases, properties, units, tenants] = await Promise.all([
    prisma.lease.findMany({
      where: {
        unit: { property: { organizationId: session.organizationId, active: true }, ...(propertyId ? { propertyId } : {}) },
        ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}),
      },
      include: {
        unit: { include: { property: true } },
        leaseTenants: { include: { tenant: true } },
        leaseCharges: { include: { paymentApplications: true } },
        payments: true,
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    }),
    prisma.property.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.unit.findMany({
      where: { property: { organizationId: session.organizationId, active: true }, active: true },
      include: { property: true, leases: { where: { status: 'Active' } } },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    }),
    prisma.tenant.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const unitOptions = units.map(u => ({
    id: u.id,
    label: `${u.property.name} — Unit ${u.unitNumber}`,
    hasActiveLease: u.leases.length > 0,
  }))

  const rows = leases.map(l => {
    const totalCharged = l.leaseCharges.reduce((s, c) => s + c.amount, 0)
    const totalPaid = l.payments.reduce((s, p) => s + p.amount, 0)
    return {
      id: l.id,
      propertyId: l.unit.propertyId,
      unitId: l.unitId,
      propertyName: l.unit.property.name,
      unitNumber: l.unit.unitNumber,
      tenantNames: l.leaseTenants.map(lt => lt.tenant.name).join(', '),
      status: l.status,
      startDate: l.startDate,
      endDate: l.endDate,
      rentAmount: l.rentAmount,
      depositAmount: l.depositAmount,
      balance: Math.round((totalCharged - totalPaid) * 100) / 100,
    }
  })

  return (
    <div>
      <PageHeader title="Leases" subtitle="Every lease across your properties" />
      <div className="mb-6"><AddLeaseForm units={unitOptions} tenants={tenants} /></div>
      <div className="mb-4"><LeasesFilters properties={properties} propertyId={propertyId ?? ''} status={selectedStatus} /></div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property', render: (r: Record<string, unknown>) => (
            <Link href={`/admin/setup/properties/${r.propertyId}`} className="hover:underline" style={{ color: 'var(--accent)' }}>
              {r.propertyName as string}
            </Link>
          ) },
          { key: 'unitNumber', label: 'Unit', render: (r: Record<string, unknown>) => (
            <Link href={`/admin/setup/properties/${r.propertyId}/units/${r.unitId}/leases/${r.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              {r.unitNumber as string}
            </Link>
          ) },
          { key: 'tenantNames', label: 'Tenant(s)' },
          { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => {
            const s = r.status as string
            const color = s === 'Active' ? '#10a06a' : s === 'Pending' ? '#d4a017' : 'var(--text-muted)'
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${color}22`, color }}>{s}</span>
          } },
          { key: 'startDate', label: 'Start', render: (r: Record<string, unknown>) => formatDate(r.startDate as Date) },
          { key: 'endDate', label: 'End', render: (r: Record<string, unknown>) => r.endDate ? formatDate(r.endDate as Date) : '—' },
          { key: 'rentAmount', label: 'Rent', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.rentAmount as number) },
          { key: 'depositAmount', label: 'Deposit', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.depositAmount as number) },
          { key: 'balance', label: 'Balance', align: 'right' as const, render: (r: Record<string, unknown>) => {
            const bal = r.balance as number
            return <span style={{ color: bal > 0 ? '#d4a017' : 'var(--text-primary)' }}>{formatCurrency(bal)}</span>
          } },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No leases match — try clearing filters, or click Add Lease to create one."
      />
    </div>
  )
}
