import Link from 'next/link'
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
    { label: 'Properties', value: propertyCount, href: '/admin/setup/properties' },
    { label: 'Units', value: unitCount, href: '/admin/setup/units' },
    { label: 'Owners', value: ownerCount, href: '/admin/setup/owners' },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Welcome, ${session.name}`} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(c => (
          <Link key={c.label} href={c.href} className="rounded-xl p-5 block hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
