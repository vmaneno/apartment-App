import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/utils'
import { Form1099Filters } from './Form1099Filters'

export const dynamic = 'force-dynamic'

const THRESHOLD = 600

type SearchParams = Promise<{ year?: string }>

export default async function Form1099sPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { year: yearParam } = await searchParams
  const currentYear = new Date().getUTCFullYear()
  const year = yearParam && /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : currentYear
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: session.organizationId, active: true },
    include: {
      vendorPayments: {
        where: {
          date: {
            gte: new Date(`${year}-01-01T00:00:00Z`),
            lte: new Date(`${year}-12-31T23:59:59Z`),
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const rows = vendors
    .map(v => ({
      id: v.id,
      name: v.name,
      w9OnFile: v.w9OnFile,
      totalPaid: Math.round(v.vendorPayments.reduce((s, p) => s + p.amount, 0) * 100) / 100,
    }))
    .filter(r => r.totalPaid > 0)
    .sort((a, b) => b.totalPaid - a.totalPaid)

  const reportable = rows.filter(r => r.totalPaid >= THRESHOLD)
  const missingW9 = reportable.filter(r => !r.w9OnFile)

  const cards = [
    { label: `${year} Paid Vendors`, value: String(rows.length) },
    { label: `Meets $${THRESHOLD} Threshold`, value: String(reportable.length) },
    { label: 'Missing W-9', value: String(missingW9.length) },
    { label: 'Total Paid', value: formatCurrency(rows.reduce((s, r) => s + r.totalPaid, 0)) },
  ]

  return (
    <div>
      <PageHeader title="1099 Vendors" subtitle="Vendor payments toward the $600 annual reporting threshold" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-4"><Form1099Filters year={year} years={years} /></div>
      {missingW9.length > 0 && (
        <div className="rounded-xl p-3 mb-4 text-xs" style={{ backgroundColor: '#d4a01722', color: '#d4a017', border: '1px solid #d4a01755' }}>
          {missingW9.length} vendor{missingW9.length === 1 ? '' : 's'} meet{missingW9.length === 1 ? 's' : ''} the ${THRESHOLD} threshold but {missingW9.length === 1 ? 'has' : 'have'} no W-9 on file.
        </div>
      )}
      <DataTable
        columns={[
          { key: 'name', label: 'Vendor', render: (r: Record<string, unknown>) => (
            <Link href={`/admin/setup/vendors/${r.id}`} className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              {r.name as string}
            </Link>
          ) },
          { key: 'totalPaid', label: `${year} Total Paid`, align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.totalPaid as number) },
          { key: 'reportable', label: `Meets $${THRESHOLD}`, align: 'center' as const, render: (r: Record<string, unknown>) => {
            const reportableRow = (r.totalPaid as number) >= THRESHOLD
            return reportableRow
              ? <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#10a06a22', color: '#10a06a' }}>Yes</span>
              : <span style={{ color: 'var(--text-muted)' }}>No</span>
          } },
          { key: 'w9OnFile', label: 'W-9 on File', align: 'center' as const, render: (r: Record<string, unknown>) => {
            const onFile = r.w9OnFile as boolean
            const reportableRow = (r.totalPaid as number) >= THRESHOLD
            if (onFile) return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#10a06a22', color: '#10a06a' }}>Yes</span>
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: reportableRow ? '#ef444422' : 'transparent', color: reportableRow ? '#ef4444' : 'var(--text-muted)' }}>No</span>
          } },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage={`No vendor payments recorded in ${year}.`}
      />
    </div>
  )
}
