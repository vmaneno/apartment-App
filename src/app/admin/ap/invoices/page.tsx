import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EnterInvoiceForm } from './EnterInvoiceForm'
import { InvoicesFilters } from './InvoicesFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; vendorId?: string }>

export default async function ApInvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, vendorId } = await searchParams

  const [invoices, vendors, properties, expenseAccounts] = await Promise.all([
    prisma.vendorInvoice.findMany({
      where: {
        vendor: { organizationId: session.organizationId },
        ...(propertyId ? { propertyId } : {}),
        ...(vendorId ? { vendorId } : {}),
      },
      include: { vendor: true, property: true, glAccount: true, paymentApplications: true },
      orderBy: { date: 'desc' },
    }),
    prisma.vendor.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
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
  ])

  const rows = invoices.map(i => ({
    id: i.id,
    vendorId: i.vendorId,
    vendorName: i.vendor.name,
    propertyName: i.property.name,
    glLabel: `${i.glAccount.glNumber} – ${i.glAccount.glName}`,
    date: i.date,
    invoiceNumber: i.invoiceNumber,
    amount: i.amount,
    outstanding: i.amount - i.paymentApplications.reduce((s, a) => s + a.appliedAmount, 0),
  }))

  return (
    <div>
      <PageHeader title="AP Invoices" subtitle="Every vendor invoice across your properties" />
      <div className="mb-6"><EnterInvoiceForm vendors={vendors} properties={properties} expenseAccounts={expenseAccounts} /></div>
      <div className="mb-4"><InvoicesFilters properties={properties} vendors={vendors} propertyId={propertyId ?? ''} vendorId={vendorId ?? ''} /></div>
      <DataTable
        columns={[
          { key: 'date', label: 'Date', render: (r: Record<string, unknown>) => formatDate(r.date as Date) },
          { key: 'vendorName', label: 'Vendor', render: (r: Record<string, unknown>) => (
            <Link href={`/admin/setup/vendors/${r.vendorId}`} className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              {r.vendorName as string}
            </Link>
          ) },
          { key: 'propertyName', label: 'Property' },
          { key: 'glLabel', label: 'GL Account' },
          { key: 'invoiceNumber', label: 'Invoice #', render: (r: Record<string, unknown>) => (r.invoiceNumber as string | null) ?? '—' },
          { key: 'amount', label: 'Amount', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.amount as number) },
          { key: 'outstanding', label: 'Outstanding', align: 'right' as const, render: (r: Record<string, unknown>) => {
            const o = r.outstanding as number
            return <span style={{ color: o > 0 ? '#d4a017' : 'var(--text-primary)' }}>{formatCurrency(o)}</span>
          } },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No invoices match — try clearing filters, or click Enter Invoice to create one."
      />
    </div>
  )
}
