'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type OwnerOption = { id: string; name: string }

const cls = 'text-sm rounded-lg px-3 py-1.5 border'
const sx = { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }

export function OwnerStatementFilters({ owners, ownerId, startDate, endDate }: {
  owners: OwnerOption[]
  ownerId: string
  startDate: string
  endDate: string
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
      <select value={ownerId} onChange={e => updateParam('ownerId', e.target.value)} className={cls} style={sx}>
        <option value="">— Select Owner —</option>
        {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <input type="date" value={startDate} onChange={e => updateParam('startDate', e.target.value)} className={cls} style={sx} />
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
      <input type="date" value={endDate} onChange={e => updateParam('endDate', e.target.value)} className={cls} style={sx} />
    </div>
  )
}
