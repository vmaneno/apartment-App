import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.propertyId || !data.unitNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const property = await prisma.property.findFirst({
    where: { id: data.propertyId, organizationId: session.organizationId },
  })
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  try {
    const unit = await prisma.unit.create({
      data: {
        propertyId: data.propertyId,
        unitNumber: data.unitNumber,
        beds: data.beds ? parseInt(data.beds, 10) : 0,
        baths: data.baths ? parseFloat(data.baths) : 0,
        sqft: data.sqft ? parseInt(data.sqft, 10) : null,
        marketRent: data.marketRent ? parseFloat(data.marketRent) : null,
      },
    })
    return NextResponse.json(unit, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'That unit number already exists on this property' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
