import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { RubsForm } from './RubsForm'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string }>

export default async function RubsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId: propertyIdParam } = await searchParams

  const properties = await prisma.property.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  const propertyId = propertyIdParam || properties[0]?.id || ''

  const leases = propertyId
    ? await prisma.lease.findMany({
        where: { status: 'Active', unit: { propertyId } },
        include: { unit: true, leaseTenants: { include: { tenant: true } } },
        orderBy: { unit: { unitNumber: 'asc' } },
      })
    : []

  const rows = leases.map(l => ({
    id: l.id,
    unitNumber: l.unit.unitNumber,
    sqft: l.unit.sqft,
    beds: l.unit.beds,
    tenantNames: l.leaseTenants.map(lt => lt.tenant.name).join(', ') || 'Vacant',
  }))

  return (
    <div>
      <PageHeader title="RUBS" subtitle="Ratio Utility Billing — allocate a shared utility bill across a property's active leases" />
      <RubsForm properties={properties} propertyId={propertyId} leases={rows} />
    </div>
  )
}
