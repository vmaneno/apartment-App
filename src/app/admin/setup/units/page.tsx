import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/utils'
import { AddUnitForm } from './AddUnitForm'
import { UnitRowActions } from '../properties/[id]/UnitRowActions'

export const dynamic = 'force-dynamic'

export default async function UnitsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [units, properties] = await Promise.all([
    prisma.unit.findMany({
      where: { property: { organizationId: session.organizationId, active: true }, active: true },
      include: { property: true, leases: { where: { status: 'Active' } } },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    }),
    prisma.property.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const rows = units.map(u => ({
    id: u.id,
    propertyId: u.propertyId,
    propertyName: u.property.name,
    unitNumber: u.unitNumber,
    beds: u.beds,
    baths: u.baths,
    sqft: u.sqft,
    marketRent: u.marketRent,
    occupied: u.leases.length > 0,
  }))

  return (
    <div>
      <PageHeader title="Units" subtitle="Every unit across your properties" />
      <div className="mb-6"><AddUnitForm properties={properties} /></div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property', render: (r: Record<string, unknown>) => (
            <Link href={`/admin/setup/properties/${r.propertyId}`} className="hover:underline" style={{ color: 'var(--accent)' }}>
              {r.propertyName as string}
            </Link>
          ) },
          { key: 'unitNumber', label: 'Unit #', render: (r: Record<string, unknown>) => (
            <Link href={`/admin/setup/properties/${r.propertyId}/units/${r.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              {r.unitNumber as string}
            </Link>
          ) },
          { key: 'beds', label: 'Bd/Ba', align: 'center' as const, render: (r: Record<string, unknown>) => `${r.beds}/${r.baths}` },
          { key: 'sqft', label: 'Sqft', align: 'right' as const, render: (r: Record<string, unknown>) => (r.sqft as number | null) ?? '—' },
          { key: 'marketRent', label: 'Market Rent', align: 'right' as const, render: (r: Record<string, unknown>) => r.marketRent ? formatCurrency(r.marketRent as number) : '—' },
          { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => {
            const occupied = r.occupied as boolean
            return (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: occupied ? '#10a06a22' : '#d4a01722', color: occupied ? '#10a06a' : '#d4a017' }}>
                {occupied ? 'Occupied' : 'Vacant'}
              </span>
            )
          } },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <UnitRowActions unit={r as unknown as Parameters<typeof UnitRowActions>[0]['unit']} />
          ) },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No units yet — click Add Unit to create one."
      />
    </div>
  )
}
