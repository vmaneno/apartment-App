'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type PropertyOption = { id: string; name: string }

const cls = 'text-sm rounded-lg px-3 py-1.5 border'
const sx = { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }

export function TrustReconciliationFilters({ properties, propertyId, asOfDate }: {
  properties: PropertyOption[]
  propertyId: string
  asOfDate: string
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
      <label className="text-xs" style={{ color: 'var(--text-muted)' }}>As of</label>
      <input type="date" value={asOfDate} onChange={e => updateParam('asOfDate', e.target.value)} className={cls} style={sx} />
    </div>
  )
}
