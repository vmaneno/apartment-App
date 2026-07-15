import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { CsvImportCard } from '@/components/ui/CsvImportCard'
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
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      // Never spread the full tenant record here — `t.password` is a bcrypt hash and this row
      // is serialized straight to the client component below. Only a boolean crosses the wire.
      portalEnabled: !!t.password,
      activeLeaseLabel: activeLt ? `${activeLt.lease.unit.property.name} — Unit ${activeLt.lease.unit.unitNumber}` : null,
      activeUnitId: activeLt ? activeLt.lease.unitId : null,
    }
  })

  return (
    <div>
      <PageHeader title="Tenants" subtitle="People who lease units across your properties" />
      <CsvImportCard
        entityLabel="Tenants"
        templateHeaders={['Name', 'Email', 'Phone']}
        templateExampleRow={['Jane A. Doe', 'jane.doe@example.com', '555-010-9876']}
        templateFilename="tenants-template.csv"
        uploadUrl="/api/setup/tenants/bulk"
      />
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
          { key: 'portalEnabled', label: 'Portal', align: 'center' as const, render: (r: Record<string, unknown>) => (
            r.portalEnabled
              ? <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#10a06a22', color: '#10a06a' }}>Enabled</span>
              : <span style={{ color: 'var(--text-muted)' }}>—</span>
          ) },
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
