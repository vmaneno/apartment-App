import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/utils'
import { ArAgingFilters } from './ArAgingFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; asOfDate?: string }>

type Bucket = 'current' | 'b3160' | 'b6190' | 'b90plus'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function bucketFor(ageDays: number): Bucket {
  if (ageDays <= 30) return 'current'
  if (ageDays <= 60) return 'b3160'
  if (ageDays <= 90) return 'b6190'
  return 'b90plus'
}

export default async function ArAgingPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, asOfDate } = await searchParams
  const asOf = asOfDate || today()
  const asOfEnd = new Date(`${asOf}T23:59:59Z`)

  const [properties, leases] = await Promise.all([
    prisma.property.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.lease.findMany({
      where: {
        unit: {
          property: {
            organizationId: session.organizationId,
            active: true,
            ...(propertyId ? { id: propertyId } : {}),
          },
        },
      },
      include: {
        unit: { include: { property: true } },
        leaseTenants: { include: { tenant: true } },
        leaseCharges: { include: { paymentApplications: { include: { payment: true } } } },
      },
      orderBy: [{ unit: { property: { name: 'asc' } } }, { unit: { unitNumber: 'asc' } }],
    }),
  ])

  const rows = leases
    .map(lease => {
      const buckets: Record<Bucket, number> = { current: 0, b3160: 0, b6190: 0, b90plus: 0 }
      for (const charge of lease.leaseCharges) {
        if (charge.date > asOfEnd) continue
        const appliedAsOf = charge.paymentApplications
          .filter(pa => pa.payment.date <= asOfEnd)
          .reduce((s, pa) => s + pa.appliedAmount, 0)
        const outstanding = charge.amount - appliedAsOf
        if (outstanding <= 0.005) continue
        const ageDays = Math.floor((asOfEnd.getTime() - charge.date.getTime()) / 86400000)
        buckets[bucketFor(ageDays)] += outstanding
      }
      const total = Math.round((buckets.current + buckets.b3160 + buckets.b6190 + buckets.b90plus) * 100) / 100
      return {
        id: lease.id,
        propertyName: lease.unit.property.name,
        unitNumber: lease.unit.unitNumber,
        tenantNames: lease.leaseTenants.map(lt => lt.tenant.name).join(', ') || '—',
        status: lease.status,
        current: Math.round(buckets.current * 100) / 100,
        b3160: Math.round(buckets.b3160 * 100) / 100,
        b6190: Math.round(buckets.b6190 * 100) / 100,
        b90plus: Math.round(buckets.b90plus * 100) / 100,
        total,
      }
    })
    .filter(r => r.total > 0.005)

  const sumOf = (key: 'current' | 'b3160' | 'b6190' | 'b90plus' | 'total') =>
    Math.round(rows.reduce((s, r) => s + r[key], 0) * 100) / 100

  const cards = [
    { label: 'Delinquent Leases', value: String(rows.length) },
    { label: 'Total AR', value: formatCurrency(sumOf('total')) },
    { label: 'Current (0-30)', value: formatCurrency(sumOf('current')) },
    { label: '31-60 Days', value: formatCurrency(sumOf('b3160')) },
    { label: '61-90 Days', value: formatCurrency(sumOf('b6190')) },
    { label: '90+ Days', value: formatCurrency(sumOf('b90plus')) },
  ]

  const bucketColor = (bucket: Bucket, amount: number) => {
    if (amount <= 0.005) return 'var(--text-muted)'
    if (bucket === 'current') return 'var(--text-primary)'
    if (bucket === 'b90plus') return '#ef4444'
    return '#d4a017'
  }

  return (
    <div>
      <PageHeader title="AR Aging" subtitle="Outstanding lease charges by how long they've been unpaid" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-4"><ArAgingFilters properties={properties} propertyId={propertyId ?? ''} asOfDate={asOf} /></div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property' },
          { key: 'unitNumber', label: 'Unit' },
          { key: 'tenantNames', label: 'Tenant(s)' },
          { key: 'status', label: 'Lease Status', render: (r: Record<string, unknown>) => {
            const status = r.status as string
            return (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: status === 'Active' ? '#10a06a22' : '#6b728022', color: status === 'Active' ? '#10a06a' : '#6b7280' }}>
                {status}
              </span>
            )
          } },
          { key: 'current', label: 'Current', align: 'right' as const, render: (r: Record<string, unknown>) => (
            <span style={{ color: bucketColor('current', r.current as number) }}>{formatCurrency(r.current as number)}</span>
          ) },
          { key: 'b3160', label: '31-60', align: 'right' as const, render: (r: Record<string, unknown>) => (
            <span style={{ color: bucketColor('b3160', r.b3160 as number) }}>{formatCurrency(r.b3160 as number)}</span>
          ) },
          { key: 'b6190', label: '61-90', align: 'right' as const, render: (r: Record<string, unknown>) => (
            <span style={{ color: bucketColor('b6190', r.b6190 as number) }}>{formatCurrency(r.b6190 as number)}</span>
          ) },
          { key: 'b90plus', label: '90+', align: 'right' as const, render: (r: Record<string, unknown>) => (
            <span className="font-semibold" style={{ color: bucketColor('b90plus', r.b90plus as number) }}>{formatCurrency(r.b90plus as number)}</span>
          ) },
          { key: 'total', label: 'Total', align: 'right' as const, render: (r: Record<string, unknown>) => (
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(r.total as number)}</span>
          ) },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No outstanding balances as of this date."
      />
    </div>
  )
}
