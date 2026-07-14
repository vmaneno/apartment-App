import { redirect } from 'next/navigation'
import { getTenantSession } from '@/lib/tenantAuth'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PortalDashboardPage() {
  const session = await getTenantSession()
  if (!session) redirect('/portal/login')

  const leaseTenants = await prisma.leaseTenant.findMany({
    where: { tenantId: session.tenantId },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          leaseTenants: { include: { tenant: true } },
          leaseCharges: { orderBy: { date: 'desc' } },
          payments: { orderBy: { date: 'desc' } },
          documents: true,
        },
      },
    },
    orderBy: [{ lease: { startDate: 'desc' } }],
  })

  const leases = leaseTenants.map(lt => lt.lease).sort((a, b) => (a.status === 'Active' ? -1 : 1) - (b.status === 'Active' ? -1 : 1))

  if (leases.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No lease is on file for your account yet — contact your property manager.</p>
  }

  return (
    <div className="space-y-8">
      {leases.map(lease => {
        const totalCharged = lease.leaseCharges.reduce((s, c) => s + c.amount, 0)
        const totalPaid = lease.payments.reduce((s, p) => s + p.amount, 0)
        const balance = Math.round((totalCharged - totalPaid) * 100) / 100
        return (
          <div key={lease.id}>
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {lease.unit.property.name} — Unit {lease.unit.unitNumber}
                </h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {lease.status} · {formatDate(lease.startDate)}{lease.endDate ? ` to ${formatDate(lease.endDate)}` : ''} · Rent {formatCurrency(lease.rentAmount)}
                </p>
              </div>
              <div className="rounded-xl p-4 text-right" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Balance</p>
                <p className="text-lg font-bold mt-1" style={{ color: balance > 0 ? '#d4a017' : '#10a06a' }}>{formatCurrency(balance)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Charges</h2>
                <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)' }}>
                  {lease.leaseCharges.length === 0 ? (
                    <p className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>No charges yet.</p>
                  ) : lease.leaseCharges.map((c, i) => (
                    <div key={c.id} className="flex justify-between px-4 py-2 text-sm" style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: i === 0 ? 'none' : '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <span>{formatDate(c.date)} · {c.chargeType}</span>
                      <span>{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Payments</h2>
                <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)' }}>
                  {lease.payments.length === 0 ? (
                    <p className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>No payments on file.</p>
                  ) : lease.payments.map((p, i) => (
                    <div key={p.id} className="flex justify-between px-4 py-2 text-sm" style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: i === 0 ? 'none' : '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <span>{formatDate(p.date)} · {p.method}</span>
                      <span>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {lease.documents.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Documents</h2>
                <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)' }}>
                  {lease.documents.map((d, i) => (
                    <a key={d.id} href={`/api/portal/documents/${d.id}`} target="_blank" rel="noopener noreferrer"
                      className="flex justify-between px-4 py-2 text-sm hover:underline"
                      style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: i === 0 ? 'none' : '1px solid var(--border)', color: 'var(--accent)' }}>
                      <span>{d.fileName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{d.category}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
