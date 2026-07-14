'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const cls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

const CATEGORIES = ['Lease', 'W9', 'COI', 'Inspection', 'ID', 'Other']

type Option = { id: string; label: string }

type LinkType = '' | 'propertyId' | 'unitId' | 'leaseId' | 'tenantId' | 'vendorId' | 'inspectionId' | 'applicantId'

export function UploadDocumentForm({ properties, units, leases, tenants, vendors, inspections = [], applicants = [], presetLink }: {
  properties: Option[]
  units: Option[]
  leases: Option[]
  tenants: Option[]
  vendors: Option[]
  inspections?: Option[]
  applicants?: Option[]
  presetLink?: { field: LinkType; id: string; label: string }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(!!presetLink)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkType, setLinkType] = useState<LinkType>(presetLink?.field ?? '')
  const [linkId, setLinkId] = useState(presetLink?.id ?? '')

  const linkOptions: Record<Exclude<LinkType, ''>, Option[]> = {
    propertyId: properties,
    unitId: units,
    leaseId: leases,
    tenantId: tenants,
    vendorId: vendors,
    inspectionId: inspections,
    applicantId: applicants,
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formEl = e.currentTarget
    const fd = new FormData(formEl)
    if (linkType && linkId) fd.set(linkType, linkId)
    const res = await fetch('/api/documents', { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to upload'); setLoading(false); return }
    formEl.reset()
    if (!presetLink) { setLinkType(''); setLinkId('') }
    setLoading(false)
    router.refresh()
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Upload Document</Button>

  return (
    <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Upload Document</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>File *</label>
          <input name="file" type="file" required className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Category *</label>
          <select name="category" required defaultValue="Other" className={cls} style={sx}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {presetLink ? (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Attached To</label>
            <p className="text-sm py-2" style={{ color: 'var(--text-primary)' }}>{presetLink.label}</p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Attach To</label>
              <select value={linkType} onChange={e => { setLinkType(e.target.value as LinkType); setLinkId('') }} className={cls} style={sx}>
                <option value="">Nothing (general document)</option>
                <option value="propertyId">Property</option>
                <option value="unitId">Unit</option>
                <option value="leaseId">Lease</option>
                <option value="tenantId">Tenant</option>
                <option value="vendorId">Vendor</option>
                <option value="inspectionId">Inspection</option>
                <option value="applicantId">Applicant</option>
              </select>
            </div>
            {linkType && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>&nbsp;</label>
                <select value={linkId} onChange={e => setLinkId(e.target.value)} className={cls} style={sx}>
                  <option value="">Select…</option>
                  {linkOptions[linkType].map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        {error && <p className="col-span-3 text-xs text-red-400">{error}</p>}
        <div className="col-span-3 flex gap-3 justify-end">
          {!presetLink && <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>}
          <Button type="submit" loading={loading}>Upload</Button>
        </div>
      </form>
    </div>
  )
}
