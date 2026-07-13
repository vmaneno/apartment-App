'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

type Tenant = { id: string; name: string }
type UnitOption = { id: string; label: string; hasActiveLease: boolean }

export function AddLeaseForm({ units, tenants }: { units: UnitOption[]; tenants: Tenant[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const [unitId, setUnitId] = useState('')

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
    setUnitId('')
    router.refresh()
    setLoading(false)
  }

  if (units.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        No units defined yet. <Link href="/admin/setup/units" className="underline" style={{ color: 'var(--accent)' }}>Add one in Setup → Units</Link> first.
      </p>
    )
  }
  if (tenants.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        No tenants defined yet. <Link href="/admin/setup/tenants" className="underline" style={{ color: 'var(--accent)' }}>Add one in Setup → Tenants</Link> first.
      </p>
    )
  }

  const selectedUnit = units.find(u => u.id === unitId)

  if (!open) return <Button onClick={() => setOpen(true)}>+ Add Lease</Button>

  return (
    <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Lease</h2>
      {selectedUnit?.hasActiveLease && (
        <p className="text-xs mb-3" style={{ color: '#f59e0b' }}>
          This unit already has an active lease. A new lease here must be Pending or Ended, or end the active one first.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Unit *</label>
          <select value={unitId} onChange={e => setUnitId(e.target.value)} required className={cls} style={sx}>
            <option value="">— Select unit —</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.label}{u.hasActiveLease ? ' (occupied)' : ''}</option>)}
          </select>
        </div>
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
            <select name="status" defaultValue={selectedUnit?.hasActiveLease ? 'Pending' : 'Active'} className={cls} style={sx}>
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
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </div>
  )
}
