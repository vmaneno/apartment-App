'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'

type Line = {
  id: string
  date: string | Date
  description: string | null
  debit: number
  credit: number
  cleared: boolean
}

const cls = 'px-3 py-2 rounded-lg text-sm border outline-none'
const sx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function ReconcileTable({ lines }: { lines: Line[] }) {
  const router = useRouter()
  const [cleared, setCleared] = useState<Record<string, boolean>>(
    Object.fromEntries(lines.map(l => [l.id, l.cleared]))
  )
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10))
  const [statementBalance, setStatementBalance] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  async function toggle(id: string) {
    const next = !cleared[id]
    setCleared(prev => ({ ...prev, [id]: next }))
    setPending(id)
    await fetch(`/api/setup/transaction-lines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cleared: next }),
    })
    setPending(null)
    router.refresh()
  }

  const bookBalance = useMemo(() => lines.reduce((s, l) => s + (l.debit - l.credit), 0), [lines])
  const clearedBalance = useMemo(
    () => lines.reduce((s, l) => s + (cleared[l.id] ? (l.debit - l.credit) : 0), 0),
    [lines, cleared]
  )
  const stmt = parseFloat(statementBalance) || 0
  const difference = Math.round((stmt - clearedBalance) * 100) / 100

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Statement Date</label>
          <input type="date" value={statementDate} onChange={e => setStatementDate(e.target.value)} className={cls} style={sx} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Statement Ending Balance</label>
          <input type="number" step="0.01" value={statementBalance} onChange={e => setStatementBalance(e.target.value)} placeholder="0.00" className={cls} style={sx} />
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Cleared Balance</p>
          <p className="text-base font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(clearedBalance)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Difference</p>
          <p className="text-base font-bold mt-1" style={{ color: Math.abs(difference) < 0.005 ? '#10a06a' : '#ef4444' }}>{formatCurrency(difference)}</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--sidebar-bg)' }}>
              <th className="px-4 py-3 text-left" style={{ color: 'var(--accent)' }}>Cleared</th>
              <th className="px-4 py-3 text-xs font-semibold text-left" style={{ color: 'var(--accent)' }}>Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-left" style={{ color: 'var(--accent)' }}>Description</th>
              <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No activity on this account yet.</td></tr>
            ) : lines.map((l, i) => {
              const amount = l.debit - l.credit
              return (
                <tr key={l.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent', borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={!!cleared[l.id]} disabled={pending === l.id} onChange={() => toggle(l.id)} />
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{formatDate(l.date)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{l.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right" style={{ color: amount >= 0 ? 'var(--text-primary)' : '#ef4444' }}>{formatCurrency(amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Book balance (all activity, cleared or not): {formatCurrency(bookBalance)}</p>
    </div>
  )
}
