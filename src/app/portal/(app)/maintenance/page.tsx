import { redirect } from 'next/navigation'
import { getTenantSession } from '@/lib/tenantAuth'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { MaintenanceRequestForm } from './MaintenanceRequestForm'

export const dynamic = 'force-dynamic'

export default async function PortalMaintenancePage() {
  const session = await getTenantSession()
  if (!session) redirect('/portal/login')

  const [activeLeaseTenants, workOrders] = await Promise.all([
    prisma.leaseTenant.findMany({
      where: { tenantId: session.tenantId, lease: { status: 'Active' } },
      include: { lease: { include: { unit: { include: { property: true } } } } },
    }),
    prisma.workOrder.findMany({
      where: { submittedByTenantId: session.tenantId },
      include: { property: true, unit: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const leaseOptions = activeLeaseTenants.map(lt => ({
    id: lt.lease.id,
    label: `${lt.lease.unit.property.name} — Unit ${lt.lease.unit.unitNumber}`,
  }))

  const statusColor: Record<string, string> = {
    Open: '#d4a017',
    Assigned: '#4a7cd4',
    InProgress: '#4a7cd4',
    Completed: '#10a06a',
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Maintenance Requests</h1>
      <MaintenanceRequestForm leases={leaseOptions} />

      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Your Requests</h2>
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)' }}>
        {workOrders.length === 0 ? (
          <p className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>No requests submitted yet.</p>
        ) : workOrders.map((w, i) => (
          <div key={w.id} className="px-4 py-3 text-sm" style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
            <div className="flex items-center justify-between gap-3">
              <span style={{ color: 'var(--text-primary)' }}>{w.description}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0" style={{ backgroundColor: `${statusColor[w.status] ?? 'var(--text-muted)'}22`, color: statusColor[w.status] ?? 'var(--text-muted)' }}>
                {w.status}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {w.unit?.unitNumber ? `Unit ${w.unit.unitNumber} · ` : ''}{w.priority} · Submitted {formatDate(w.createdAt)}
              {w.completedAt ? ` · Completed ${formatDate(w.completedAt)}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
