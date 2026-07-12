import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { OwnerForm } from './OwnerForm'
import { OwnerRowActions } from './OwnerRowActions'

export const dynamic = 'force-dynamic'

export default async function OwnersPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const owners = await prisma.owner.findMany({
    where: { organizationId: session.organizationId, active: true },
    include: { propertyOwners: { include: { property: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <PageHeader title="Owners" subtitle="Parties who hold equity in one or more properties" />
      <div className="mb-6"><OwnerForm /></div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'email', label: 'Email', render: (r: Record<string, unknown>) => (r.email as string | null) ?? '—' },
          { key: 'phone', label: 'Phone', render: (r: Record<string, unknown>) => (r.phone as string | null) ?? '—' },
          { key: 'properties', label: 'Properties', render: (r: Record<string, unknown>) => {
            const rows = r.propertyOwners as { property: { name: string }; ownershipPercent: number }[]
            if (rows.length === 0) return '—'
            return rows.map(po => `${po.property.name} (${po.ownershipPercent}%)`).join(', ')
          } },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <OwnerRowActions owner={r as unknown as Parameters<typeof OwnerRowActions>[0]['owner']} />
          ) },
        ]}
        data={owners as unknown as Record<string, unknown>[]}
        emptyMessage="No owners yet — click Add Owner to create one."
      />
    </div>
  )
}
