'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function UnitForm({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = { ...Object.fromEntries(new FormData(e.currentTarget)), propertyId }
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

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>+ Add Unit</Button>

  return (
    <div className="rounded-xl p-5 shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Add Unit</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {field('Unit # *', 'unitNumber', true)}
        {field('Beds', 'beds', false, 'number')}
        {field('Baths', 'baths', false, 'number')}
        {field('Sqft', 'sqft', false, 'number')}
        {field('Market Rent', 'marketRent', false, 'number')}
        {error && <p className="col-span-5 text-xs text-red-400">{error}</p>}
        <div className="col-span-2 md:col-span-5 flex gap-3 justify-end">
          <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </div>
  )
}
