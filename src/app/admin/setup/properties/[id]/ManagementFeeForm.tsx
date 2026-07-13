'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function ManagementFeeForm({ propertyId, feePercent }: { propertyId: string; feePercent: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch(`/api/setup/properties/${propertyId}/management-agreement`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save'); setLoading(false); return }
    setEditing(false)
    router.refresh()
    setLoading(false)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {feePercent > 0 ? `${feePercent}% management fee` : 'Self-managed (0% fee)'}
        </p>
        <button onClick={() => setEditing(true)} className="text-xs underline" style={{ color: 'var(--accent)' }}>Edit</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input name="feePercent" type="number" step="0.1" min="0" max="100" defaultValue={feePercent} className={cls} style={{ ...sx, width: '6rem' }} />
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>%</span>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button variant="ghost" size="sm" type="button" onClick={() => { setEditing(false); setError('') }}>Cancel</Button>
      <Button size="sm" type="submit" loading={loading}>Save</Button>
    </form>
  )
}
