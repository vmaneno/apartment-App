'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, ArrowRightLeft, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Tenant = {
  id: string
  name: string
  email: string | null
  phone: string | null
  portalEnabled: boolean
}

type UnitOption = { id: string; label: string }

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function TenantRowActions({ tenant, activeUnitId, units }: {
  tenant: Tenant
  activeUnitId: string | null
  units: UnitOption[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [moving, setMoving] = useState(false)
  const [portalAccess, setPortalAccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [portalSuccess, setPortalSuccess] = useState('')

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch(`/api/setup/tenants/${tenant.id}`, {
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
    const res = await fetch(`/api/setup/tenants/${tenant.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to delete'); setLoading(false); setConfirming(false); return }
    router.refresh()
    setLoading(false)
  }

  async function handleMove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch(`/api/setup/tenants/${tenant.id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to move tenant'); setLoading(false); return }
    setMoving(false)
    router.refresh()
    setLoading(false)
  }

  async function handlePortalAccess(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPortalSuccess('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch(`/api/setup/tenants/${tenant.id}/portal-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to update portal access'); setLoading(false); return }
    setPortalSuccess(json.portalEnabled ? 'Portal password set.' : 'Portal access revoked.')
    router.refresh()
    setLoading(false)
  }

  const targetUnits = units.filter(u => u.id !== activeUnitId)

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => setEditing(true)} title="Edit"
          className="p-1.5 rounded transition-colors"
          style={{ backgroundColor: 'rgba(212,160,23,0.15)', color: '#d4a017', border: '1px solid #d4a017' }}>
          <Pencil size={14} />
        </button>
        {activeUnitId && (
          <button onClick={() => setMoving(true)} title="Move to a different unit"
            className="p-1.5 rounded transition-colors"
            style={{ backgroundColor: 'rgba(74,124,212,0.15)', color: '#4a7cd4', border: '1px solid #4a7cd4' }}>
            <ArrowRightLeft size={14} />
          </button>
        )}
        <button onClick={() => { setPortalAccess(true); setError(''); setPortalSuccess('') }} title="Portal Access"
          className="p-1.5 rounded transition-colors"
          style={{ backgroundColor: tenant.portalEnabled ? 'rgba(16,160,106,0.15)' : 'rgba(148,163,184,0.15)', color: tenant.portalEnabled ? '#10a06a' : 'var(--text-muted)', border: `1px solid ${tenant.portalEnabled ? '#10a06a' : 'var(--text-muted)'}` }}>
          <KeyRound size={14} />
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
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Tenant</h2>
            <form onSubmit={handleEdit} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Name *</label>
                <input name="name" defaultValue={tenant.name} required className={cls} style={sx} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
                <input name="email" defaultValue={tenant.email ?? ''} className={cls} style={sx} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Phone</label>
                <input name="phone" defaultValue={tenant.phone ?? ''} className={cls} style={sx} />
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

      {moving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Move {tenant.name}</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Ends the current active lease and starts a new one on the unit below. This moves everyone on the current lease, not just {tenant.name} — if only one of several co-tenants is moving, do this manually instead (end the old lease, then create a new one for just that person).
            </p>
            <form onSubmit={handleMove} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Move to Unit *</label>
                <select name="targetUnitId" required className={cls} style={sx}>
                  <option value="">— Select unit —</option>
                  {targetUnits.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>New Lease Start Date *</label>
                <input name="startDate" type="date" required className={cls} style={sx} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>New Rent Amount *</label>
                <input name="rentAmount" type="number" step="0.01" min="0" required className={cls} style={sx} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>New Deposit Amount</label>
                <input name="depositAmount" type="number" step="0.01" min="0" className={cls} style={sx} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" type="button" onClick={() => { setMoving(false); setError('') }}>Cancel</Button>
                <Button type="submit" loading={loading}>Move</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {portalAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Portal Access — {tenant.name}</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              {tenant.portalEnabled
                ? 'This tenant can currently sign in to the tenant portal. Set a new password to reset it, or clear the field and save to revoke access.'
                : 'Set a password to let this tenant sign in to the tenant portal with this email address.'}
              {!tenant.email && <span style={{ color: '#d4a017' }}> This tenant has no email on file — add one first, since the portal login is by email.</span>}
            </p>
            <form onSubmit={handlePortalAccess} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                  {tenant.portalEnabled ? 'New Password (leave blank to revoke access)' : 'Password (min. 8 characters)'}
                </label>
                <input name="password" type="password" minLength={8} className={cls} style={sx} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              {portalSuccess && <p className="text-xs" style={{ color: '#10a06a' }}>{portalSuccess}</p>}
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" type="button" onClick={() => { setPortalAccess(false); setError(''); setPortalSuccess('') }}>Close</Button>
                <Button type="submit" loading={loading} disabled={!tenant.email}>Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-sm shadow-xl text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Remove Tenant?</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: '#d4a017' }}>{tenant.name}</span> will be deactivated and hidden from lists — their lease history is kept, not deleted.
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
