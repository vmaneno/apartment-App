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

  const properties = await prisma.property.findMany({
    where: { organizationId: session.organizationId, active: true },
    select: { id: true, name: true },
  })
  const propertyByName = new Map(properties.map(p => [p.name.trim().toLowerCase(), p.id]))

  let created = 0
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2 // account for the header row
    const row = rows[i] as Record<string, string>
    const propertyName = field(row, 'Property Name')
    const unitNumber = field(row, 'Unit Number')

    if (!propertyName || !unitNumber) {
      errors.push({ row: rowNum, message: 'Missing Property Name or Unit Number' })
      continue
    }
    const propertyId = propertyByName.get(propertyName.toLowerCase())
    if (!propertyId) {
      errors.push({ row: rowNum, message: `Property "${propertyName}" not found` })
      continue
    }

    const bedsStr = field(row, 'Beds')
    const bathsStr = field(row, 'Baths')
    const sqftStr = field(row, 'Sqft')
    const marketRentStr = field(row, 'Market Rent')

    try {
      await prisma.unit.create({
        data: {
          propertyId,
          unitNumber,
          beds: bedsStr ? parseInt(bedsStr, 10) : 0,
          baths: bathsStr ? parseFloat(bathsStr) : 0,
          sqft: sqftStr ? parseInt(sqftStr, 10) : null,
          marketRent: marketRentStr ? parseFloat(marketRentStr) : null,
        },
      })
      created++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Server error'
      errors.push({ row: rowNum, message: msg.includes('Unique constraint') ? `Unit "${unitNumber}" already exists on that property` : msg })
    }
  }

  return NextResponse.json({ created, errors })
}
