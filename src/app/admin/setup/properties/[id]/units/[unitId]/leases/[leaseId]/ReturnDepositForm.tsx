'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function ReturnDepositForm({ depositId, amount }: { depositId: string; amount: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch(`/api/trust/security-deposits/${depositId}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to return deposit'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>+ Return Deposit</Button>

  return (
    <div className="rounded-xl p-5 shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Return Deposit (collected: {amount.toFixed(2)})</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Returned to Tenant *</label>
          <input name="returnedToTenant" type="number" step="0.01" min="0" defaultValue={amount} required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Retained *</label>
          <input name="retained" type="number" step="0.01" min="0" defaultValue={0} required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date *</label>
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className={cls} style={sx} />
        </div>
        {error && <p className="col-span-4 text-xs text-red-400">{error}</p>}
        <p className="col-span-2 md:col-span-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Returned to Tenant + Retained must add up to the collected amount.
        </p>
        <div className="col-span-2 md:col-span-4 flex gap-3 justify-end">
          <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" type="submit" loading={loading}>Return</Button>
        </div>
      </form>
    </div>
  )
}
