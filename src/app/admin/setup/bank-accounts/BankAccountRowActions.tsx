'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type GlOption = { id: string; glNumber: string; glName: string }
type BankAccount = { id: string; name: string; type: string; glAccountId: string }

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function BankAccountRowActions({ bankAccount, glAccounts }: { bankAccount: BankAccount; glAccounts: GlOption[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch(`/api/setup/bank-accounts/${bankAccount.id}`, {
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

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/setup/bank-accounts/${bankAccount.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to delete'); setLoading(false); setConfirming(false); return }
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => setEditing(true)} title="Edit"
          className="p-1.5 rounded transition-colors"
          style={{ backgroundColor: 'rgba(212,160,23,0.15)', color: '#d4a017', border: '1px solid #d4a017' }}>
          <Pencil size={14} />
        </button>
        <button onClick={() => setConfirming(true)} title="Delete"
          className="p-1.5 rounded transition-colors"
          style={{ backgroundColor: '#3b0a0a', color: '#ef4444', border: '1px solid #ef4444' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Bank Account</h2>
            <form onSubmit={handleEdit} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Account Name *</label>
                <input name="name" defaultValue={bankAccount.name} required className={cls} style={sx} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
                <select name="type" defaultValue={bankAccount.type} className={cls} style={sx}>
                  <option value="Operating">Operating</option>
                  <option value="SecurityDepositTrust">Security Deposit Trust</option>
                  <option value="Reserve">Reserve</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>GL Account *</label>
                <select name="glAccountId" defaultValue={bankAccount.glAccountId} required className={cls} style={sx}>
                  {glAccounts.map(a => <option key={a.id} value={a.id}>{a.glNumber} – {a.glName}</option>)}
                </select>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" type="button" onClick={() => { setEditing(false); setError('') }}>Cancel</Button>
                <Button type="submit" loading={loading}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-sm shadow-xl text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Remove Bank Account?</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: '#d4a017' }}>{bankAccount.name}</span> will be deactivated and hidden from lists and payment pickers.
            </p>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" type="button" onClick={() => { setConfirming(false); setError('') }}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={loading}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
