import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EnterInvoiceForm } from './EnterInvoiceForm'
import { RecordVendorPaymentForm } from './RecordVendorPaymentForm'

export const dynamic = 'force-dynamic'

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params

  const vendor = await prisma.vendor.findFirst({
    where: { id, organizationId: session.organizationId },
    include: {
      vendorInvoices: { include: { property: true, glAccount: true, paymentApplications: true }, orderBy: { date: 'asc' } },
      vendorPayments: { orderBy: { date: 'asc' } },
    },
  })
  if (!vendor) notFound()

  const [properties, expenseAccounts, bankAccounts] = await Promise.all([
    prisma.property.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.chartOfAccount.findMany({
      where: { organizationId: session.organizationId, active: true, glType: 'Expense' },
      orderBy: { glNumber: 'asc' },
      select: { id: true, glNumber: true, glName: true },
    }),
    prisma.bankAccount.findMany({
      where: { property: { organizationId: session.organizationId }, active: true },
      include: { property: true },
      orderBy: [{ property: { name: 'asc' } }, { name: 'asc' }],
    }),
  ])

  const invoiceRows = vendor.vendorInvoices.map(i => ({
    id: i.id,
    date: i.date,
    propertyName: i.property.name,
    glLabel: `${i.glAccount.glNumber} – ${i.glAccount.glName}`,
    invoiceNumber: i.invoiceNumber,
    amount: i.amount,
    outstanding: i.amount - i.paymentApplications.reduce((s, a) => s + a.appliedAmount, 0),
  }))
  const totalInvoiced = invoiceRows.reduce((s, i) => s + i.amount, 0)
  const totalPaid = vendor.vendorPayments.reduce((s, p) => s + p.amount, 0)
  const balance = Math.round((totalInvoiced - totalPaid) * 100) / 100

  const paymentRows = vendor.vendorPayments.map(p => ({
    id: p.id,
    date: p.date,
    amount: p.amount,
    method: p.method,
  }))

  const bankAccountOptions = bankAccounts.map(b => ({ id: b.id, label: `${b.property.name} — ${b.name}` }))

  return (
    <div>
      <Link href="/admin/setup/vendors" className="text-xs underline mb-2 inline-block" style={{ color: 'var(--text-muted)' }}>
        ← Vendors
      </Link>
      <PageHeader
        title={vendor.name}
        subtitle={`${vendor.trade ?? 'No trade set'} · W-9 ${vendor.w9OnFile ? 'on file' : 'not on file'}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Invoiced</p>
          <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalInvoiced)}</p>
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
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Invoices</h2>
          <div className="mb-4"><EnterInvoiceForm vendorId={vendor.id} properties={properties} expenseAccounts={expenseAccounts} /></div>
          <DataTable
            columns={[
              { key: 'date', label: 'Date', render: (r: Record<string, unknown>) => formatDate(r.date as Date) },
              { key: 'propertyName', label: 'Property' },
              { key: 'glLabel', label: 'GL Account' },
              { key: 'amount', label: 'Amount', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.amount as number) },
              { key: 'outstanding', label: 'Outstanding', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.outstanding as number) },
            ]}
            data={invoiceRows as unknown as Record<string, unknown>[]}
            emptyMessage="No invoices yet."
          />
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Payments</h2>
          <div className="mb-4"><RecordVendorPaymentForm vendorId={vendor.id} balance={balance} bankAccounts={bankAccountOptions} /></div>
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
