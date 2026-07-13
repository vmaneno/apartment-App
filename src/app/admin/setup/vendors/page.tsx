import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatDate } from '@/lib/utils'
import { VendorForm } from './VendorForm'
import { VendorRowActions } from './VendorRowActions'

export const dynamic = 'force-dynamic'

export default async function VendorsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: { name: 'asc' },
  })

  const now = new Date()

  return (
    <div>
      <PageHeader title="Vendors" subtitle="Contractors and service providers, with COI/W-9 tracking" />
      <div className="mb-6"><VendorForm /></div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'trade', label: 'Trade', render: (r: Record<string, unknown>) => (r.trade as string | null) ?? '—' },
          { key: 'email', label: 'Email', render: (r: Record<string, unknown>) => (r.email as string | null) ?? '—' },
          { key: 'phone', label: 'Phone', render: (r: Record<string, unknown>) => (r.phone as string | null) ?? '—' },
          { key: 'coiExpiresAt', label: 'COI Expires', render: (r: Record<string, unknown>) => {
            const d = r.coiExpiresAt as Date | null
            if (!d) return <span style={{ color: 'var(--text-muted)' }}>—</span>
            const expired = new Date(d) < now
            return <span style={{ color: expired ? '#ef4444' : 'var(--text-primary)' }}>{formatDate(d)}{expired ? ' (expired)' : ''}</span>
          } },
          { key: 'w9OnFile', label: 'W-9', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <span style={{ color: r.w9OnFile ? '#10a06a' : '#d4a017' }}>{r.w9OnFile ? 'Yes' : 'No'}</span>
          ) },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <VendorRowActions vendor={r as unknown as Parameters<typeof VendorRowActions>[0]['vendor']} />
          ) },
        ]}
        data={vendors as unknown as Record<string, unknown>[]}
        emptyMessage="No vendors yet — click Add Vendor to create one."
      />
    </div>
  )
}
