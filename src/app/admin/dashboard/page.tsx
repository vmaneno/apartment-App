import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [propertyCount, unitCount, ownerCount] = await Promise.all([
    prisma.property.count({ where: { organizationId: session.organizationId, active: true } }),
    prisma.unit.count({ where: { property: { organizationId: session.organizationId }, active: true } }),
    prisma.owner.count({ where: { organizationId: session.organizationId, active: true } }),
  ])

  const cards = [
    { label: 'Properties', value: propertyCount },
    { label: 'Units', value: unitCount },
    { label: 'Owners', value: ownerCount },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Welcome, ${session.name}`} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
