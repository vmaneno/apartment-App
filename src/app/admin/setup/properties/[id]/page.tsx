import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/utils'
import { UnitForm } from './UnitForm'

export const dynamic = 'force-dynamic'

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params

  const property = await prisma.property.findFirst({
    where: { id, organizationId: session.organizationId },
    include: { units: { orderBy: { unitNumber: 'asc' } }, propertyOwners: { include: { owner: true } } },
  })
  if (!property) notFound()

  return (
    <div>
      <PageHeader
        title={property.name}
        subtitle={`${property.addressLine1}, ${property.city}, ${property.state} ${property.zip}`}
      />
      <div className="mb-6"><UnitForm propertyId={property.id} /></div>
      <DataTable
        columns={[
          { key: 'unitNumber', label: 'Unit #' },
          { key: 'beds', label: 'Beds', align: 'center' as const },
          { key: 'baths', label: 'Baths', align: 'center' as const },
          { key: 'sqft', label: 'Sqft', align: 'right' as const, render: (r: Record<string, unknown>) => (r.sqft as number | null) ?? '—' },
          { key: 'marketRent', label: 'Market Rent', align: 'right' as const, render: (r: Record<string, unknown>) => r.marketRent ? formatCurrency(r.marketRent as number) : '—' },
        ]}
        data={property.units as unknown as Record<string, unknown>[]}
        emptyMessage="No units yet — click Add Unit to create one."
      />
    </div>
  )
}
