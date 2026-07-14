'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type Property = { id: string; name: string }
type Unit = { id: string; propertyId: string; unitNumber: string }

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }
const TYPES = ['Move-In', 'Move-Out', 'Routine', 'Turn']

export function InspectionForm({ properties, units }: { properties: Property[]; units: Unit[] }) {
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
    const res = await fetch('/api/ops/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save inspection'); setLoading(false); return }
    setOpen(false)
    setPropertyId('')
    router.refresh()
    setLoading(false)
  }

  if (properties.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add a property first.</p>
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Schedule Inspection</Button>

  return (
    <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Schedule Inspection</h2>
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
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
          <select name="type" defaultValue="Routine" className={cls} style={sx}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Scheduled Date *</label>
          <input name="scheduledDate" type="date" required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Inspector</label>
          <input name="inspectorName" placeholder="Optional" className={cls} style={sx} />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
          <input name="notes" placeholder="Optional" className={cls} style={sx} />
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
