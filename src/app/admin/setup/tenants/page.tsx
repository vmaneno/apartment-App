import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { TenantForm } from './TenantForm'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenants = await prisma.tenant.findMany({
    where: { organizationId: session.organizationId },
    include: { leaseTenants: { include: { lease: { include: { unit: { include: { property: true } } } } } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <PageHeader title="Tenants" subtitle="People who lease units across your properties" />
      <div className="mb-6"><TenantForm /></div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email', render: (r: Record<string, unknown>) => (r.email as string | null) ?? '—' },
          { key: 'phone', label: 'Phone', render: (r: Record<string, unknown>) => (r.phone as string | null) ?? '—' },
          { key: 'leases', label: 'Active Lease', render: (r: Record<string, unknown>) => {
            const rows = r.leaseTenants as { lease: { status: string; unit: { unitNumber: string; property: { name: string } } } }[]
            const active = rows.find(lt => lt.lease.status === 'Active')
            if (!active) return '—'
            return `${active.lease.unit.property.name} — Unit ${active.lease.unit.unitNumber}`
          } },
        ]}
        data={tenants as unknown as Record<string, unknown>[]}
        emptyMessage="No tenants yet — click Add Tenant to create one."
      />
    </div>
  )
}
