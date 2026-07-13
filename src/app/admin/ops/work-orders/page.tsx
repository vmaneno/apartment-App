import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatDate } from '@/lib/utils'
import { WorkOrderForm } from './WorkOrderForm'
import { WorkOrderRowActions } from './WorkOrderRowActions'

export const dynamic = 'force-dynamic'

export default async function WorkOrdersPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [workOrders, properties, units, vendors] = await Promise.all([
    prisma.workOrder.findMany({
      where: { property: { organizationId: session.organizationId, active: true } },
      include: { property: true, unit: true, assignedVendor: true },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.property.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.unit.findMany({
      where: { property: { organizationId: session.organizationId, active: true }, active: true },
      select: { id: true, propertyId: true, unitNumber: true },
    }),
    prisma.vendor.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const statusColor: Record<string, string> = {
    Open: '#d4a017',
    Assigned: '#4a7cd4',
    InProgress: '#4a7cd4',
    Completed: '#10a06a',
  }

  return (
    <div>
      <PageHeader title="Work Orders" subtitle="Maintenance requests and their status" />
      <div className="mb-6"><WorkOrderForm properties={properties} units={units} vendors={vendors} /></div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property', render: (r: Record<string, unknown>) => (r.property as { name: string }).name },
          { key: 'unit', label: 'Unit', render: (r: Record<string, unknown>) => (r.unit as { unitNumber: string } | null)?.unitNumber ?? '—' },
          { key: 'description', label: 'Description' },
          { key: 'priority', label: 'Priority', render: (r: Record<string, unknown>) => {
            const p = r.priority as string
            return <span style={{ color: p === 'Emergency' ? '#ef4444' : 'var(--text-primary)' }}>{p}</span>
          } },
          { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => {
            const s = r.status as string
            const color = statusColor[s] ?? 'var(--text-muted)'
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${color}22`, color }}>{s}</span>
          } },
          { key: 'assignedVendor', label: 'Vendor', render: (r: Record<string, unknown>) => (r.assignedVendor as { name: string } | null)?.name ?? '—' },
          { key: 'completedAt', label: 'Completed', render: (r: Record<string, unknown>) => r.completedAt ? formatDate(r.completedAt as Date) : '—' },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <WorkOrderRowActions
              workOrder={r as unknown as Parameters<typeof WorkOrderRowActions>[0]['workOrder']}
              vendors={vendors}
            />
          ) },
        ]}
        data={workOrders as unknown as Record<string, unknown>[]}
        emptyMessage="No work orders yet — click Add Work Order to create one."
      />
    </div>
  )
}
