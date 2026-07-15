'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type PropertyOption = { id: string; name: string }

const cls = 'text-sm rounded-lg px-3 py-1.5 border'
const sx = { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }

export function WorkOrderAgingFilters({ properties, propertyId, priority }: {
  properties: PropertyOption[]
  propertyId: string
  priority: string
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
      <select value={priority} onChange={e => updateParam('priority', e.target.value)} className={cls} style={sx}>
        <option value="all">All Priorities</option>
        <option value="Emergency">Emergency</option>
        <option value="Routine">Routine</option>
      </select>
    </div>
  )
}
