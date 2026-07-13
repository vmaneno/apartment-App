'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

type BankAccountOption = { id: string; name: string }

export function RecordDistributionForm({ ownerId, propertyId, defaultAmount, bankAccounts }: {
  ownerId: string
  propertyId: string
  defaultAmount: number
  bankAccounts: BankAccountOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/owners/distributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ownerId, propertyId }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to record distribution'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (bankAccounts.length === 0) {
    return <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No bank account for this property.</p>
  }

  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Record Distribution</Button>

  return (
    <div className="rounded-lg p-3 mt-2" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Amount *</label>
          <input name="amount" type="number" step="0.01" min="0" defaultValue={defaultAmount > 0 ? defaultAmount : undefined} required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>From *</label>
          <select name="bankAccountId" required className={cls} style={sx}>
            <option value="">— Select —</option>
            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date *</label>
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className={cls} style={sx} />
        </div>
        {error && <p className="col-span-2 text-xs text-red-400">{error}</p>}
        <div className="col-span-2 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" type="submit" loading={loading}>Record</Button>
        </div>
      </form>
    </div>
  )
}
