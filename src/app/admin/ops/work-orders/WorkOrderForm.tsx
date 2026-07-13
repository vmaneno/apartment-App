'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type Property = { id: string; name: string }
type Unit = { id: string; propertyId: string; unitNumber: string }
type Vendor = { id: string; name: string }

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function WorkOrderForm({ properties, units, vendors }: { properties: Property[]; units: Unit[]; vendors: Vendor[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [propertyId, setPropertyId] = useState('')

  const unitOptions = useMemo(() => units.filter(u => u.propertyId === propertyId), [units, propertyId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/ops/work-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save work order'); setLoading(false); return }
    setOpen(false)
    setPropertyId('')
    router.refresh()
    setLoading(false)
  }

  if (properties.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add a property first.</p>
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Add Work Order</Button>

  return (
    <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Work Order</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Property *</label>
          <select name="propertyId" value={propertyId} onChange={e => setPropertyId(e.target.value)} required className={cls} style={sx}>
            <option value="">— Select —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Unit (optional)</label>
          <select name="unitId" disabled={!propertyId} className={cls} style={sx}>
            <option value="">— Property-wide —</option>
            {unitOptions.map(u => <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Priority</label>
          <select name="priority" defaultValue="Routine" className={cls} style={sx}>
            <option value="Routine">Routine</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Description *</label>
          <input name="description" required placeholder="e.g. Leaking faucet in kitchen" className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Assign to Vendor</label>
          <select name="assignedVendorId" className={cls} style={sx}>
            <option value="">— Unassigned —</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        {error && <p className="col-span-3 text-xs text-red-400">{error}</p>}
        <div className="col-span-3 flex gap-3 justify-end">
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </div>
  )
}
