import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { OrganizationForm } from './OrganizationForm'

export const dynamic = 'force-dynamic'

export default async function OrganizationPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } })
  if (!org) redirect('/login')

  return (
    <div>
      <PageHeader title="Organization" subtitle="Period-close controls" />
      {session.role !== 'admin' ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Admins only — ask an admin to change period-close settings.</p>
      ) : (
        <OrganizationForm closedThrough={org.closedThrough ? org.closedThrough.toISOString().slice(0, 10) : null} />
      )}
    </div>
  )
}
