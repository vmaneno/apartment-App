'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type PropertyOption = { id: string; name: string }

const cls = 'text-sm rounded-lg px-3 py-1.5 border'
const sx = { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function BudgetVsActualFilters({ properties, propertyId, year, years, throughMonth }: {
  properties: PropertyOption[]
  propertyId: string
  year: number
  years: number[]
  throughMonth: number
}) {
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
      <select value={propertyId} onChange={e => updateParam('propertyId', e.target.value)} className={cls} style={sx}>
        <option value="">All Properties</option>
        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={String(year)} onChange={e => updateParam('year', e.target.value)} className={cls} style={sx}>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>through</span>
      <select value={String(throughMonth)} onChange={e => updateParam('throughMonth', e.target.value)} className={cls} style={sx}>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
    </div>
  )
}
