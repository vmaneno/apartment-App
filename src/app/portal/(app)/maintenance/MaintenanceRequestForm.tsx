'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type LeaseOption = { id: string; label: string }

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function MaintenanceRequestForm({ leases }: { leases: LeaseOption[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const formEl = e.currentTarget
    const data = Object.fromEntries(new FormData(formEl))
    const res = await fetch('/api/portal/work-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to submit request'); setLoading(false); return }
    setSuccess('Request submitted.')
    formEl.reset()
    router.refresh()
    setLoading(false)
  }

  if (leases.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You don&apos;t have an active lease on file.</p>
  }

  return (
    <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Submit a Maintenance Request</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {leases.length > 1 && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Unit</label>
            <select name="leaseId" required className={cls} style={sx}>
              {leases.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        )}
        {leases.length === 1 && <input type="hidden" name="leaseId" value={leases[0].id} />}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Priority</label>
          <select name="priority" defaultValue="Routine" className={cls} style={sx}>
            <option value="Routine">Routine</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
        <div className={leases.length > 1 ? 'md:col-span-1' : 'md:col-span-2'}>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Description *</label>
          <input name="description" required placeholder="e.g. Leaking faucet in kitchen" className={cls} style={sx} />
        </div>
        {error && <p className="col-span-3 text-xs text-red-400">{error}</p>}
        {success && <p className="col-span-3 text-xs" style={{ color: '#10a06a' }}>{success}</p>}
        <div className="col-span-3 flex justify-end">
          <Button type="submit" loading={loading}>Submit</Button>
        </div>
      </form>
    </div>
  )
}
