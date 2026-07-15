import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatDate } from '@/lib/utils'
import { OccupancyFilters } from './OccupancyFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; status?: string }>

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default async function OccupancyPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, status } = await searchParams
  const selectedStatus = status === 'occupied' || status === 'vacant' ? status : 'all'
  const asOf = new Date(`${today()}T00:00:00Z`)

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
          include: { leaseTenants: { include: { tenant: true } } },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    }),
  ])

  const rows = units
    .map(u => {
      const leases = u.leases
      const currentLease = leases.find(l => l.startDate <= asOf && (!l.endDate || l.endDate >= asOf)) ?? null
      const occupied = !!currentLease

      let vacantSince: Date | null = null
      let daysVacant: number | null = null
      if (!occupied) {
        const endedBefore = leases
          .filter(l => l.endDate && l.endDate < asOf)
          .sort((a, b) => (b.endDate as Date).getTime() - (a.endDate as Date).getTime())
        if (endedBefore.length > 0) {
          vacantSince = endedBefore[0].endDate
          daysVacant = Math.floor((asOf.getTime() - (vacantSince as Date).getTime()) / 86400000)
        }
      }

      return {
        id: u.id,
        propertyId: u.propertyId,
        propertyName: u.property.name,
        unitNumber: u.unitNumber,
        occupied,
        tenantNames: currentLease ? currentLease.leaseTenants.map(lt => lt.tenant.name).join(', ') : null,
        vacantSince,
        daysVacant,
        neverLeased: !occupied && leases.length === 0,
      }
    })
    .filter(r => selectedStatus === 'all' || (selectedStatus === 'occupied' ? r.occupied : !r.occupied))

  const totalUnits = rows.length
  const occupiedCount = rows.filter(r => r.occupied).length
  const vacantCount = totalUnits - occupiedCount
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0

  // Turnover history is a historical KPI, independent of the current-status filters above —
  // it walks every unit in scope (property filter still applies) across its full lease history.
  const turnovers: { propertyName: string; unitNumber: string; vacatedDate: Date; leasedDate: Date; daysVacant: number }[] = []
  for (const u of units) {
    const leases = u.leases
    for (let i = 1; i < leases.length; i++) {
      const prevEnd = leases[i - 1].endDate
      const thisStart = leases[i].startDate
      if (!prevEnd || thisStart < prevEnd) continue
      const gapDays = Math.floor((thisStart.getTime() - prevEnd.getTime()) / 86400000)
      turnovers.push({ propertyName: u.property.name, unitNumber: u.unitNumber, vacatedDate: prevEnd, leasedDate: thisStart, daysVacant: gapDays })
    }
  }
  turnovers.sort((a, b) => b.leasedDate.getTime() - a.leasedDate.getTime())
  const avgDaysToRelease = turnovers.length > 0
    ? Math.round((turnovers.reduce((s, t) => s + t.daysVacant, 0) / turnovers.length) * 10) / 10
    : null

  const cards = [
    { label: 'Total Units', value: String(totalUnits) },
    { label: 'Occupied', value: String(occupiedCount) },
    { label: 'Vacant', value: String(vacantCount) },
    { label: 'Occupancy', value: `${occupancyPct}%` },
    { label: 'Avg Days to Re-Lease', value: avgDaysToRelease !== null ? `${avgDaysToRelease}` : '—' },
  ]

  return (
    <div>
      <PageHeader title="Occupancy & Vacancy" subtitle="Current occupancy status, vacancy duration, and days-to-lease history" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-4"><OccupancyFilters properties={properties} propertyId={propertyId ?? ''} status={selectedStatus} /></div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property' },
          { key: 'unitNumber', label: 'Unit' },
          { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => {
            const occupied = r.occupied as boolean
            return (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: occupied ? '#10a06a22' : '#d4a01722', color: occupied ? '#10a06a' : '#d4a017' }}>
                {occupied ? 'Occupied' : 'Vacant'}
              </span>
            )
          } },
          { key: 'tenantNames', label: 'Tenant(s)', render: (r: Record<string, unknown>) => (r.tenantNames as string | null) ?? '—' },
          { key: 'vacantSince', label: 'Vacant Since', render: (r: Record<string, unknown>) => {
            if (r.occupied) return '—'
            if (r.neverLeased) return 'Never leased'
            return r.vacantSince ? formatDate(r.vacantSince as Date) : '—'
          } },
          { key: 'daysVacant', label: 'Days Vacant', align: 'right' as const, render: (r: Record<string, unknown>) => {
            const d = r.daysVacant as number | null
            if (r.occupied || d === null) return '—'
            return <span style={{ color: d > 30 ? '#ef4444' : d > 0 ? '#d4a017' : 'var(--text-primary)' }}>{d}</span>
          } },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No units match these filters."
      />

      <div className="mt-8 mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Turnover History</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Every completed vacancy-to-re-lease gap, most recent first — this is what the &quot;Avg Days to Re-Lease&quot; card above is calculated from.</p>
      </div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property' },
          { key: 'unitNumber', label: 'Unit' },
          { key: 'vacatedDate', label: 'Vacated', render: (r: Record<string, unknown>) => formatDate(r.vacatedDate as Date) },
          { key: 'leasedDate', label: 'Re-Leased', render: (r: Record<string, unknown>) => formatDate(r.leasedDate as Date) },
          { key: 'daysVacant', label: 'Days Vacant', align: 'right' as const, render: (r: Record<string, unknown>) => {
            const d = r.daysVacant as number
            return <span style={{ color: d > 30 ? '#ef4444' : d > 0 ? '#d4a017' : 'var(--text-primary)' }}>{d}</span>
          } },
        ]}
        data={turnovers as unknown as Record<string, unknown>[]}
        emptyMessage="No completed turnovers yet — this fills in once a unit has been vacated and re-leased at least once."
      />
    </div>
  )
}
