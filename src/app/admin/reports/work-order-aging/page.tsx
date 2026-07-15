import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatDate } from '@/lib/utils'
import { WorkOrderAgingFilters } from './WorkOrderAgingFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; priority?: string }>

// Emergency work orders are expected to turn around in ~a day; Routine ones have more slack —
// these thresholds only drive the color coding, not any workflow behavior.
function ageColor(priority: string, days: number): string {
  const thresholds = priority === 'Emergency' ? { amber: 1, red: 3 } : { amber: 7, red: 14 }
  if (days > thresholds.red) return '#ef4444'
  if (days > thresholds.amber) return '#d4a017'
  return '#10a06a'
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
}

export default async function WorkOrderAgingPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, priority } = await searchParams
  const selectedPriority = priority === 'Emergency' || priority === 'Routine' ? priority : 'all'
  const now = new Date()

  const [properties, workOrders] = await Promise.all([
    prisma.property.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.workOrder.findMany({
      where: {
        property: { organizationId: session.organizationId, active: true },
        ...(propertyId ? { propertyId } : {}),
        ...(selectedPriority !== 'all' ? { priority: selectedPriority } : {}),
      },
      include: { property: true, unit: true, assignedVendor: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const openRows = workOrders
    .filter(w => w.status !== 'Completed')
    .map(w => ({
      id: w.id,
      propertyName: w.property.name,
      unitNumber: w.unit?.unitNumber ?? null,
      description: w.description,
      priority: w.priority,
      status: w.status,
      vendorName: w.assignedVendor?.name ?? null,
      createdAt: w.createdAt,
      ageDays: Math.floor((now.getTime() - w.createdAt.getTime()) / 86400000),
    }))
    .sort((a, b) => b.ageDays - a.ageDays)

  const completedRows = workOrders
    .filter(w => w.status === 'Completed' && w.completedAt)
    .map(w => ({
      id: w.id,
      propertyName: w.property.name,
      unitNumber: w.unit?.unitNumber ?? null,
      description: w.description,
      priority: w.priority,
      vendorName: w.assignedVendor?.name ?? null,
      createdAt: w.createdAt,
      completedAt: w.completedAt as Date,
      daysToComplete: Math.floor(((w.completedAt as Date).getTime() - w.createdAt.getTime()) / 86400000),
    }))
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())

  const avgOpenAge = avg(openRows.map(r => r.ageDays))
  const avgCompleteAll = avg(completedRows.map(r => r.daysToComplete))
  const avgCompleteEmergency = avg(completedRows.filter(r => r.priority === 'Emergency').map(r => r.daysToComplete))
  const avgCompleteRoutine = avg(completedRows.filter(r => r.priority === 'Routine').map(r => r.daysToComplete))

  const fmtDays = (v: number | null) => v !== null ? `${v}` : '—'

  const cards = [
    { label: 'Open Work Orders', value: String(openRows.length) },
    { label: 'Avg Age of Open (days)', value: fmtDays(avgOpenAge) },
    { label: 'Completed (all-time)', value: String(completedRows.length) },
    { label: 'Avg Days to Complete', value: fmtDays(avgCompleteAll) },
    { label: 'Avg — Emergency (days)', value: fmtDays(avgCompleteEmergency) },
    { label: 'Avg — Routine (days)', value: fmtDays(avgCompleteRoutine) },
  ]

  return (
    <div>
      <PageHeader title="Work Order Aging" subtitle="How long open requests have been waiting, and how fast completed ones turned around" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-4"><WorkOrderAgingFilters properties={properties} propertyId={propertyId ?? ''} priority={selectedPriority} /></div>

      <div className="mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Open Work Orders</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sorted oldest first. Age is colored against Emergency (amber &gt;1 day, red &gt;3 days) or Routine (amber &gt;7 days, red &gt;14 days) expectations.</p>
      </div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property' },
          { key: 'unitNumber', label: 'Unit', render: (r: Record<string, unknown>) => (r.unitNumber as string | null) ?? '—' },
          { key: 'description', label: 'Description' },
          { key: 'priority', label: 'Priority', render: (r: Record<string, unknown>) => {
            const p = r.priority as string
            return <span style={{ color: p === 'Emergency' ? '#ef4444' : 'var(--text-primary)' }}>{p}</span>
          } },
          { key: 'status', label: 'Status' },
          { key: 'vendorName', label: 'Vendor', render: (r: Record<string, unknown>) => (r.vendorName as string | null) ?? '—' },
          { key: 'createdAt', label: 'Opened', render: (r: Record<string, unknown>) => formatDate(r.createdAt as Date) },
          { key: 'ageDays', label: 'Age (days)', align: 'right' as const, render: (r: Record<string, unknown>) => (
            <span className="font-semibold" style={{ color: ageColor(r.priority as string, r.ageDays as number) }}>{r.ageDays as number}</span>
          ) },
        ]}
        data={openRows as unknown as Record<string, unknown>[]}
        emptyMessage="No open work orders match these filters."
      />

      <div className="mt-8 mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Completed Work Orders</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Most recently completed first — this is what the &quot;Avg Days to Complete&quot; cards above are calculated from.</p>
      </div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property' },
          { key: 'unitNumber', label: 'Unit', render: (r: Record<string, unknown>) => (r.unitNumber as string | null) ?? '—' },
          { key: 'description', label: 'Description' },
          { key: 'priority', label: 'Priority', render: (r: Record<string, unknown>) => {
            const p = r.priority as string
            return <span style={{ color: p === 'Emergency' ? '#ef4444' : 'var(--text-primary)' }}>{p}</span>
          } },
          { key: 'vendorName', label: 'Vendor', render: (r: Record<string, unknown>) => (r.vendorName as string | null) ?? '—' },
          { key: 'createdAt', label: 'Opened', render: (r: Record<string, unknown>) => formatDate(r.createdAt as Date) },
          { key: 'completedAt', label: 'Completed', render: (r: Record<string, unknown>) => formatDate(r.completedAt as Date) },
          { key: 'daysToComplete', label: 'Days to Complete', align: 'right' as const, render: (r: Record<string, unknown>) => (
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.daysToComplete as number}</span>
          ) },
        ]}
        data={completedRows as unknown as Record<string, unknown>[]}
        emptyMessage="No completed work orders match these filters yet."
      />
    </div>
  )
}
