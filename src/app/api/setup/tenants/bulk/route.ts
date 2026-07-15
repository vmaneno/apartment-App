import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

function field(row: Record<string, string>, name: string): string {
  const key = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase())
  return key ? row[key].trim() : ''
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { rows } = await req.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
  }

  let created = 0
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2
    const row = rows[i] as Record<string, string>
    const name = field(row, 'Name')
    if (!name) {
      errors.push({ row: rowNum, message: 'Missing Name' })
      continue
    }
    const email = field(row, 'Email')
    const phone = field(row, 'Phone')

    try {
      await prisma.tenant.create({
        data: {
          organizationId: session.organizationId,
          name,
          email: email || null,
          phone: phone || null,
        },
      })
      created++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Server error'
      errors.push({ row: rowNum, message: msg })
    }
  }

  return NextResponse.json({ created, errors })
}
