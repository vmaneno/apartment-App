type Column<T> = {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, emptyMessage = 'No records found.',
}: {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
}) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--sidebar-bg)' }}>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-xs font-semibold tracking-wide ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={{ color: 'var(--accent)' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : data.map((row, i) => (
              <tr
                key={(row.id as string) ?? i}
                className="border-t transition-colors hover:opacity-90"
                style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}
              >
                {columns.map(col => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
