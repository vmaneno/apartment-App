import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatDate } from '@/lib/utils'
import { ApplicantForm } from './ApplicantForm'
import { ApplicantRowActions } from './ApplicantRowActions'
import { ApplicantsFilters } from './ApplicantsFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; status?: string }>
const STATUSES = ['Applied', 'Screening', 'Approved', 'Denied', 'Withdrawn']

export default async function ApplicantsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, status } = await searchParams
  const selectedStatus = status && STATUSES.includes(status) ? status : 'all'

  const [applicants, properties, units] = await Promise.all([
    prisma.applicant.findMany({
      where: {
        organizationId: session.organizationId,
        ...(propertyId ? { propertyId } : {}),
        ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}),
      },
      include: { property: true, unit: true },
      orderBy: [{ applicationDate: 'desc' }],
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
    Applied: '#d4a017',
    Screening: '#4a7cd4',
    Approved: '#10a06a',
    Denied: '#ef4444',
    Withdrawn: 'var(--text-muted)',
  }

  return (
    <div>
      <PageHeader title="Applicants" subtitle="Prospective-tenant tracking, from application through decision" />
      <div className="mb-6"><ApplicantForm properties={properties} units={units} /></div>
      <div className="mb-4"><ApplicantsFilters properties={properties} propertyId={propertyId ?? ''} status={selectedStatus} /></div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'propertyName', label: 'Property', render: (r: Record<string, unknown>) => (r.property as { name: string }).name },
          { key: 'unit', label: 'Unit', render: (r: Record<string, unknown>) => (r.unit as { unitNumber: string } | null)?.unitNumber ?? '—' },
          { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => {
            const s = r.status as string
            const color = statusColor[s] ?? 'var(--text-muted)'
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${color}22`, color }}>{s}</span>
          } },
          { key: 'applicationDate', label: 'Applied', render: (r: Record<string, unknown>) => formatDate(r.applicationDate as Date) },
          { key: 'email', label: 'Email', render: (r: Record<string, unknown>) => (r.email as string | null) ?? '—' },
          { key: 'phone', label: 'Phone', render: (r: Record<string, unknown>) => (r.phone as string | null) ?? '—' },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <ApplicantRowActions applicant={r as unknown as Parameters<typeof ApplicantRowActions>[0]['applicant']} />
          ) },
        ]}
        data={applicants as unknown as Record<string, unknown>[]}
        emptyMessage="No applicants yet — click Add Applicant to create one."
      />
    </div>
  )
}
