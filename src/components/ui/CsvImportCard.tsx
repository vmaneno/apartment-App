'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { parseCsv, rowsToObjects, toCsv } from '@/lib/csv'

type ImportResult = { created: number; errors: { row: number; message: string }[] }

export function CsvImportCard({
  entityLabel,
  templateHeaders,
  templateExampleRow,
  templateFilename,
  uploadUrl,
}: {
  entityLabel: string
  templateHeaders: string[]
  templateExampleRow: (string | number)[]
  templateFilename: string
  uploadUrl: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  function downloadTemplate() {
    const csv = toCsv(templateHeaders, [templateExampleRow])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = templateFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const text = await file.text()
      const rows = rowsToObjects(parseCsv(text))
      if (rows.length === 0) {
        setError('No data rows found in that file.')
        setLoading(false)
        return
      }
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Upload failed')
        setLoading(false)
        return
      }
      setResult(json)
      router.refresh()
    } catch {
      setError('Could not read that file.')
    }
    setLoading(false)
  }

  return (
    <div className="rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3 mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Bulk import {entityLabel}:</span>
      <Button variant="ghost" type="button" onClick={downloadTemplate}>Download CSV Template</Button>
      <Button variant="ghost" type="button" onClick={() => fileInputRef.current?.click()} loading={loading}>Upload CSV</Button>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      {error && <p className="text-xs w-full text-red-400">{error}</p>}
      {result && (
        <p className="text-xs w-full" style={{ color: result.errors.length > 0 ? '#d4a017' : '#10a06a' }}>
          Imported {result.created} {entityLabel.toLowerCase()}.
          {result.errors.length > 0 && ` ${result.errors.length} row(s) skipped — ${result.errors.map(e => `row ${e.row}: ${e.message}`).join('; ')}`}
        </p>
      )}
    </div>
  )
}
