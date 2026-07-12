import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PostChargeForm } from './PostChargeForm'
import { RecordPaymentForm } from './RecordPaymentForm'

export const dynamic = 'force-dynamic'

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string; unitId: string; leaseId: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id, unitId, leaseId } = await params

  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, unitId, unit: { property: { id, organizationId: session.organizationId } } },
    include: {
      unit: { include: { property: true } },
      leaseTenants: { include: { tenant: true } },
      leaseCharges: { include: { paymentApplications: true }, orderBy: { date: 'asc' } },
      payments: { include: { paymentApplications: true }, orderBy: { date: 'asc' } },
    },
  })
  if (!lease) notFound()

  const chargeRows = lease.leaseCharges.map(c => ({
    id: c.id,
    date: c.date,
    chargeType: c.chargeType,
    amount: c.amount,
    outstanding: c.amount - c.paymentApplications.reduce((s, a) => s + a.appliedAmount, 0),
  }))
  const totalCharged = chargeRows.reduce((s, c) => s + c.amount, 0)
  const totalPaid = lease.payments.reduce((s, p) => s + p.amount, 0)
  const balance = Math.round((totalCharged - totalPaid) * 100) / 100

  const paymentRows = lease.payments.map(p => ({
    id: p.id,
    date: p.date,
    amount: p.amount,
    method: p.method,
  }))

  return (
    <div>
      <Link href={`/admin/setup/properties/${id}/units/${unitId}`} className="text-xs underline mb-2 inline-block" style={{ color: 'var(--text-muted)' }}>
        ← {lease.unit.property.name} — Unit {lease.unit.unitNumber}
      </Link>
      <PageHeader
        title={`Lease — ${lease.leaseTenants.map(lt => lt.tenant.name).join(', ')}`}
        subtitle={`${lease.status} · ${formatDate(lease.startDate)}${lease.endDate ? ` to ${formatDate(lease.endDate)}` : ''} · Rent ${formatCurrency(lease.rentAmount)} · Deposit ${formatCurrency(lease.depositAmount)}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Charged</p>
          <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalCharged)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Paid</p>
          <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Balance Owed</p>
          <p className="text-lg font-bold mt-1" style={{ color: balance > 0 ? '#d4a017' : '#10a06a' }}>{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Charges</h2>
          <div className="mb-4"><PostChargeForm leaseId={lease.id} /></div>
          <DataTable
            columns={[
              { key: 'date', label: 'Date', render: (r: Record<string, unknown>) => formatDate(r.date as Date) },
              { key: 'chargeType', label: 'Type' },
              { key: 'amount', label: 'Amount', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.amount as number) },
              { key: 'outstanding', label: 'Outstanding', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.outstanding as number) },
            ]}
            data={chargeRows as unknown as Record<string, unknown>[]}
            emptyMessage="No charges yet."
          />
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Payments</h2>
          <div className="mb-4"><RecordPaymentForm leaseId={lease.id} balance={balance} /></div>
          <DataTable
            columns={[
              { key: 'date', label: 'Date', render: (r: Record<string, unknown>) => formatDate(r.date as Date) },
              { key: 'method', label: 'Method' },
              { key: 'amount', label: 'Amount', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.amount as number) },
            ]}
            data={paymentRows as unknown as Record<string, unknown>[]}
            emptyMessage="No payments yet."
          />
        </div>
      </div>
    </div>
  )
}
