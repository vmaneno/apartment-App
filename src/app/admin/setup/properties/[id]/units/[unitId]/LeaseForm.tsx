'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

type Tenant = { id: string; name: string }

export function LeaseForm({ unitId, tenants, hasActiveLease }: { unitId: string; tenants: Tenant[]; hasActiveLease: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])

  function toggleTenant(id: string) {
    setSelectedTenants(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedTenants.length === 0) { setError('Select at least one tenant'); return }
    setLoading(true)
    setError('')
    const data = { ...Object.fromEntries(new FormData(e.currentTarget)), unitId, tenantIds: selectedTenants }
    const res = await fetch('/api/setup/leases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save lease'); setLoading(false); return }
    setOpen(false)
    setSelectedTenants([])
    router.refresh()
    setLoading(false)
  }

  if (tenants.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        No tenants defined yet. <Link href="/admin/setup/tenants" className="underline" style={{ color: 'var(--accent)' }}>Add one in Setup → Tenants</Link> first.
      </p>
    )
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>+ Add Lease</Button>

  return (
    <div className="rounded-xl p-5 shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Add Lease</h3>
      {hasActiveLease && (
        <p className="text-xs mb-3" style={{ color: '#f59e0b' }}>
          This unit already has an active lease. New leases here must be Pending or Ended, or end the active one first.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Tenant(s) *</label>
          <div className="flex flex-wrap gap-3">
            {tenants.map(t => (
              <label key={t.id} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={selectedTenants.includes(t.id)} onChange={() => toggleTenant(t.id)} />
                {t.name}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
            <select name="status" defaultValue={hasActiveLease ? 'Pending' : 'Active'} className={cls} style={sx}>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Ended">Ended</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Start Date *</label>
            <input name="startDate" type="date" required className={cls} style={sx} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>End Date</label>
            <input name="endDate" type="date" className={cls} style={sx} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Rent Amount *</label>
            <input name="rentAmount" type="number" step="0.01" min="0" required className={cls} style={sx} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Deposit Amount</label>
            <input name="depositAmount" type="number" step="0.01" min="0" className={cls} style={sx} />
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </div>
  )
}
