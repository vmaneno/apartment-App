import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { PropertyForm } from './PropertyForm'

export const dynamic = 'force-dynamic'

export default async function PropertiesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const properties = await prisma.property.findMany({
    where: { organizationId: session.organizationId, active: true },
    include: { units: true, propertyOwners: { include: { owner: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <PageHeader title="Properties" subtitle="Manage properties in your portfolio" />
      <div className="mb-6"><PropertyForm /></div>
      <DataTable
        columns={[
          { key: 'name', label: 'Property', render: (r: Record<string, unknown>) => (
            <Link href={`/admin/setup/properties/${r.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              {r.name as string}
            </Link>
          ) },
          { key: 'address', label: 'Address', render: (r: Record<string, unknown>) => `${r.addressLine1 as string}, ${r.city as string}, ${r.state as string} ${r.zip as string}` },
          { key: 'units', label: 'Units', align: 'center' as const, render: (r: Record<string, unknown>) => (r.units as unknown[]).length },
          { key: 'owner', label: 'Owner', render: (r: Record<string, unknown>) => {
            const po = (r.propertyOwners as { owner: { name: string }; ownershipPercent: number }[])[0]
            return po ? `${po.owner.name} (${po.ownershipPercent}%)` : '—'
          } },
        ]}
        data={properties as unknown as Record<string, unknown>[]}
        emptyMessage="No properties yet — click Add Property to create one."
      />
    </div>
  )
}
