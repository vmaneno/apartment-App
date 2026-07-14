import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatDate } from '@/lib/utils'
import { UploadDocumentForm } from './UploadDocumentForm'
import { DocumentRowActions } from './DocumentRowActions'
import { DocumentsFilters } from './DocumentsFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ category?: string }>

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { category } = await searchParams

  const [documents, properties, units, leases, tenants, vendors, inspections, applicants] = await Promise.all([
    prisma.document.findMany({
      where: { organizationId: session.organizationId, ...(category ? { category } : {}) },
      include: {
        property: true,
        unit: { include: { property: true } },
        lease: { include: { unit: { include: { property: true } }, leaseTenants: { include: { tenant: true } } } },
        tenant: true,
        vendor: true,
        inspection: { include: { property: true, unit: true } },
        applicant: true,
      },
      orderBy: { uploadedAt: 'desc' },
    }),
    prisma.property.findMany({ where: { organizationId: session.organizationId, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.unit.findMany({ where: { property: { organizationId: session.organizationId, active: true }, active: true }, include: { property: true }, orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }] }),
    prisma.lease.findMany({ where: { unit: { property: { organizationId: session.organizationId, active: true } } }, include: { unit: { include: { property: true } }, leaseTenants: { include: { tenant: true } } }, orderBy: { startDate: 'desc' } }),
    prisma.tenant.findMany({ where: { organizationId: session.organizationId, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.vendor.findMany({ where: { organizationId: session.organizationId, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.inspection.findMany({ where: { organizationId: session.organizationId }, include: { property: true, unit: true }, orderBy: { scheduledDate: 'desc' } }),
    prisma.applicant.findMany({ where: { organizationId: session.organizationId }, orderBy: { applicationDate: 'desc' }, select: { id: true, name: true } }),
  ])

  const rows = documents.map(d => {
    const linkedTo = d.property?.name
      ?? (d.unit ? `${d.unit.property.name} — Unit ${d.unit.unitNumber}` : null)
      ?? (d.lease ? `Lease — ${d.lease.leaseTenants.map(lt => lt.tenant.name).join(', ') || `Unit ${d.lease.unit.unitNumber}`}` : null)
      ?? d.tenant?.name
      ?? d.vendor?.name
      ?? (d.inspection ? `Inspection — ${d.inspection.property.name}${d.inspection.unit ? ` Unit ${d.inspection.unit.unitNumber}` : ''} (${d.inspection.type})` : null)
      ?? (d.applicant ? `Applicant — ${d.applicant.name}` : null)
      ?? '—'
    return {
      id: d.id,
      fileName: d.fileName,
      category: d.category,
      size: d.size,
      linkedTo,
      uploadedAt: d.uploadedAt,
    }
  })

  return (
    <div>
      <PageHeader title="Documents" subtitle="Leases, W-9s, COIs, inspection photos, and other files" />
      <div className="mb-6">
        <UploadDocumentForm
          properties={properties.map(p => ({ id: p.id, label: p.name }))}
          units={units.map(u => ({ id: u.id, label: `${u.property.name} — Unit ${u.unitNumber}` }))}
          leases={leases.map(l => ({ id: l.id, label: `${l.unit.property.name} — Unit ${l.unit.unitNumber} (${l.leaseTenants.map(lt => lt.tenant.name).join(', ') || 'Vacant'})` }))}
          tenants={tenants.map(t => ({ id: t.id, label: t.name }))}
          vendors={vendors.map(v => ({ id: v.id, label: v.name }))}
          inspections={inspections.map(i => ({ id: i.id, label: `${i.property.name}${i.unit ? ` — Unit ${i.unit.unitNumber}` : ''} — ${i.type} (${new Date(i.scheduledDate).toISOString().slice(0, 10)})` }))}
          applicants={applicants.map(a => ({ id: a.id, label: a.name }))}
        />
      </div>
      <div className="mb-4"><DocumentsFilters category={category ?? ''} /></div>
      <DataTable
        columns={[
          { key: 'fileName', label: 'File', render: (r: Record<string, unknown>) => (
            <a href={`/api/documents/${r.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--accent)' }}>
              {r.fileName as string}
            </a>
          ) },
          { key: 'category', label: 'Category' },
          { key: 'linkedTo', label: 'Attached To' },
          { key: 'size', label: 'Size', align: 'right' as const, render: (r: Record<string, unknown>) => formatBytes(r.size as number) },
          { key: 'uploadedAt', label: 'Uploaded', render: (r: Record<string, unknown>) => formatDate(r.uploadedAt as Date) },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <DocumentRowActions id={r.id as string} fileName={r.fileName as string} />
          ) },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No documents yet — click Upload Document to add one."
      />
    </div>
  )
}
