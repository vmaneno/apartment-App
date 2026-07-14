import { redirect } from 'next/navigation'
import { getTenantSession } from '@/lib/tenantAuth'
import { PortalLoginForm } from './PortalLoginForm'

export const dynamic = 'force-dynamic'

export default async function PortalLoginPage() {
  const session = await getTenantSession()
  if (session) redirect('/portal/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-sm rounded-xl p-8 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Tenant Portal</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Sign in to view your lease and balance</p>
        <PortalLoginForm />
      </div>
    </div>
  )
}
