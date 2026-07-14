'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function DocumentRowActions({ id, fileName }: { id: string; fileName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to delete'); setLoading(false); return }
    router.refresh()
    setLoading(false)
    setConfirming(false)
  }

  return (
    <>
      <button onClick={() => setConfirming(true)} title="Delete"
        className="p-1.5 rounded transition-colors"
        style={{ backgroundColor: '#3b0a0a', color: '#ef4444', border: '1px solid #ef4444' }}>
        <Trash2 size={14} />
      </button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-sm shadow-xl text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Document?</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: '#d4a017' }}>{fileName}</span> will be permanently deleted.
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
