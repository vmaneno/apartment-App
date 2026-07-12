'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const fieldCls = 'px-2.5 py-1.5 rounded-lg text-xs border outline-none'
const fieldStyle = { backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function TenantFilters({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [nameInput, setNameInput] = useState(name)
  const [prevName, setPrevName] = useState(name)
  const [emailInput, setEmailInput] = useState(email)
  const [prevEmail, setPrevEmail] = useState(email)

  // Sync local input when the URL's value changes externally (e.g. Clear button, back/forward
  // navigation) — adjusted during render rather than in an effect, per React's guidance for this case.
  if (name !== prevName) { setPrevName(name); setNameInput(name) }
  if (email !== prevEmail) { setPrevEmail(email); setEmailInput(email) }

  function updateParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`${pathname}?${p.toString()}`)
  }

  useEffect(() => {
    if (nameInput === name) return
    const t = setTimeout(() => updateParam('name', nameInput), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameInput])

  useEffect(() => {
    if (emailInput === email) return
    const t = setTimeout(() => updateParam('email', emailInput), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailInput])

  const hasFilters = !!(name || email)

  function clearAll() {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('name'); p.delete('email')
    setNameInput(''); setEmailInput('')
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
        placeholder="Name" title="Name" className={`${fieldCls} w-36`} style={fieldStyle} />
      <input type="text" value={emailInput} onChange={e => setEmailInput(e.target.value)}
        placeholder="Email" title="Email" className={`${fieldCls} w-44`} style={fieldStyle} />
      {hasFilters && (
        <button onClick={clearAll} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>Clear</button>
      )}
    </div>
  )
}
