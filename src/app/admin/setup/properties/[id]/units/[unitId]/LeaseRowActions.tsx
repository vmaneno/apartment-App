'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Lease = {
  id: string
  status: string
  startDate: string | Date
  endDate: string | Date | null
  rentAmount: number
  depositAmount: number
}

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

function toDateInputValue(d: string | Date | null) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

export function LeaseRowActions({ lease }: { lease: Lease }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch(`/api/setup/leases/${lease.id}`, {
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

  return (
    <>
      <button onClick={() => setEditing(true)} title="Edit"
        className="p-1.5 rounded transition-colors"
        style={{ backgroundColor: 'rgba(212,160,23,0.15)', color: '#d4a017', border: '1px solid #d4a017' }}>
        <Pencil size={14} />
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Lease</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              To end this lease, set Status to Ended (and an End Date). Tenants on the lease can&apos;t be changed here — use Tenants → Move to move them to a different unit instead.
            </p>
            <form onSubmit={handleEdit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
                <select name="status" defaultValue={lease.status} className={cls} style={sx}>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Ended">Ended</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Start Date *</label>
                <input name="startDate" type="date" defaultValue={toDateInputValue(lease.startDate)} required className={cls} style={sx} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>End Date</label>
                <input name="endDate" type="date" defaultValue={toDateInputValue(lease.endDate)} className={cls} style={sx} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Rent Amount *</label>
                <input name="rentAmount" type="number" step="0.01" min="0" defaultValue={lease.rentAmount} required className={cls} style={sx} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Deposit Amount</label>
                <input name="depositAmount" type="number" step="0.01" min="0" defaultValue={lease.depositAmount} className={cls} style={sx} />
              </div>
              {error && <p className="col-span-2 text-xs text-red-400">{error}</p>}
              <div className="col-span-2 flex gap-3 justify-end">
                <Button variant="ghost" type="button" onClick={() => { setEditing(false); setError('') }}>Cancel</Button>
                <Button type="submit" loading={loading}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
