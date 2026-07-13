'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

type VendorOption = { id: string; name: string }
type PropertyOption = { id: string; name: string }
type GlOption = { id: string; glNumber: string; glName: string }

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function EnterInvoiceForm({ vendors, properties, expenseAccounts }: {
  vendors: VendorOption[]
  properties: PropertyOption[]
  expenseAccounts: GlOption[]
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
    const res = await fetch('/api/ap/vendor-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to enter invoice'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (vendors.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        No vendors yet. <Link href="/admin/setup/vendors" className="underline" style={{ color: 'var(--accent)' }}>Add one in Setup → Vendors</Link> before entering an invoice.
      </p>
    )
  }
  if (properties.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add a property first.</p>
  }
  if (expenseAccounts.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        No Expense GL accounts yet. <Link href="/admin/setup/chart-of-accounts" className="underline" style={{ color: 'var(--accent)' }}>Add one in Setup → Chart of Accounts</Link> before entering an invoice.
      </p>
    )
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Enter Invoice</Button>

  return (
    <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Enter Invoice</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Vendor *</label>
          <select name="vendorId" required className={cls} style={sx}>
            <option value="">— Select —</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Property *</label>
          <select name="propertyId" required className={cls} style={sx}>
            <option value="">— Select —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Expense GL Account *</label>
          <select name="glAccountId" required className={cls} style={sx}>
            <option value="">— Select —</option>
            {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.glNumber} – {a.glName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Amount *</label>
          <input name="amount" type="number" step="0.01" min="0" required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Date *</label>
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Invoice #</label>
          <input name="invoiceNumber" className={cls} style={sx} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
          <input name="description" className={cls} style={sx} />
        </div>
        {error && <p className="md:col-span-4 text-xs text-red-400">{error}</p>}
        <div className="md:col-span-4 flex gap-3 justify-end">
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </div>
  )
}
