import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatDate } from '@/lib/utils'
import { InspectionForm } from './InspectionForm'
import { InspectionRowActions } from './InspectionRowActions'

export const dynamic = 'force-dynamic'

export default async function InspectionsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [inspections, properties, units] = await Promise.all([
    prisma.inspection.findMany({
      where: { organizationId: session.organizationId },
      include: { property: true, unit: true },
      orderBy: [{ status: 'asc' }, { scheduledDate: 'asc' }],
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
  ])

  const statusColor: Record<string, string> = {
    Scheduled: '#d4a017',
    Completed: '#10a06a',
    Cancelled: 'var(--text-muted)',
  }

  return (
    <div>
      <PageHeader title="Inspections" subtitle="Move-in/move-out condition reports and routine walkthroughs" />
      <div className="mb-6"><InspectionForm properties={properties} units={units} /></div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property', render: (r: Record<string, unknown>) => (r.property as { name: string }).name },
          { key: 'unit', label: 'Unit', render: (r: Record<string, unknown>) => (r.unit as { unitNumber: string } | null)?.unitNumber ?? '—' },
          { key: 'type', label: 'Type' },
          { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => {
            const s = r.status as string
            const color = statusColor[s] ?? 'var(--text-muted)'
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${color}22`, color }}>{s}</span>
          } },
          { key: 'scheduledDate', label: 'Scheduled', render: (r: Record<string, unknown>) => formatDate(r.scheduledDate as Date) },
          { key: 'completedDate', label: 'Completed', render: (r: Record<string, unknown>) => r.completedDate ? formatDate(r.completedDate as Date) : '—' },
          { key: 'inspectorName', label: 'Inspector', render: (r: Record<string, unknown>) => (r.inspectorName as string | null) ?? '—' },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <InspectionRowActions inspection={r as unknown as Parameters<typeof InspectionRowActions>[0]['inspection']} />
          ) },
        ]}
        data={inspections as unknown as Record<string, unknown>[]}
        emptyMessage="No inspections yet — click Schedule Inspection to create one."
      />
    </div>
  )
}
