import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/admin/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-sm rounded-xl p-8 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Apartment Management</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
        <LoginForm />
      </div>
    </div>
  )
}
