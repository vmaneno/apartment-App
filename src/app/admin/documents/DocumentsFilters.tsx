'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const cls = 'text-sm rounded-lg px-3 py-1.5 border'
const sx = { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }
const CATEGORIES = ['Lease', 'W9', 'COI', 'Inspection', 'ID', 'Other']

export function DocumentsFilters({ category }: { category: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={category} onChange={e => updateParam('category', e.target.value)} className={cls} style={sx}>
        <option value="">All Categories</option>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}
