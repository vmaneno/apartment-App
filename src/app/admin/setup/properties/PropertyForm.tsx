'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function PropertyForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/setup/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save property'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  const field = (label: string, name: string, req = false) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input name={name} required={req} className={cls} style={sx} />
    </div>
  )

  if (!open) return <Button onClick={() => setOpen(true)}>+ Add Property</Button>

  return (
    <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Property</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {field('Property Name *', 'name', true)}
        {field('Address Line 1 *', 'addressLine1', true)}
        {field('Address Line 2', 'addressLine2')}
        {field('City *', 'city', true)}
        {field('State *', 'state', true)}
        {field('Zip *', 'zip', true)}
        {error && <p className="col-span-3 text-xs text-red-400">{error}</p>}
        <div className="col-span-3 flex gap-3 justify-end">
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </div>
  )
}
