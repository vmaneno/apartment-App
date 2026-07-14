'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { allocateRubs, rubsWeight, type RubsMethod } from '@/lib/rubs'

type PropertyOption = { id: string; name: string }
type LeaseRow = { id: string; unitNumber: string; sqft: number | null; beds: number; tenantNames: string }

const cls = 'px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

const METHOD_LABELS: Record<RubsMethod, string> = { sqft: 'By Square Footage', beds: 'By Bedrooms', equal: 'Equal Split' }

export function RubsForm({ properties, propertyId, leases }: {
  properties: PropertyOption[]
  propertyId: string
  leases: LeaseRow[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [method, setMethod] = useState<RubsMethod>('sqft')
  const [totalAmount, setTotalAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function changeProperty(id: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (id) p.set('propertyId', id)
    else p.delete('propertyId')
    router.push(`${pathname}?${p.toString()}`)
  }

  const amountNum = parseFloat(totalAmount) || 0
  const missingSqft = method === 'sqft' && leases.some(l => !l.sqft)
  const weights = leases.map(l => rubsWeight(method, l))
  const shares = amountNum > 0 && !missingSqft ? allocateRubs(amountNum, weights) : leases.map(() => 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/ar/rubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, method, totalAmount: amountNum, date }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to post RUBS charges'); setLoading(false); return }
    setSuccess(`Posted ${json.posted} charge(s).${json.errors?.length ? ` ${json.errors.length} failed: ${json.errors.join('; ')}` : ''}`)
    setTotalAmount('')
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Property</label>
          <select value={propertyId} onChange={e => changeProperty(e.target.value)} className={cls} style={sx}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Allocation Method</label>
          <select value={method} onChange={e => setMethod(e.target.value as RubsMethod)} className={cls} style={sx}>
            {(Object.keys(METHOD_LABELS) as RubsMethod[]).map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Utility Bill *</label>
          <input type="number" step="0.01" min="0" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={cls} style={sx} />
        </div>
        <Button type="submit" loading={loading} disabled={leases.length === 0 || amountNum <= 0 || missingSqft}>
          Post to {leases.length} Lease{leases.length === 1 ? '' : 's'}
        </Button>
      </div>
      {missingSqft && (
        <p className="text-xs" style={{ color: '#d4a017' }}>
          One or more units on this property are missing square footage — set it under Setup → Units, or switch to a different allocation method.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs" style={{ color: '#10a06a' }}>{success}</p>}

      <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--sidebar-bg)' }}>
              <th className="px-4 py-3 text-xs font-semibold text-left" style={{ color: 'var(--accent)' }}>Unit</th>
              <th className="px-4 py-3 text-xs font-semibold text-left" style={{ color: 'var(--accent)' }}>Tenant(s)</th>
              <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>Sqft</th>
              <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>Beds</th>
              <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {leases.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No active leases on this property.</td></tr>
            ) : leases.map((l, i) => (
              <tr key={l.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{l.unitNumber}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{l.tenantNames}</td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--text-primary)' }}>{l.sqft ?? '—'}</td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--text-primary)' }}>{l.beds}</td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(shares[i] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  )
}
