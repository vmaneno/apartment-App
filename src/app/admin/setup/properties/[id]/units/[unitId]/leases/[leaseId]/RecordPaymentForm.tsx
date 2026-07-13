'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

const METHODS = ['ACH', 'Card', 'Check', 'Cash']

type BankAccountOption = { id: string; name: string }

export function RecordPaymentForm({ leaseId, balance, bankAccounts }: {
  leaseId: string
  balance: number
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
    const res = await fetch('/api/ar/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaseId, bankAccountId: form.bankAccountId, amount: form.amount, date: form.date, method: form.method }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to record payment'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (balance <= 0) return null

  if (bankAccounts.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        No bank account set up for this property yet. <Link href="/admin/setup/bank-accounts" className="underline" style={{ color: 'var(--accent)' }}>Add one in Setup → Bank Accounts</Link> before recording a payment.
      </p>
    )
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>+ Record Payment</Button>

  return (
    <div className="rounded-xl p-5 shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Record Payment</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Amount * (balance: {balance.toFixed(2)})</label>
          <input name="amount" type="number" step="0.01" min="0" max={balance} required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Deposit To *</label>
          <select name="bankAccountId" required className={cls} style={sx}>
            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date *</label>
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Method</label>
          <select name="method" defaultValue="Check" className={cls} style={sx}>
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {error && <p className="col-span-5 text-xs text-red-400">{error}</p>}
        <div className="col-span-2 md:col-span-5 flex gap-3 justify-end">
          <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" type="submit" loading={loading}>Record</Button>
        </div>
      </form>
    </div>
  )
}
