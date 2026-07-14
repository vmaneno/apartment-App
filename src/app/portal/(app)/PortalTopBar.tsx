'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

const navItems = [
  { label: 'My Lease', href: '/portal/dashboard' },
  { label: 'Maintenance', href: '/portal/maintenance' },
]

export function PortalTopBar({ name }: { name: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/portal/auth/logout', { method: 'POST' })
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <div className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--sidebar-bg)' }}>
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6">
          <p className="font-bold text-sm" style={{ color: 'var(--sidebar-text)' }}>Tenant Portal</p>
          <nav className="flex items-center gap-4">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm"
                style={{ color: 'var(--sidebar-text)', opacity: pathname === item.href ? 1 : 0.7, fontWeight: pathname === item.href ? 600 : 400 }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--sidebar-text)', opacity: 0.7 }}>{name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sidebar-text)', opacity: 0.7 }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
