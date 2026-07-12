'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

type LeaseRow = {
  id: string
  rentAmount: number
  propertyName: string
  unitNumber: string
  tenantNames: string
}

const cls = 'px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

const CHARGE_TYPES = ['Rent', 'Pet Rent', 'Parking', 'Late Fee', 'Other']

export function PostRentForm({ leases }: { leases: LeaseRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [chargeType, setChargeType] = useState('Rent')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isRent = chargeType === 'Rent'

  function toggleLease(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    setSelected(prev => prev.length === leases.length ? [] : leases.map(l => l.id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.length === 0) { setError('Select at least one lease'); return }
    setLoading(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/ar/lease-charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaseIds: selected, chargeType, amount, date }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to post charges'); setLoading(false); return }
    setSuccess(`Posted ${json.posted} charge(s).${json.errors?.length ? ` ${json.errors.length} failed: ${json.errors.join('; ')}` : ''}`)
    setSelected([])
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Charge Type</label>
          <select value={chargeType} onChange={e => setChargeType(e.target.value)} className={cls} style={sx}>
            {CHARGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {!isRent && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Amount (applied to every selected lease) *</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required={!isRent} className={cls} style={sx} />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={cls} style={sx} />
        </div>
        <Button type="submit" loading={loading} disabled={selected.length === 0}>
          Post to {selected.length} Lease{selected.length === 1 ? '' : 's'}
        </Button>
      </div>
      {isRent && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Rent posts at each lease&apos;s own rent amount.</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs" style={{ color: '#10a06a' }}>{success}</p>}

      <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--sidebar-bg)' }}>
              <th className="px-4 py-3 text-left">
                <input type="checkbox" checked={selected.length === leases.length && leases.length > 0} onChange={toggleAll} />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-left" style={{ color: 'var(--accent)' }}>Property</th>
              <th className="px-4 py-3 text-xs font-semibold text-left" style={{ color: 'var(--accent)' }}>Unit</th>
              <th className="px-4 py-3 text-xs font-semibold text-left" style={{ color: 'var(--accent)' }}>Tenant(s)</th>
              <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>Rent Amount</th>
            </tr>
          </thead>
          <tbody>
            {leases.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No active leases found.</td></tr>
            ) : leases.map((l, i) => (
              <tr key={l.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleLease(l.id)} /></td>
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{l.propertyName}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{l.unitNumber}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{l.tenantNames}</td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(l.rentAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  )
}
