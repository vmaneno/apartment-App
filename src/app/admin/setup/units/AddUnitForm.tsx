'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type PropertyOption = { id: string; name: string }

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function AddUnitForm({ properties }: { properties: PropertyOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/setup/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save unit'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  const field = (label: string, name: string, req = false, type = 'text') => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input name={name} type={type} required={req} className={cls} style={sx} />
    </div>
  )

  if (properties.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add a property first, then units can be created for it.</p>
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Add Unit</Button>

  return (
    <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Unit</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Property *</label>
          <select name="propertyId" required className={cls} style={sx}>
            <option value="">— Select property —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {field('Unit # *', 'unitNumber', true)}
        {field('Beds', 'beds', false, 'number')}
        {field('Baths', 'baths', false, 'number')}
        {field('Sqft', 'sqft', false, 'number')}
        {field('Market Rent', 'marketRent', false, 'number')}
        {error && <p className="col-span-3 text-xs text-red-400">{error}</p>}
        <div className="col-span-3 flex gap-3 justify-end">
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </div>
  )
}
