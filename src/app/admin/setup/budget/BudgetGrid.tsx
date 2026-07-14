'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

type GlAccount = { id: string; glNumber: string; glName: string; glType: string }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const inputCls = 'w-20 px-1.5 py-1 rounded text-xs border text-right outline-none'
const inputSx = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function BudgetGrid({ propertyId, year, glAccounts, amounts }: {
  propertyId: string
  year: number
  glAccounts: GlAccount[]
  amounts: Record<string, number>
}) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, number>>(amounts)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function setCell(glAccountId: string, month: number, raw: string) {
    const n = raw === '' ? 0 : parseFloat(raw)
    setValues(v => ({ ...v, [`${glAccountId}-${month}`]: Number.isFinite(n) ? n : 0 }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const entries = glAccounts.flatMap(a =>
      MONTHS.map((_, i) => ({ glAccountId: a.id, month: i + 1, amount: values[`${a.id}-${i + 1}`] ?? 0 }))
    )
    const res = await fetch('/api/setup/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, year, entries }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'Failed to save budget'); setSaving(false); return }
    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  const income = glAccounts.filter(a => a.glType === 'Income')
  const expense = glAccounts.filter(a => a.glType === 'Expense')

  function rowTotal(glAccountId: string) {
    return MONTHS.reduce((s, _, i) => s + (values[`${glAccountId}-${i + 1}`] ?? 0), 0)
  }

  function section(label: string, accounts: GlAccount[]) {
    if (accounts.length === 0) return null
    return (
      <div className="rounded-xl overflow-hidden shadow-sm mb-4" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-2" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{label}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="text-[13px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                <th className="px-4 py-2 text-left text-xs font-semibold sticky left-0" style={{ color: 'var(--accent)', backgroundColor: 'var(--sidebar-bg)' }}>Account</th>
                {MONTHS.map(m => <th key={m} className="px-1.5 py-2 text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>{m}</th>)}
                <th className="px-4 py-2 text-xs font-semibold text-right" style={{ color: 'var(--accent)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a, i) => (
                <tr key={a.id} className="border-t" style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}>
                  <td className="px-4 py-1.5 whitespace-nowrap sticky left-0" style={{ color: 'var(--text-primary)', backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg)' }}>
                    {a.glNumber} {a.glName}
                  </td>
                  {MONTHS.map((_, mi) => (
                    <td key={mi} className="px-1 py-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={values[`${a.id}-${mi + 1}`] ?? 0}
                        onChange={e => setCell(a.id, mi + 1, e.target.value)}
                        className={inputCls}
                        style={inputSx}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-1.5 text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(rowTotal(a.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      {glAccounts.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No Income/Expense GL accounts yet — add some under Setup → Chart of Accounts.
        </p>
      ) : (
        <>
          {section('Income', income)}
          {section('Expenses', expense)}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={saving}>Save Budget</Button>
            {saved && <span className="text-xs" style={{ color: '#10a06a' }}>Saved.</span>}
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </>
      )}
    </div>
  )
}
