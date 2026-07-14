'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Building2, Home, Users, UserCircle, ClipboardList, ScrollText, Receipt, FileText, FileSpreadsheet, BookOpen, Wrench, Landmark, TrendingUp, Scale, Hammer, Settings, LogOut, FileBadge, PiggyBank, BarChart3, FolderOpen, Droplets, ClipboardCheck, UserPlus } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Properties', href: '/admin/setup/properties', icon: <Building2 size={16} /> },
  { label: 'Units', href: '/admin/setup/units', icon: <Home size={16} /> },
  { label: 'Owners', href: '/admin/setup/owners', icon: <UserCircle size={16} /> },
  { label: 'Tenants', href: '/admin/setup/tenants', icon: <Users size={16} /> },
  { label: 'Vendors', href: '/admin/setup/vendors', icon: <Wrench size={16} /> },
  { label: 'Applicants', href: '/admin/leasing/applicants', icon: <UserPlus size={16} /> },
  { label: 'Leases', href: '/admin/setup/leases', icon: <ScrollText size={16} /> },
  { label: 'Post Rent', href: '/admin/ar/post-rent', icon: <Receipt size={16} /> },
  { label: 'RUBS', href: '/admin/ar/rubs', icon: <Droplets size={16} /> },
  { label: 'AP Invoices', href: '/admin/ap/invoices', icon: <FileText size={16} /> },
  { label: 'Rent Roll', href: '/admin/reports/rent-roll', icon: <ClipboardList size={16} /> },
  { label: 'Chart of Accounts', href: '/admin/setup/chart-of-accounts', icon: <BookOpen size={16} /> },
  { label: 'Bank Accounts', href: '/admin/setup/bank-accounts', icon: <Landmark size={16} /> },
  { label: 'Budget', href: '/admin/setup/budget', icon: <PiggyBank size={16} /> },
  { label: 'Income Statement', href: '/admin/reports/income-statement', icon: <TrendingUp size={16} /> },
  { label: 'Balance Sheet', href: '/admin/reports/balance-sheet', icon: <Scale size={16} /> },
  { label: 'Budget vs. Actual', href: '/admin/reports/budget-vs-actual', icon: <BarChart3 size={16} /> },
  { label: 'Owner Statements', href: '/admin/reports/owner-statements', icon: <FileSpreadsheet size={16} /> },
  { label: '1099 Vendors', href: '/admin/reports/1099s', icon: <FileBadge size={16} /> },
  { label: 'Work Orders', href: '/admin/ops/work-orders', icon: <Hammer size={16} /> },
  { label: 'Inspections', href: '/admin/ops/inspections', icon: <ClipboardCheck size={16} /> },
  { label: 'Documents', href: '/admin/documents', icon: <FolderOpen size={16} /> },
  { label: 'Organization', href: '/admin/setup/organization', icon: <Settings size={16} /> },
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
