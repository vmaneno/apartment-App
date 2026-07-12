'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Building2, Users, LogOut } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Properties', href: '/admin/setup/properties', icon: <Building2 size={16} /> },
]

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="w-56 flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
      <div className="px-4 py-5">
        <p className="font-bold text-sm" style={{ color: 'var(--sidebar-text)' }}>Apartment Mgmt</p>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: active ? 'var(--sidebar-hover)' : 'transparent',
                color: 'var(--sidebar-text)',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--sidebar-hover)' }}>
        <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: 'var(--sidebar-text)', opacity: 0.7 }}>
          <Users size={13} /> {userName}
        </p>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sidebar-text)', opacity: 0.7 }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  )
}
