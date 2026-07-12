import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { PostRentForm } from './PostRentForm'

export const dynamic = 'force-dynamic'

export default async function PostRentPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const leases = await prisma.lease.findMany({
    where: { status: 'Active', unit: { property: { organizationId: session.organizationId } } },
    include: { unit: { include: { property: true } }, leaseTenants: { include: { tenant: true } } },
    orderBy: [{ unit: { property: { name: 'asc' } } }, { unit: { unitNumber: 'asc' } }],
  })

  const rows = leases.map(l => ({
    id: l.id,
    rentAmount: l.rentAmount,
    propertyName: l.unit.property.name,
    unitNumber: l.unit.unitNumber,
    tenantNames: l.leaseTenants.map(lt => lt.tenant.name).join(', '),
  }))

  return (
    <div>
      <PageHeader title="Post Rent" subtitle="Bulk-post a recurring charge to one or more active leases" />
      <PostRentForm leases={rows} />
    </div>
  )
}
