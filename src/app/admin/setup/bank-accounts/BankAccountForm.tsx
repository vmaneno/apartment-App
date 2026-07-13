'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type PropertyOption = { id: string; name: string }
type GlOption = { id: string; glNumber: string; glName: string }

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function BankAccountForm({ properties, glAccounts }: { properties: PropertyOption[]; glAccounts: GlOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/setup/bank-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save bank account'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (properties.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add a property first.</p>
  }
  if (glAccounts.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No Asset GL accounts yet — add one in Setup → Chart of Accounts first.</p>
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Add Bank Account</Button>

  return (
    <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Bank Account</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Property *</label>
          <select name="propertyId" required className={cls} style={sx}>
            <option value="">— Select —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Account Name *</label>
          <input name="name" required placeholder="e.g. Operating Checking" className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
          <select name="type" defaultValue="Operating" className={cls} style={sx}>
            <option value="Operating">Operating</option>
            <option value="SecurityDepositTrust">Security Deposit Trust</option>
            <option value="Reserve">Reserve</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>GL Account *</label>
          <select name="glAccountId" required className={cls} style={sx}>
            <option value="">— Select —</option>
            {glAccounts.map(a => <option key={a.id} value={a.id}>{a.glNumber} – {a.glName}</option>)}
          </select>
        </div>
        {error && <p className="col-span-4 text-xs text-red-400">{error}</p>}
        <div className="col-span-4 flex gap-3 justify-end">
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </div>
  )
}
