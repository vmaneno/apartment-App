'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function OrganizationForm({ closedThrough }: { closedThrough: string | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/setup/organization', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closedThrough: form.closedThrough || null }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save'); setLoading(false); return }
    router.refresh()
    setLoading(false)
  }

  async function handleReopen() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/setup/organization', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closedThrough: null }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to reopen'); setLoading(false); return }
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-1 text-sm" style={{ color: 'var(--text-primary)' }}>Period Close</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        {closedThrough
          ? <>Closed through <span style={{ color: '#d4a017' }}>{closedThrough}</span> — nothing can be posted on or before this date.</>
          : 'Open — no period-close restriction is in effect.'}
      </p>
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Close Through</label>
          <input name="closedThrough" type="date" defaultValue={closedThrough ?? ''} className={cls} style={sx} />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button size="sm" type="submit" loading={loading}>Set</Button>
        {closedThrough && <Button size="sm" variant="ghost" type="button" onClick={handleReopen} disabled={loading}>Reopen</Button>}
      </form>
    </div>
  )
}
