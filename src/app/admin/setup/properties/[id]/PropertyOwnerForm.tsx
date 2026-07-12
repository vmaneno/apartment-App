'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

type Owner = { id: string; name: string; type: string }

export function PropertyOwnerForm({ propertyId, owners }: { propertyId: string; owners: Owner[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = { ...Object.fromEntries(new FormData(e.currentTarget)), propertyId }
    const res = await fetch('/api/setup/property-owners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save owner assignment'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (owners.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        No owners defined yet. <Link href="/admin/setup/owners" className="underline" style={{ color: 'var(--accent)' }}>Add one in Setup → Owners</Link> first.
      </p>
    )
  }

  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>+ Add / Update Owner</Button>

  return (
    <div className="rounded-xl p-5 shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Assign Owner</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Owner *</label>
          <select name="ownerId" required className={cls} style={sx}>
            {owners.map(o => <option key={o.id} value={o.id}>{o.name} ({o.type})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Ownership %</label>
          <input name="ownershipPercent" type="number" step="0.01" min="0" max="100" defaultValue="100" className={cls} style={sx} />
        </div>
        {error && <p className="col-span-4 text-xs text-red-400">{error}</p>}
        <div className="col-span-2 md:col-span-4 flex gap-3 justify-end">
          <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" type="submit" loading={loading}>Save</Button>
        </div>
      </form>
      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
        Adding a co-owner doesn&apos;t change existing owners&apos; percentages automatically — adjust each one so the total is accurate.
      </p>
    </div>
  )
}
