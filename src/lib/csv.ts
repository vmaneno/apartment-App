// Minimal RFC4180-ish CSV parsing/generation — no external dependency needed
// for the flat, header-row shape this app's bulk-import templates use.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += char; i++; continue
    }
    if (char === '"') { inQuotes = true; i++; continue }
    if (char === ',') { row.push(field); field = ''; i++; continue }
    if (char === '\r') { i++; continue }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += char; i++
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''))
}

export function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1).map(r => {
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim() })
    return obj
  })
}

export function toCsv(headers: string[], rows: (string | number)[][] = []): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(',')]
  for (const r of rows) lines.push(r.map(escape).join(','))
  return lines.join('\r\n')
}
