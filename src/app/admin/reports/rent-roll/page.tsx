import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RentRollFilters } from './RentRollFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; status?: string }>

export default async function RentRollPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, status } = await searchParams
  const selectedStatus = status === 'occupied' || status === 'vacant' ? status : 'all'

  const [properties, units] = await Promise.all([
    prisma.property.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.unit.findMany({
      where: {
        property: { organizationId: session.organizationId, active: true },
        active: true,
        ...(propertyId ? { propertyId } : {}),
      },
      include: {
        property: true,
        leases: {
          where: { status: 'Active' },
          include: { leaseTenants: { include: { tenant: true } } },
        },
      },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    }),
  ])

  const rows = units
    .map(u => {
      const lease = u.leases[0] ?? null
      return {
        id: u.id,
        propertyId: u.propertyId,
        propertyName: u.property.name,
        unitNumber: u.unitNumber,
        beds: u.beds,
        baths: u.baths,
        marketRent: u.marketRent,
        occupied: !!lease,
        tenantNames: lease ? lease.leaseTenants.map(lt => lt.tenant.name).join(', ') : null,
        rentAmount: lease ? lease.rentAmount : null,
        startDate: lease ? lease.startDate : null,
        endDate: lease ? lease.endDate : null,
      }
    })
    .filter(r => selectedStatus === 'all' || (selectedStatus === 'occupied' ? r.occupied : !r.occupied))

  const occupiedCount = rows.filter(r => r.occupied).length
  const vacantCount = rows.length - occupiedCount
  const occupancyPct = rows.length > 0 ? Math.round((occupiedCount / rows.length) * 100) : 0
  const totalActualRent = rows.reduce((s, r) => s + (r.rentAmount ?? 0), 0)
  const totalMarketRent = rows.reduce((s, r) => s + (r.marketRent ?? 0), 0)

  const cards = [
    { label: 'Total Units', value: String(rows.length) },
    { label: 'Occupied', value: String(occupiedCount) },
    { label: 'Vacant', value: String(vacantCount) },
    { label: 'Occupancy', value: `${occupancyPct}%` },
    { label: 'Actual Rent', value: formatCurrency(totalActualRent) },
    { label: 'Market Rent', value: formatCurrency(totalMarketRent) },
  ]

  return (
    <div>
      <PageHeader title="Rent Roll" subtitle="Current occupancy status of every unit" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-4"><RentRollFilters properties={properties} propertyId={propertyId ?? ''} status={selectedStatus} /></div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property' },
          { key: 'unitNumber', label: 'Unit' },
          { key: 'beds', label: 'Bd/Ba', align: 'center' as const, render: (r: Record<string, unknown>) => `${r.beds}/${r.baths}` },
          { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => {
            const occupied = r.occupied as boolean
            return (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: occupied ? '#10a06a22' : '#d4a01722', color: occupied ? '#10a06a' : '#d4a017' }}>
                {occupied ? 'Occupied' : 'Vacant'}
              </span>
            )
          } },
          { key: 'tenantNames', label: 'Tenant(s)', render: (r: Record<string, unknown>) => (r.tenantNames as string | null) ?? '—' },
          { key: 'marketRent', label: 'Market Rent', align: 'right' as const, render: (r: Record<string, unknown>) => r.marketRent ? formatCurrency(r.marketRent as number) : '—' },
          { key: 'rentAmount', label: 'Actual Rent', align: 'right' as const, render: (r: Record<string, unknown>) => r.rentAmount ? formatCurrency(r.rentAmount as number) : '—' },
          { key: 'startDate', label: 'Lease Start', render: (r: Record<string, unknown>) => r.startDate ? formatDate(r.startDate as Date) : '—' },
          { key: 'endDate', label: 'Lease End', render: (r: Record<string, unknown>) => r.endDate ? formatDate(r.endDate as Date) : '—' },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No units match these filters."
      />
    </div>
  )
}
