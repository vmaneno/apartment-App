import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/utils'
import { UnitForm } from './UnitForm'
import { UnitRowActions } from './UnitRowActions'
import { PropertyOwnerForm } from './PropertyOwnerForm'
import { ManagementFeeForm } from './ManagementFeeForm'
import { PropertyValueForm } from './PropertyValueForm'

export const dynamic = 'force-dynamic'

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params

  const [property, owners] = await Promise.all([
    prisma.property.findFirst({
      where: { id, organizationId: session.organizationId },
      include: { units: { where: { active: true }, orderBy: { unitNumber: 'asc' } }, propertyOwners: { include: { owner: true } }, managementAgreement: true },
    }),
    prisma.owner.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true },
    }),
  ])
  if (!property) notFound()

  return (
    <div>
      <PageHeader
        title={property.name}
        subtitle={`${property.addressLine1}, ${property.city}, ${property.state} ${property.zip}`}
      />

      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Ownership</h2>
        {property.propertyOwners.length > 0 && (
          <ul className="text-sm mb-3 space-y-1" style={{ color: 'var(--text-primary)' }}>
            {property.propertyOwners.map(po => (
              <li key={po.id}>{po.owner.name} ({po.owner.type}) — {po.ownershipPercent}%</li>
            ))}
          </ul>
        )}
        <PropertyOwnerForm propertyId={property.id} owners={owners} />
      </div>

      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Management Fee</h2>
        <ManagementFeeForm propertyId={property.id} feePercent={property.managementAgreement?.feePercent ?? 0} />
      </div>

      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Property Value</h2>
        <PropertyValueForm propertyId={property.id} propertyValue={property.propertyValue} />
      </div>

      <div className="mb-6"><UnitForm propertyId={property.id} /></div>
      <DataTable
        columns={[
          { key: 'unitNumber', label: 'Unit #', render: (r: Record<string, unknown>) => (
            <Link href={`/admin/setup/properties/${property.id}/units/${r.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              {r.unitNumber as string}
            </Link>
          ) },
          { key: 'beds', label: 'Beds', align: 'center' as const },
          { key: 'baths', label: 'Baths', align: 'center' as const },
          { key: 'sqft', label: 'Sqft', align: 'right' as const, render: (r: Record<string, unknown>) => (r.sqft as number | null) ?? '—' },
          { key: 'marketRent', label: 'Market Rent', align: 'right' as const, render: (r: Record<string, unknown>) => r.marketRent ? formatCurrency(r.marketRent as number) : '—' },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <UnitRowActions unit={r as unknown as Parameters<typeof UnitRowActions>[0]['unit']} />
          ) },
        ]}
        data={property.units as unknown as Record<string, unknown>[]}
        emptyMessage="No units yet — click Add Unit to create one."
      />
    </div>
  )
}
