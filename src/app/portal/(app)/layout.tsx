import { redirect } from 'next/navigation'
import { getTenantSession } from '@/lib/tenantAuth'
import { PortalTopBar } from './PortalTopBar'

export const dynamic = 'force-dynamic'

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getTenantSession()
  if (!session) redirect('/portal/login')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <PortalTopBar name={session.name} />
      <main className="max-w-3xl mx-auto p-6">{children}</main>
    </div>
  )
}
