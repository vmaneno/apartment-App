import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { TenantForm } from './TenantForm'
import { TenantRowActions } from './TenantRowActions'
import { TenantFilters } from './TenantFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ name?: string; email?: string }>

export default async function TenantsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { name, email } = await searchParams

  const [tenants, units] = await Promise.all([
    prisma.tenant.findMany({
      where: {
        organizationId: session.organizationId,
        active: true,
        ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
        ...(email ? { email: { contains: email, mode: 'insensitive' } } : {}),
      },
      include: { leaseTenants: { include: { lease: { include: { unit: { include: { property: true } } } } } } },
      orderBy: { name: 'asc' },
    }),
    prisma.unit.findMany({
      where: { property: { organizationId: session.organizationId }, active: true },
      include: { property: true },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    }),
  ])

  const unitOptions = units.map(u => ({ id: u.id, label: `${u.property.name} — Unit ${u.unitNumber}` }))

  const rows = tenants.map(t => {
    const activeLt = t.leaseTenants.find(lt => lt.lease.status === 'Active')
    return {
      ...t,
      activeLeaseLabel: activeLt ? `${activeLt.lease.unit.property.name} — Unit ${activeLt.lease.unit.unitNumber}` : null,
      activeUnitId: activeLt ? activeLt.lease.unitId : null,
    }
  })

  return (
    <div>
      <PageHeader title="Tenants" subtitle="People who lease units across your properties" />
      <div className="mb-6"><TenantForm /></div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <TenantFilters name={name ?? ''} email={email ?? ''} />
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email', render: (r: Record<string, unknown>) => (r.email as string | null) ?? '—' },
          { key: 'phone', label: 'Phone', render: (r: Record<string, unknown>) => (r.phone as string | null) ?? '—' },
          { key: 'activeLeaseLabel', label: 'Active Lease', render: (r: Record<string, unknown>) => (r.activeLeaseLabel as string | null) ?? '—' },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <TenantRowActions
              tenant={r as unknown as Parameters<typeof TenantRowActions>[0]['tenant']}
              activeUnitId={r.activeUnitId as string | null}
              units={unitOptions}
            />
          ) },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No tenants match — try clearing filters, or click Add Tenant to create one."
      />
    </div>
  )
}
