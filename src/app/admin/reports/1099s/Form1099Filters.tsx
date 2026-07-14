'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const cls = 'text-sm rounded-lg px-3 py-1.5 border'
const sx = { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }

export function Form1099Filters({ year, years }: { year: number; years: number[] }) {
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
      <select value={String(year)} onChange={e => updateParam('year', e.target.value)} className={cls} style={sx}>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}
